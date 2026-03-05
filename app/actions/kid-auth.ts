'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { canUseKidSession, clearKidSession, setKidSession } from '@/lib/kids/session';
import { verifyPin } from '@/lib/kids/pin';
import { createClient } from '@/lib/supabase/server';

export type KidAuthResult = {
  error?: string;
};

async function logKidAuthEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    await supabase.rpc('log_kid_auth_audit_event', {
      target_child_id: payload.childId ?? null,
      target_event_type: payload.eventType,
      target_reason: payload.reason ?? null,
      target_metadata: {
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

  if (!canUseKidSession()) {
    return { error: 'こどもモードの設定が不足しています。管理者に連絡してください。' };
  }

  const supabase = await createClient();

  if (!childId || !/^\d{4}$/.test(pin)) {
    await logKidAuthEvent(supabase, { eventType: 'invalid_input', reason: 'child_id_or_pin_format' });
    return { error: '子どもIDと4桁PINを入力してください。' };
  }

  const { data: authState } = await supabase.rpc('get_child_auth_for_login', {
    target_child_id: childId
  });
  const state = authState?.[0];

  if (!state?.child_exists) {
    await logKidAuthEvent(supabase, { childId, eventType: 'child_not_found' });
    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  if (!state.pin_hash) {
    await logKidAuthEvent(supabase, { childId, eventType: 'pin_not_set' });
    return { error: 'PINが設定されていません。保護者画面で設定してください。' };
  }

  if (state.pin_locked_until && new Date(state.pin_locked_until) > new Date()) {
    await logKidAuthEvent(supabase, { childId, eventType: 'locked', reason: 'already_locked' });
    return { error: 'PINがロック中です。しばらく待ってから再試行してください。' };
  }

  if (!verifyPin(pin, state.pin_hash)) {
    const { data: failState } = await supabase.rpc('register_kid_pin_attempt', {
      target_child_id: childId,
      success: false
    });

    const current = failState?.[0];

    await logKidAuthEvent(supabase, {
      childId,
      eventType: current?.pin_locked_until ? 'pin_locked' : 'pin_failed',
      reason: `fail_count:${current?.pin_failed_count ?? 'unknown'}`
    });

    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  await supabase.rpc('register_kid_pin_attempt', {
    target_child_id: childId,
    success: true
  });

  await logKidAuthEvent(supabase, { childId, eventType: 'success' });

  await setKidSession(childId);
  revalidatePath('/kids/home');
  redirect('/kids/home');
}

export async function kidSignOut() {
  await clearKidSession();
  redirect('/kids/login');
}
