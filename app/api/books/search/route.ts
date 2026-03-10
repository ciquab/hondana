import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchByIsbn, searchByTitle } from '@/lib/books/google-books';
import { openBdLookup } from '@/lib/books/openbd';
import { ndlSearchByTitle } from '@/lib/books/ndl';
import { buildTitleQueryVariants } from '@/lib/books/search-query';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { getKidSession } from '@/lib/kids/session';
import { searchCatalogByTitle } from '@/lib/books/catalog';
import { bookSearchDebug } from '@/lib/books/debug';
import type { BookResultSource } from '@/lib/books/types';

// 1分間に最大30リクエスト（ユーザーごと）
const RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

export const dynamic = 'force-dynamic';

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\s　・:：\-‐‑‒–—―ｰ]/g, '')
    .toLowerCase();
}

function mergePreferIsbn(
  primary: Awaited<ReturnType<typeof searchByTitle>>,
  secondary: Awaited<ReturnType<typeof searchByTitle>>
) {
  const secondaryByTitleAuthor = new Map<string, (typeof secondary)[number]>();
  const secondaryByTitle = new Map<string, (typeof secondary)[number]>();

  for (const item of secondary) {
    if (!item.isbn13) continue;

    const titleKey = normalizeText(item.title);
    if (!titleKey) continue;

    const titleAuthorKey = `${titleKey}:${normalizeText(item.author)}`;
    if (!secondaryByTitleAuthor.has(titleAuthorKey)) {
      secondaryByTitleAuthor.set(titleAuthorKey, item);
    }

    // Keep first match by title. This widens matching for cases where one side lacks author metadata.
    if (!secondaryByTitle.has(titleKey)) {
      secondaryByTitle.set(titleKey, item);
    }
  }

  return primary.map((item) => {
    if (item.isbn13) return item;

    const titleKey = normalizeText(item.title);
    const titleAuthorKey = `${titleKey}:${normalizeText(item.author)}`;

    const candidate = secondaryByTitleAuthor.get(titleAuthorKey) ?? secondaryByTitle.get(titleKey);
    if (!candidate?.isbn13) return item;

    const mergedSources = Array.from(new Set<BookResultSource>([...item.sources, ...candidate.sources]));

    return {
      ...item,
      isbn13: candidate.isbn13,
      coverUrl: item.coverUrl ?? candidate.coverUrl,
      sources: mergedSources,
    };
  });
}

function dedupeResults(items: Awaited<ReturnType<typeof searchByTitle>>) {
  const merged: Awaited<ReturnType<typeof searchByTitle>> = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const key = `${item.isbn13 ?? ''}:${normalizeText(item.title)}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      author: existing.author ?? item.author,
      isbn13: existing.isbn13 ?? item.isbn13,
      coverUrl: existing.coverUrl ?? item.coverUrl,
      description: existing.description ?? item.description,
      publisher: existing.publisher ?? item.publisher,
      publishedDate: existing.publishedDate ?? item.publishedDate,
      pageCount: existing.pageCount ?? item.pageCount,
      sources: Array.from(new Set<BookResultSource>([...existing.sources, ...item.sources])),
    };
  }

  return merged;
}

export async function GET(request: NextRequest) {
  // Auth check: allow either signed-in parent user or active kid session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const kidSession = user ? null : await getKidSession();
  const requesterId = user?.id ?? kidSession?.childId;

  bookSearchDebug('auth', {
    hasUser: Boolean(user),
    hasKidSession: Boolean(kidSession),
    requesterId,
  });
  if (!requesterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`books-search:${requesterId}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const { searchParams } = request.nextUrl;
  const isbn = searchParams.get('isbn');
  const q = searchParams.get('q');

  if (isbn) {
    // Try OpenBD first (free, no key, good for Japanese books), then Google Books
    const openBdResult = await openBdLookup(isbn);
    const result = openBdResult ?? (await searchByIsbn(isbn));
    bookSearchDebug('isbn', {
      requesterId,
      isbn,
      resultCount: result ? 1 : 0,
      source: result?.sources.join('+') ?? 'none',
    });
    return NextResponse.json({ results: result ? [result] : [] });
  }

  if (q && q.trim().length > 0) {
    const variants = buildTitleQueryVariants(q);
    bookSearchDebug('query', { requesterId, q, variants });

    // Google Books first (rich metadata, cover images). Cached, so 429 risk is low.
    const googleMerged: Awaited<ReturnType<typeof searchByTitle>> = [];
    for (const queryVariant of variants) {
      const googleResults = await searchByTitle(queryVariant);
      googleMerged.push(...googleResults);
    }
    const googleUnique = dedupeResults(googleMerged).slice(0, 10);

    const ndlMerged: Awaited<ReturnType<typeof searchByTitle>> = [];
    for (const queryVariant of variants) {
      const ndlResults = await ndlSearchByTitle(queryVariant);
      ndlMerged.push(...ndlResults);
    }
    const ndlUnique = dedupeResults(ndlMerged).slice(0, 10);

    bookSearchDebug('provider-counts', {
      requesterId,
      googleCount: googleUnique.length,
      ndlCount: ndlUnique.length,
    });

    if (googleUnique.length > 0) {
      const merged = mergePreferIsbn(googleUnique, ndlUnique);
      bookSearchDebug('response', { requesterId, source: 'google+ndl-merge', resultCount: merged.length });
      return NextResponse.json({ results: merged });
    }

    if (ndlUnique.length > 0) {
      bookSearchDebug('response', { requesterId, source: 'ndl', resultCount: ndlUnique.length });
      return NextResponse.json({ results: ndlUnique });
    }

    // Final fallback: return books already known in our own catalog.
    const catalogMerged: Awaited<ReturnType<typeof searchByTitle>> = [];
    for (const queryVariant of variants) {
      const catalogResults = await searchCatalogByTitle(queryVariant);
      catalogMerged.push(...catalogResults);
    }

    const catalogUnique = dedupeResults(catalogMerged).slice(0, 10);
    bookSearchDebug('response', { requesterId, source: 'catalog', resultCount: catalogUnique.length });
    return NextResponse.json({ results: catalogUnique });
  }

  return NextResponse.json({ error: 'isbn or q parameter required' }, { status: 400 });
}
