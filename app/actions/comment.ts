'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createCommentSchema } from '@/lib/validations/comment';
import type { ActionResult } from '@/lib/actions/types';

export type CommentActionResult = ActionResult;

const updateCommentSchema = z.object({
  commentId: z.string().uuid('コメントの指定が不正です'),
  body: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(500, '500文字以内で入力してください')
});

const deleteCommentSchema = z.object({
  commentId: z.string().uuid('コメントの指定が不正です')
});

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

export async function updateComment(
  _prev: CommentActionResult,
  formData: FormData
): Promise<CommentActionResult> {
  const raw = {
    commentId: formData.get('commentId') ?? '',
    body: formData.get('body') ?? ''
  };

  const parsed = updateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { commentId, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: comment } = await supabase
    .from('record_comments')
    .select('id, record_id, author_user_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { error: 'コメントが見つかりません。' };
  }

  if (comment.author_user_id !== user.id) {
    return { error: '自分のコメントのみ編集できます。' };
  }

  const { error } = await supabase
    .from('record_comments')
    .update({ body })
    .eq('id', commentId);

  if (error) {
    return { error: 'コメントの更新に失敗しました。' };
  }

  revalidatePath(`/records/${comment.record_id}`);
  return {};
}

export async function deleteComment(
  _prev: CommentActionResult,
  formData: FormData
): Promise<CommentActionResult> {
  const raw = {
    commentId: formData.get('commentId') ?? ''
  };

  const parsed = deleteCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { commentId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: comment } = await supabase
    .from('record_comments')
    .select('id, record_id, author_user_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { error: 'コメントが見つかりません。' };
  }

  if (comment.author_user_id !== user.id) {
    return { error: '自分のコメントのみ削除できます。' };
  }

  const { error } = await supabase
    .from('record_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { error: 'コメントの削除に失敗しました。' };
  }

  revalidatePath(`/records/${comment.record_id}`);
  return {};
}
