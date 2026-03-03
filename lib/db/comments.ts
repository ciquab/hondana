import { createClient } from '@/lib/supabase/server';

export async function getCommentsForRecord(recordId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('record_comments')
    .select('id, author_user_id, body, created_at')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });

  return data ?? [];
}
