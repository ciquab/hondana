'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clearKidSession, setKidSession } from '@/lib/kids/session';
import { verifyPin } from '@/lib/kids/pin';
import { createAdminClient } from '@/lib/supabase/admin';

export type KidAuthResult = {
  error?: string;
};

export async function verifyKidPin(
  _prev: KidAuthResult,
  formData: FormData
): Promise<KidAuthResult> {
  const childId = String(formData.get('childId') ?? '').trim();
  const pin = String(formData.get('pin') ?? '').trim();

  if (!childId || !/^\d{4}$/.test(pin)) {
    return { error: '子どもIDと4桁PINを入力してください。' };
  }

  const supabase = createAdminClient();

  const { data: child } = await supabase.from('children').select('id').eq('id', childId).maybeSingle();
  if (!child?.id) {
    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  const { data: method } = await supabase
    .from('child_auth_methods')
    .select('pin_hash, pin_failed_count, pin_locked_until')
    .eq('child_id', childId)
    .single();

  if (!method?.pin_hash) {
    return { error: 'PINが設定されていません。保護者画面で設定してください。' };
  }

  if (method.pin_locked_until && new Date(method.pin_locked_until) > new Date()) {
    return { error: 'PINがロック中です。しばらく待ってから再試行してください。' };
  }

  if (!verifyPin(pin, method.pin_hash)) {
    const nextFailCount = (method.pin_failed_count ?? 0) + 1;
    const lockedUntil = nextFailCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

    await supabase
      .from('child_auth_methods')
      .update({
        pin_failed_count: nextFailCount,
        pin_locked_until: lockedUntil
      })
      .eq('child_id', childId);

    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  await supabase
    .from('child_auth_methods')
    .update({
      pin_failed_count: 0,
      pin_locked_until: null
    })
    .eq('child_id', childId);

  await setKidSession(childId);
  revalidatePath('/kids/home');
  redirect('/kids/home');
}

export async function kidSignOut() {
  await clearKidSession();
  redirect('/kids/login');
}
