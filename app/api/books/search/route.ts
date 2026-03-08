import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchByIsbn, searchByTitle } from '@/lib/books/google-books';
import { openBdLookup } from '@/lib/books/openbd';
import { ndlSearchByTitle } from '@/lib/books/ndl';
import { buildTitleQueryVariants } from '@/lib/books/search-query';
import { checkRateLimit } from '@/lib/utils/rate-limit';

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

    return {
      ...item,
      isbn13: candidate.isbn13,
      coverUrl: item.coverUrl ?? candidate.coverUrl,
    };
  });
}

function dedupeResults(items: Awaited<ReturnType<typeof searchByTitle>>) {
  const merged: Awaited<ReturnType<typeof searchByTitle>> = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.isbn13 ?? ''}:${normalizeText(item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`books-search:${user.id}`, RATE_LIMIT);
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
    const result = (await openBdLookup(isbn)) ?? (await searchByIsbn(isbn));
    return NextResponse.json({ results: result ? [result] : [] });
  }

  if (q && q.trim().length > 0) {
    const variants = buildTitleQueryVariants(q);

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

    if (googleUnique.length > 0) {
      return NextResponse.json({ results: mergePreferIsbn(googleUnique, ndlUnique) });
    }

    // Fallback to NDL when Google Books returns nothing.
    return NextResponse.json({ results: ndlUnique });
  }

  return NextResponse.json({ error: 'isbn or q parameter required' }, { status: 400 });
}
