'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKidSessionChildId } from '@/lib/kids/session';
import { evaluateChildBadges } from '@/lib/kids/badges';
import { CHILD_FEELINGS, CHILD_STAMPS } from '@/lib/kids/feelings';

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
  const selectedTags = formData
    .getAll('feelingTags')
    .map((v) => String(v))
    .filter((v): v is (typeof CHILD_FEELINGS)[number] =>
      CHILD_FEELINGS.includes(v as (typeof CHILD_FEELINGS)[number])
    );

  if (!title) return { error: '本のタイトルを入力してください。' };
  if (isbn && !/^\d{13}$/.test(isbn)) return { error: 'ISBNは13桁の数字で入力してください。' };
  if (!CHILD_STAMPS.includes(stamp as (typeof CHILD_STAMPS)[number])) return { error: 'スタンプを選択してください。' };

  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from('children')
    .select('family_id, families(created_by)')
    .eq('id', childId)
    .maybeSingle();

  if (!child?.family_id) return { error: '子ども情報の取得に失敗しました。' };

  const family = Array.isArray(child.families) ? child.families[0] : child.families;
  const creatorId = family?.created_by;
  if (!creatorId) return { error: '記録作成に必要な保護者情報が見つかりません。' };

  let bookId: string;
  if (isbn) {
    const { data: existing } = await supabase.from('books').select('id').eq('isbn13', isbn).maybeSingle();
    if (existing) {
      bookId = existing.id;
    } else {
      const { data: newBook, error: bookErr } = await supabase
        .from('books')
        .insert({ title, author: author || null, isbn13: isbn, cover_url: coverUrl || null })
        .select('id')
        .single();
      if (bookErr || !newBook) return { error: '本の登録に失敗しました。' };
      bookId = newBook.id;
    }
  } else {
    const { data: newBook, error: bookErr } = await supabase
      .from('books')
      .insert({ title, author: author || null, cover_url: coverUrl || null })
      .select('id')
      .single();
    if (bookErr || !newBook) return { error: '本の登録に失敗しました。' };
    bookId = newBook.id;
  }

  const { data: newRecord, error: recordErr } = await supabase
    .from('reading_records')
    .insert({
      family_id: child.family_id,
      child_id: childId,
      book_id: bookId,
      status,
      created_by: creatorId
    })
    .select('id')
    .single();
  if (recordErr || !newRecord) return { error: '読書記録の作成に失敗しました。' };

  const { error: stampErr } = await supabase
    .from('record_reactions_child')
    .insert({ record_id: newRecord.id, child_id: childId, stamp });
  if (stampErr) return { error: 'スタンプ保存に失敗しました。' };

  if (selectedTags.length > 0) {
    const { error: tagsErr } = await supabase.from('record_feeling_tags').insert(
      selectedTags.map((tag) => ({ record_id: newRecord.id, child_id: childId, tag }))
    );
    if (tagsErr) return { error: '気持ちタグ保存に失敗しました。' };
  }

  await evaluateChildBadges(childId, newRecord.id);

  revalidatePath('/kids/home');
  revalidatePath('/kids/calendar');
  redirect('/kids/home');
}
