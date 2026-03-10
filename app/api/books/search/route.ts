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
import type { BookResultSource, BookSearchResult } from '@/lib/books/types';

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

async function enrichNdlWithOpenBd(items: BookSearchResult[]): Promise<BookSearchResult[]> {
  const limited = items.slice(0, 10);
  const enriched = await Promise.all(
    limited.map(async (item) => {
      if (!item.sources.includes('ndl') || !item.isbn13) return item;

      const openbd = await openBdLookup(item.isbn13);
      if (!openbd) return item;

      return {
        ...item,
        author: item.author ?? openbd.author,
        coverUrl: openbd.coverUrl ?? item.coverUrl,
        description: item.description ?? openbd.description,
        publisher: item.publisher ?? openbd.publisher,
        publishedDate: item.publishedDate ?? openbd.publishedDate,
        pageCount: item.pageCount ?? openbd.pageCount,
        sources: Array.from(new Set<BookResultSource>([...item.sources, ...openbd.sources])),
      };
    })
  );

  return enriched;
}

function rerankNdlFallback(items: BookSearchResult[], queries: string[]): BookSearchResult[] {
  if (items.length <= 1) return items;

  const queryHasJapanese = queries.some(containsJapaneseText);
  const normalizedQueries = queries.map(normalizeText).filter((q) => q.length >= 2);
  const tokenFreq = buildAsciiTokenFrequency(items);

  const scored = items.map((item, index) => {
    const direct = scoreDirectRelevance(item, normalizedQueries);
    const language = scoreLanguageMatch(item, queryHasJapanese);
    const consensus = scoreConsensus(item, tokenFreq);
    return { item, direct, language, consensus, index };
  });

  const hasDirect = scored.some((x) => x.direct > 0);

  return scored
    .sort((a, b) => {
      if (hasDirect && b.direct !== a.direct) return b.direct - a.direct;
      if (b.language !== a.language) return b.language - a.language;
      if (b.consensus !== a.consensus) return b.consensus - a.consensus;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

function scoreLanguageMatch(item: BookSearchResult, queryHasJapanese: boolean): number {
  if (!queryHasJapanese) return 0;

  const title = item.title ?? '';
  const hasJapanese = containsJapaneseText(title);
  const hasLatin = /[a-zA-Z]/.test(title);

  if (hasJapanese) return 200;
  if (hasLatin) return -200;
  return 0;
}

function containsJapaneseText(value: string | null | undefined): boolean {
  return /[ぁ-ゖァ-ヶ一-龠々ー]/.test(value ?? '');
}

function scoreDirectRelevance(item: BookSearchResult, normalizedQueries: string[]): number {
  const title = normalizeText(item.title);
  const author = normalizeText(item.author);

  let best = 0;
  for (const q of normalizedQueries) {
    if (!q) continue;
    if (title === q) best = Math.max(best, 1000);
    else if (title.startsWith(q)) best = Math.max(best, 700);
    else if (title.includes(q)) best = Math.max(best, 500);
    else if (author.includes(q)) best = Math.max(best, 300);
  }
  return best;
}

function buildAsciiTokenFrequency(items: BookSearchResult[]): Map<string, number> {
  const freq = new Map<string, number>();

  for (const item of items) {
    const seen = new Set<string>();
    for (const token of extractAsciiTokens(item.title)) {
      if (token.length < 3 || seen.has(token)) continue;
      seen.add(token);
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }

  return freq;
}

function scoreConsensus(item: BookSearchResult, tokenFreq: Map<string, number>): number {
  let score = 0;
  for (const token of extractAsciiTokens(item.title)) {
    const count = tokenFreq.get(token) ?? 0;
    if (count > 1) score += count;
  }
  return score;
}

function extractAsciiTokens(value: string | null | undefined): string[] {
  const matches = (value ?? '').toLowerCase().match(/[a-z0-9]+/g);
  return matches ?? [];
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
      const ndlResults = await ndlSearchByTitle(queryVariant, 30);
      ndlMerged.push(...ndlResults);
    }
    const ndlReranked = rerankNdlFallback(dedupeResults(ndlMerged).slice(0, 40), variants);
    const ndlUnique = await enrichNdlWithOpenBd(ndlReranked.slice(0, 10));

    bookSearchDebug('provider-counts', {
      requesterId,
      googleCount: googleUnique.length,
      ndlCount: ndlUnique.length,
      ndlCandidateCount: ndlReranked.length,
      ndlTopTitles: ndlUnique.slice(0, 3).map((x) => x.title),
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
