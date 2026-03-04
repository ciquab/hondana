import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchByIsbn, searchByTitle } from '@/lib/books/google-books';
import { openBdLookup } from '@/lib/books/openbd';
import { ndlSearchByTitle } from '@/lib/books/ndl';
import { buildTitleQueryVariants } from '@/lib/books/search-query';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const normalizeText = (value: string | null | undefined) =>
      (value ?? '').replace(/\s+/g, '').toLowerCase();

    const mergePreferIsbn = (
      primary: Awaited<ReturnType<typeof searchByTitle>>,
      secondary: Awaited<ReturnType<typeof searchByTitle>>
    ) => {
      const secondaryByText = new Map<string, (typeof secondary)[number]>();
      for (const item of secondary) {
        const key = `${normalizeText(item.title)}:${normalizeText(item.author)}`;
        if (!secondaryByText.has(key)) {
          secondaryByText.set(key, item);
        }
      }

      return primary.map((item) => {
        if (item.isbn13) return item;
        const key = `${normalizeText(item.title)}:${normalizeText(item.author)}`;
        const candidate = secondaryByText.get(key);
        if (!candidate?.isbn13) return item;

        return {
          ...item,
          isbn13: candidate.isbn13,
          coverUrl: item.coverUrl ?? candidate.coverUrl,
        };
      });
    };

    const dedupeResults = (items: Awaited<ReturnType<typeof searchByTitle>>) => {
      const merged: Awaited<ReturnType<typeof searchByTitle>> = [];
      const seen = new Set<string>();

      for (const item of items) {
        const key = `${item.isbn13 ?? ''}:${item.title}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }

      return merged;
    };

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
