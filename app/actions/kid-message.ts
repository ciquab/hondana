'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKidSessionChildId } from '@/lib/kids/session';

export async function markKidMessageRead(formData: FormData): Promise<void> {
  const commentId = String(formData.get('commentId') ?? '').trim();
  if (!commentId) return;

  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = createAdminClient();

  const { data: marked } = await supabase.rpc('mark_kid_message_read', {
    target_child_id: childId,
    target_comment_id: commentId
  });

  if (!marked) return;

  revalidatePath('/kids/messages');
  revalidatePath('/kids/home');
}
