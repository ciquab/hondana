'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKidSessionChildId } from '@/lib/kids/session';

export async function markKidMessageRead(formData: FormData): Promise<void> {
  const commentId = String(formData.get('commentId') ?? '').trim();
  if (!commentId) return;

  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: allowed } = await supabase.rpc('is_child_in_my_family', {
    target_child_id: childId
  });

  if (!allowed) return;

  await supabase.from('child_message_views').upsert(
    {
      child_id: childId,
      comment_id: commentId,
      viewed_at: new Date().toISOString()
    },
    { onConflict: 'child_id,comment_id' }
  );

  revalidatePath('/kids/messages');
  revalidatePath('/kids/home');
}
