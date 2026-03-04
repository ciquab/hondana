import { createAdminClient } from '@/lib/supabase/admin';

type CommentRow = {
  id: string;
  record_id: string;
  body: string;
  created_at: string;
};

export async function getKidMessages(childId: string) {
  const supabase = createAdminClient();

  const { data: records } = await supabase
    .from('reading_records')
    .select('id, books(title)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(50);

  const recordIds = (records ?? []).map((row) => row.id);
  if (recordIds.length === 0) {
    return { messages: [], unreadCount: 0 };
  }

  const [{ data: comments }, { data: views }, { data: reactions }] = await Promise.all([
    supabase
      .from('record_comments')
      .select('id, record_id, body, created_at')
      .in('record_id', recordIds)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('child_message_views').select('comment_id').eq('child_id', childId),
    supabase.from('record_reactions').select('record_id, emoji').in('record_id', recordIds)
  ]);

  const viewed = new Set((views ?? []).map((v) => v.comment_id));

  const reactionMap = new Map<string, Record<string, number>>();
  for (const reaction of reactions ?? []) {
    const row = reactionMap.get(reaction.record_id) ?? {};
    row[reaction.emoji] = (row[reaction.emoji] ?? 0) + 1;
    reactionMap.set(reaction.record_id, row);
  }

  const bookTitleMap = new Map<string, string>();
  for (const record of records ?? []) {
    const book = record.books as { title?: string } | { title?: string }[] | null;
    const title = Array.isArray(book) ? (book[0]?.title ?? '本') : (book?.title ?? '本');
    bookTitleMap.set(record.id, title);
  }

  const messages = (comments ?? []).map((comment: CommentRow) => ({
    ...comment,
    unread: !viewed.has(comment.id),
    bookTitle: bookTitleMap.get(comment.record_id) ?? '本',
    reactions: reactionMap.get(comment.record_id) ?? {}
  }));

  const unreadCount = messages.filter((m) => m.unread).length;
  return { messages, unreadCount };
}
