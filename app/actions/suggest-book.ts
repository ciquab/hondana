'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SuggestBookResult = { error?: string; success?: boolean };

export async function suggestBook(
  _prev: SuggestBookResult,
  formData: FormData
): Promise<SuggestBookResult> {
  const childId = String(formData.get('childId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const author = String(formData.get('author') ?? '').trim();
  const isbn = String(formData.get('isbn') ?? '').trim();
  const coverUrl = String(formData.get('coverUrl') ?? '').trim();

  if (!childId || !title) return { error: '本のタイトルが必要です。' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('suggest_book_to_child', {
    target_child_id: childId,
    target_title: title,
    target_author: author || null,
    target_isbn13: isbn || null,
    target_cover_url: coverUrl || null,
  });

  if (error || !data) {
    return { error: 'おすすめの送信に失敗しました。' };
  }

  revalidatePath(`/children/${childId}`);
  return { success: true };
}
