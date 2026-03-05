import { requireKidContext } from '@/lib/kids/client';

type KidMessageRow = {
  id: string;
  record_id: string;
  body: string;
  created_at: string;
  book_title: string | null;
  unread: boolean;
  reactions: Record<string, number> | null;
};

export async function getKidMessages() {
  const { supabase, childId } = await requireKidContext();

  const { data } = await supabase.rpc('get_kid_messages', {
    target_child_id: childId,
    max_rows: 50
  });

  const messages = ((data ?? []) as KidMessageRow[]).map((row) => ({
    id: row.id,
    record_id: row.record_id,
    body: row.body,
    created_at: row.created_at,
    bookTitle: row.book_title ?? '本',
    unread: row.unread,
    reactions: row.reactions ?? {}
  }));

  const unreadCount = messages.filter((m) => m.unread).length;
  return { messages, unreadCount };
}
