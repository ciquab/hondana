'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { canUseKidSession, clearKidSession, setKidSession } from '@/lib/kids/session';
import { verifyPin } from '@/lib/kids/pin';
import { canCreateAdminClient, createAdminClient } from '@/lib/supabase/admin';

export type KidAuthResult = {
  error?: string;
};


async function logKidAuthEvent(
  supabase: ReturnType<typeof createAdminClient>,
  payload: {
    childId?: string;
    eventType: 'invalid_input' | 'child_not_found' | 'pin_not_set' | 'locked' | 'pin_failed' | 'pin_locked' | 'success';
    reason?: string;
  }
) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const userAgent = headerStore.get('user-agent');

  try {
    await supabase.from('kid_auth_audit_logs').insert({
      child_id: payload.childId ?? null,
      event_type: payload.eventType,
      reason: payload.reason ?? null,
      metadata: {
        ip: forwardedFor ? forwardedFor.split(',')[0]?.trim() : null,
        userAgent: userAgent ?? null
      }
    });
  } catch {
    // audit log failure must not block auth flow
  }
}

export async function verifyKidPin(
  _prev: KidAuthResult,
  formData: FormData
): Promise<KidAuthResult> {
  const childId = String(formData.get('childId') ?? '').trim();
  const pin = String(formData.get('pin') ?? '').trim();

  if (!canCreateAdminClient() || !canUseKidSession()) {
    return { error: 'こどもモードの設定が不足しています。管理者に連絡してください。' };
  }

  const supabase = createAdminClient();

  if (!childId || !/^\d{4}$/.test(pin)) {
    await logKidAuthEvent(supabase, { eventType: 'invalid_input', reason: 'child_id_or_pin_format' });
    return { error: '子どもIDと4桁PINを入力してください。' };
  }

  const { data: child } = await supabase.from('children').select('id').eq('id', childId).maybeSingle();
  if (!child?.id) {
    await logKidAuthEvent(supabase, { childId, eventType: 'child_not_found' });
    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  const { data: method } = await supabase
    .from('child_auth_methods')
    .select('pin_hash, pin_failed_count, pin_locked_until')
    .eq('child_id', childId)
    .single();

  if (!method?.pin_hash) {
    await logKidAuthEvent(supabase, { childId, eventType: 'pin_not_set' });
    return { error: 'PINが設定されていません。保護者画面で設定してください。' };
  }

  if (method.pin_locked_until && new Date(method.pin_locked_until) > new Date()) {
    await logKidAuthEvent(supabase, { childId, eventType: 'locked', reason: 'already_locked' });
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

    await logKidAuthEvent(supabase, {
      childId,
      eventType: lockedUntil ? 'pin_locked' : 'pin_failed',
      reason: `fail_count:${nextFailCount}`
    });

    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  await supabase
    .from('child_auth_methods')
    .update({
      pin_failed_count: 0,
      pin_locked_until: null
    })
    .eq('child_id', childId);

  await logKidAuthEvent(supabase, { childId, eventType: 'success' });

  await setKidSession(childId);
  revalidatePath('/kids/home');
  redirect('/kids/home');
}

export async function kidSignOut() {
  await clearKidSession();
  redirect('/kids/login');
}
