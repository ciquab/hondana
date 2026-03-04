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

    const seen = new Set<string>();
    const pushUnique = (
      items: Awaited<ReturnType<typeof searchByTitle>>,
      target: Awaited<ReturnType<typeof searchByTitle>>
    ) => {
      for (const item of items) {
        const key = `${item.isbn13 ?? ''}:${item.title}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        target.push(item);
      }
    };

    // Keep NDL-first behavior: if NDL finds results, return them without calling Google.
    const ndlMerged: Awaited<ReturnType<typeof searchByTitle>> = [];
    for (const queryVariant of variants) {
      const ndlResults = await ndlSearchByTitle(queryVariant);
      pushUnique(ndlResults, ndlMerged);
      if (ndlMerged.length >= 10) {
        return NextResponse.json({ results: ndlMerged.slice(0, 10) });
      }
    }
    if (ndlMerged.length > 0) {
      return NextResponse.json({ results: ndlMerged });
    }

    // Fallback to Google Books only when NDL returns nothing.
    const googleMerged: Awaited<ReturnType<typeof searchByTitle>> = [];
    for (const queryVariant of variants) {
      const googleResults = await searchByTitle(queryVariant);
      pushUnique(googleResults, googleMerged);
      if (googleMerged.length >= 10) {
        return NextResponse.json({ results: googleMerged.slice(0, 10) });
      }
    }

    return NextResponse.json({ results: googleMerged });
  }

  return NextResponse.json({ error: 'isbn or q parameter required' }, { status: 400 });
}
