import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchByIsbn, searchByTitle } from '@/lib/books/google-books';
import { openBdLookup } from '@/lib/books/openbd';
import { ndlSearchByTitle } from '@/lib/books/ndl';

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
    // Try Google Books first, fall back to NDL if empty/error (rate limit)
    const results = await searchByTitle(q.trim());
    if (results.length > 0) {
      return NextResponse.json({ results });
    }
    const ndlResults = await ndlSearchByTitle(q.trim());
    return NextResponse.json({ results: ndlResults });
  }

  return NextResponse.json({ error: 'isbn or q parameter required' }, { status: 400 });
}
