import type { BookSearchResult } from './types';
import { canCreatePublicClient, createPublicClient } from '@/lib/supabase/public';
import { bookSearchDebug } from './debug';

export async function searchCatalogByTitle(query: string, limit = 10): Promise<BookSearchResult[]> {
  if (!canCreatePublicClient()) return [];

  const supabase = createPublicClient();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const escaped = trimmed.replace(/[,%_]/g, '');
  if (!escaped) return [];

  const { data, error } = await supabase
    .from('books')
    .select('title, author, isbn13, cover_url')
    .or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%`)
    .limit(limit);

  if (error || !data) {
    bookSearchDebug('catalog-error', {
      query,
      limit,
      error: error?.message ?? 'no-data',
    });
    return [];
  }

  bookSearchDebug('catalog-success', { query, limit, itemCount: data.length });

  return data
    .filter((row) => Boolean(row.title))
    .map((row) => ({
      title: row.title,
      author: row.author,
      isbn13: row.isbn13,
      coverUrl: row.cover_url,
      description: null,
      publisher: null,
      publishedDate: null,
      pageCount: null,
      sources: ['catalog'],
    }));
}
