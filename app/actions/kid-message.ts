'use server';

import { revalidatePath } from 'next/cache';
import { getKidContext } from '@/lib/kids/context';
import { createServiceClient } from '@/lib/supabase/service';

export async function markKidMessageRead(formData: FormData): Promise<void> {
  const commentId = String(formData.get('commentId') ?? '').trim();
  if (!commentId) return;

  const { childId } = await getKidContext();
  const supabase = createServiceClient();

  // コメントが自分の記録に属するものか確認
  const { data: comment } = await supabase
    .from('record_comments')
    .select('record_id')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment?.record_id) return;

  const { data: targetRecord } = await supabase
    .from('reading_records')
    .select('id')
    .eq('id', comment.record_id)
    .eq('child_id', childId)
    .maybeSingle();
  if (!targetRecord) return;

  await supabase.from('child_message_views').upsert(
    { child_id: childId, comment_id: commentId, viewed_at: new Date().toISOString() },
    { onConflict: 'child_id,comment_id' }
  );

  revalidatePath('/kids/messages');
  revalidatePath('/kids/home');
}
