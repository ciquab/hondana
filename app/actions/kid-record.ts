'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { evaluateChildBadges } from '@/lib/kids/badges';
import { CHILD_FEELINGS, CHILD_GENRES, CHILD_STAMPS } from '@/lib/kids/feelings';

const KID_RECORD_STATUSES = ['want_to_read', 'reading', 'finished'] as const;

export type KidRecordActionResult = {
  error?: string;
};

export async function createKidRecord(
  _prev: KidRecordActionResult,
  formData: FormData
): Promise<KidRecordActionResult> {
  const title = String(formData.get('title') ?? '').trim();
  const author = String(formData.get('author') ?? '').trim();
  const status = String(formData.get('status') ?? 'finished').trim();
  const stamp = String(formData.get('stamp') ?? '').trim();
  const isbn = String(formData.get('isbn') ?? '').trim();
  const coverUrl = String(formData.get('coverUrl') ?? '').trim();
  const memo = String(formData.get('memo') ?? '').trim();
  const finishedOn = String(formData.get('finishedOn') ?? '').trim();
  const genreRaw = String(formData.get('genre') ?? '').trim();
  const genre = CHILD_GENRES.includes(genreRaw as (typeof CHILD_GENRES)[number])
    ? (genreRaw as (typeof CHILD_GENRES)[number])
    : null;
  const selectedTags = formData
    .getAll('feelingTags')
    .map((v) => String(v))
    .filter((v): v is (typeof CHILD_FEELINGS)[number] =>
      CHILD_FEELINGS.includes(v as (typeof CHILD_FEELINGS)[number])
    );

  if (!title) return { error: '本のタイトルを入力してください。' };
  if (isbn && !/^\d{13}$/.test(isbn)) return { error: 'ISBNは13桁の数字で入力してください。' };
  if (!CHILD_STAMPS.includes(stamp as (typeof CHILD_STAMPS)[number])) return { error: 'スタンプを選択してください。' };
  if (!KID_RECORD_STATUSES.includes(status as (typeof KID_RECORD_STATUSES)[number])) {
    return { error: '記録ステータスが不正です。' };
  }
  if (finishedOn && !/^\d{4}-\d{2}-\d{2}$/.test(finishedOn)) {
    return { error: '読んだ日の形式が正しくありません。' };
  }

  const { childId, supabase } = await requireKidContext();

  const { data: recordId } = await supabase.rpc('create_kid_reading_record', {
    target_child_id: childId,
    target_title: title,
    target_author: author || null,
    target_isbn13: isbn || null,
    target_cover_url: coverUrl || null,
    target_status: status,
    target_stamp: stamp,
    target_feeling_tags: selectedTags,
    target_memo: memo || null,
    target_finished_on: finishedOn || null,
    target_genre: genre,
  });

  if (!recordId) return { error: '読書記録の作成に失敗しました。' };

  await evaluateChildBadges(recordId);

  revalidatePath('/kids/home');
  revalidatePath('/kids/calendar');
  redirect('/kids/home');
}
