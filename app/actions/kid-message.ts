'use server';

import { revalidatePath } from 'next/cache';
import { requireKidContext } from '@/lib/kids/client';

export async function markKidMessageRead(formData: FormData): Promise<void> {
  const commentId = String(formData.get('commentId') ?? '').trim();
  if (!commentId) return;

  const { childId, supabase } = await requireKidContext();

  const { data: marked } = await supabase.rpc('mark_kid_message_read', {
    target_child_id: childId,
    target_comment_id: commentId
  });

  if (!marked) return;

  revalidatePath('/kids/messages');
  revalidatePath('/kids/home');
}
