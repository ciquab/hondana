'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createRecordSchema, updateRecordSchema } from '@/lib/validations/record';

export type ActionResult = {
  error?: string;
};

export async function createRecord(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const coverUrl = (formData.get('coverUrl') as string) || null;

  const raw = {
    childId: formData.get('childId') ?? '',
    title: formData.get('title') ?? '',
    author: formData.get('author') ?? '',
    isbn: formData.get('isbn') ?? '',
    status: formData.get('status') ?? '',
    memo: formData.get('memo') ?? '',
    finishedOn: formData.get('finishedOn') ?? ''
  };

  const parsed = createRecordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { childId, title, author, isbn, status, memo, finishedOn } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // IDOR check: verify child belongs to user's family
  const { data: allowed } = await supabase.rpc('is_child_in_my_family', {
    target_child_id: childId
  });

  if (!allowed) {
    return { error: '指定された子どもが見つかりません。' };
  }

  // Get child's family_id for the record
  const { data: child } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .single();

  if (!child) {
    return { error: '子どもの情報を取得できませんでした。' };
  }

  // Upsert book: if ISBN provided and exists, reuse; otherwise insert new
  let bookId: string;

  if (isbn) {
    const { data: existing } = await supabase
      .from('books')
      .select('id')
      .eq('isbn13', isbn)
      .single();

    if (existing) {
      bookId = existing.id;
    } else {
      const { data: newBook, error: bookErr } = await supabase
        .from('books')
        .insert({ isbn13: isbn, title, author: author || null, cover_url: coverUrl })
        .select('id')
        .single();

      if (bookErr || !newBook) {
        return { error: '本の登録に失敗しました。' };
      }
      bookId = newBook.id;
    }
  } else {
    const { data: newBook, error: bookErr } = await supabase
      .from('books')
      .insert({ title, author: author || null, cover_url: coverUrl })
      .select('id')
      .single();

    if (bookErr || !newBook) {
      return { error: '本の登録に失敗しました。' };
    }
    bookId = newBook.id;
  }

  // Insert reading record
  const { error: recErr } = await supabase.from('reading_records').insert({
    family_id: child.family_id,
    child_id: childId,
    book_id: bookId,
    status,
    memo: memo || null,
    finished_on: finishedOn || null,
    created_by: user.id
  });

  if (recErr) {
    return { error: '読書記録の作成に失敗しました。' };
  }

  revalidatePath(`/children/${childId}`);
  redirect(`/children/${childId}`);
}

export async function updateRecordStatus(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    recordId: formData.get('recordId') ?? '',
    status: formData.get('status') ?? '',
    memo: formData.get('memo') ?? '',
    finishedOn: formData.get('finishedOn') ?? ''
  };

  const parsed = updateRecordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { recordId, status, memo, finishedOn } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch record and verify family membership (RLS handles this, but explicit check for better UX)
  const { data: record } = await supabase
    .from('reading_records')
    .select('id, child_id')
    .eq('id', recordId)
    .single();

  if (!record) {
    return { error: '記録が見つかりません。' };
  }

  const { error } = await supabase
    .from('reading_records')
    .update({
      status,
      memo: memo || null,
      finished_on: finishedOn || null
    })
    .eq('id', recordId);

  if (error) {
    return { error: '記録の更新に失敗しました。' };
  }

  revalidatePath(`/records/${recordId}`);
  revalidatePath(`/children/${record.child_id}`);
  redirect(`/records/${recordId}`);
}
