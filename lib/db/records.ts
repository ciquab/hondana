import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/db/family';

export async function getRecordsForChild(childId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data } = await supabase
    .from('reading_records')
    .select('id, status, memo, finished_on, genre, created_at, updated_at, books(id, title, author, isbn13, cover_url)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getRecordDetail(recordId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data } = await supabase
    .from('reading_records')
    .select('id, family_id, child_id, status, memo, finished_on, created_by, created_at, updated_at, books(id, title, author, isbn13, cover_url), children(id, display_name)')
    .eq('id', recordId)
    .single();

  return data ?? null;
}

export async function getRecordCountsForChildren(childIds: string[]) {
  if (childIds.length === 0) return {};

  const supabase = await createClient();

  const { data } = await supabase
    .from('reading_records')
    .select('child_id')
    .in('child_id', childIds);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.child_id] = (counts[row.child_id] ?? 0) + 1;
  }
  return counts;
}

export async function getGenreBreakdownForChild(childId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return {};

  const { data } = await supabase
    .from('reading_records')
    .select('genre')
    .eq('child_id', childId)
    .not('genre', 'is', null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.genre) {
      counts[row.genre] = (counts[row.genre] ?? 0) + 1;
    }
  }
  return counts;
}

export async function findBookByIsbn(isbn: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('books')
    .select('id, title, author, isbn13')
    .eq('isbn13', isbn)
    .single();

  return data ?? null;
}
