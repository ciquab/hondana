'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCommentSchema } from '@/lib/validations/comment';

export type CommentActionResult = {
  error?: string;
};

export async function createComment(
  _prev: CommentActionResult,
  formData: FormData
): Promise<CommentActionResult> {
  const raw = {
    recordId: formData.get('recordId') ?? '',
    body: formData.get('body') ?? ''
  };

  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { recordId, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch record to get family_id (RLS ensures family access)
  const { data: record } = await supabase
    .from('reading_records')
    .select('id, family_id')
    .eq('id', recordId)
    .single();

  if (!record) {
    return { error: '記録が見つかりません。' };
  }

  const { error } = await supabase.from('record_comments').insert({
    record_id: recordId,
    family_id: record.family_id,
    author_user_id: user.id,
    body
  });

  if (error) {
    return { error: 'コメントの投稿に失敗しました。' };
  }

  revalidatePath(`/records/${recordId}`);
  return {};
}
