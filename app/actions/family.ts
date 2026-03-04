'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hashPin } from '@/lib/kids/pin';

export type ActionResult = {
  error?: string;
  inviteCode?: string;
  ok?: string;
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
  const pin = String(formData.get('pin') ?? '').trim();

  if (!displayName) return { error: '表示名を入力してください。' };
  if (!/^\d{4}$/.test(pin)) return { error: 'PINは4桁の数字で入力してください。' };

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

  const { data: newChild, error } = await supabase
    .from('children')
    .insert({
      family_id: member.family_id,
      display_name: displayName,
      birth_year: birthYearRaw ? Number(birthYearRaw) : null
    })
    .select('id')
    .single();

  if (error || !newChild) {
    return { error: '子どもの追加に失敗しました。もう一度お試しください。' };
  }

  const { error: pinError } = await supabase.from('child_auth_methods').insert({
    child_id: newChild.id,
    pin_hash: hashPin(pin)
  });

  if (pinError) {
    await supabase.from('children').delete().eq('id', newChild.id);
    return { error: 'PINの設定に失敗しました。もう一度お試しください。' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function createInvite(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const familyId = String(formData.get('familyId') ?? '').trim();
  if (!familyId) return { error: '家族が選択されていません。' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data, error } = await supabase.rpc('create_family_invite', {
    target_family_id: familyId
  });

  if (error) {
    return { error: '招待コードの発行に失敗しました。もう一度お試しください。' };
  }

  return { inviteCode: data };
}


export async function revokeInvite(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const inviteId = String(formData.get('inviteId') ?? '').trim();

  if (!inviteId) return { error: '招待IDが不正です。' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data, error } = await supabase.rpc('revoke_family_invite', {
    target_invite_id: inviteId
  });

  if (error || !data) {
    return { error: '招待コードの無効化に失敗しました。' };
  }

  revalidatePath('/settings/family');
  return { ok: '招待コードを無効化しました。' };
}

export async function acceptInvite(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const code = String(formData.get('code') ?? '').trim();
  if (!code) return { error: '招待コードを入力してください。' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { error } = await supabase.rpc('accept_family_invite', {
    code
  });

  if (error) {
    if (error.message.includes('Already a member')) {
      return { error: 'すでにこの家族のメンバーです。' };
    }
    return { error: '招待コードが無効か、有効期限が切れています。' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
