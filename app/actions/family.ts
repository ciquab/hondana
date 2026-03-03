'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  error?: string;
};

export async function createFamily(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: '家族名を入力してください。' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { error } = await supabase.rpc('create_family_with_owner', {
    family_name: name
  });

  if (error) {
    return { error: '家族の作成に失敗しました。もう一度お試しください。' };
  }

  revalidatePath('/dashboard');
  redirect('/settings/children');
}

export async function createChild(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const birthYearRaw = String(formData.get('birthYear') ?? '').trim();

  if (!displayName) return { error: '表示名を入力してください。' };

  if (birthYearRaw) {
    const year = Number(birthYearRaw);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
      return { error: '生年が正しくありません。' };
    }
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!member?.family_id) {
    redirect('/settings/family');
  }

  const { error } = await supabase.from('children').insert({
    family_id: member.family_id,
    display_name: displayName,
    birth_year: birthYearRaw ? Number(birthYearRaw) : null
  });

  if (error) {
    return { error: '子どもの追加に失敗しました。もう一度お試しください。' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
