'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { evaluateChildBadges } from '@/lib/kids/badges';
import { CHILD_GENRES } from '@/lib/kids/feelings';
import { createKidRecordSchema } from '@/lib/validations/kid-record';
import type { ActionResult } from '@/lib/actions/types';

export type KidRecordActionResult = ActionResult;

export async function createKidRecord(
  _prev: KidRecordActionResult,
  formData: FormData
): Promise<KidRecordActionResult> {
  const raw = {
    title: String(formData.get('title') ?? '').trim(),
    author: String(formData.get('author') ?? '').trim(),
    isbn: String(formData.get('isbn') ?? '').trim(),
    coverUrl: String(formData.get('coverUrl') ?? '').trim(),
    status: String(formData.get('status') ?? 'finished').trim(),
    stamp: String(formData.get('stamp') ?? '').trim(),
    memo: String(formData.get('memo') ?? '').trim(),
    finishedOn: String(formData.get('finishedOn') ?? '').trim(),
    genre: String(formData.get('genre') ?? '').trim(),
    feelingTags: formData.getAll('feelingTags').map((v) => String(v)),
  };

  const parsed = createKidRecordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, author, isbn, coverUrl, status, stamp, memo, finishedOn, genre, feelingTags } =
    parsed.data;

  const resolvedGenre = genre && CHILD_GENRES.includes(genre as (typeof CHILD_GENRES)[number])
    ? (genre as (typeof CHILD_GENRES)[number])
    : null;

  const { childId, supabase } = await requireKidContext();

  const { data: recordId } = await supabase.rpc('create_kid_reading_record', {
    target_child_id: childId,
    target_title: title,
    target_author: author || null,
    target_isbn13: isbn || null,
    target_cover_url: coverUrl || null,
    target_status: status,
    target_stamp: stamp,
    target_feeling_tags: feelingTags,
    target_memo: memo || null,
    target_finished_on: finishedOn || null,
    target_genre: resolvedGenre,
  });

  if (!recordId) return { error: '読書記録の作成に失敗しました。' };

  // バッジ評価前のバッジ一覧を取得
  const { data: badgesBefore } = await supabase.rpc('get_kid_badges', { target_child_id: childId });
  const badgeIdsBefore = new Set(
    (badgesBefore ?? []).map((b: { badge_id: string }) => b.badge_id)
  );

  await evaluateChildBadges(recordId);

  // 新規獲得バッジを検出
  const { data: badgesAfter } = await supabase.rpc('get_kid_badges', { target_child_id: childId });
  const newBadge = (badgesAfter ?? []).find(
    (b: { badge_id: string }) => !badgeIdsBefore.has(b.badge_id)
  );

  revalidatePath('/kids/home');
  revalidatePath('/kids/calendar');
  redirect(newBadge ? `/kids/home?badge=${newBadge.badge_id}` : '/kids/home');
}
