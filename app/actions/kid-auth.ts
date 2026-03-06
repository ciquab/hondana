'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { canUseKidSession, clearKidSession, setKidSession } from '@/lib/kids/session';
import { burnPinVerifyCost, verifyPin } from '@/lib/kids/pin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { canCreateAdminClient, createAdminClient } from '@/lib/supabase/admin';
import { canCreateKidClient } from '@/lib/supabase/child';

export type KidAuthResult = {
  error?: string;
};


function sanitizeHeaderValue(value: string | null, max = 200): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\r\n\t]/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function getClientIpFromForwardedFor(value: string | null): string | null {
  const first = value?.split(',')[0]?.trim() ?? null;
  return sanitizeHeaderValue(first, 64);
}


function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function logKidAuthEvent(
  supabase: SupabaseClient,
  payload: {
    childId?: string;
    eventType: 'invalid_input' | 'child_not_found' | 'pin_not_set' | 'locked' | 'pin_failed' | 'pin_locked' | 'success';
    reason?: string;
  }
) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const userAgent = headerStore.get('user-agent');

  const ip = getClientIpFromForwardedFor(forwardedFor);
  const safeUserAgent = sanitizeHeaderValue(userAgent, 300);

  try {
    await supabase.rpc('log_kid_auth_audit_event', {
      target_child_id: payload.childId ?? null,
      target_event_type: payload.eventType,
      target_reason: payload.reason ?? null,
      target_metadata: {
        ip: ip,
        userAgent: safeUserAgent
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

  if (!canCreateAdminClient() || !canUseKidSession() || !canCreateKidClient()) {
    return { error: 'こどもモードの設定が不足しています。管理者に連絡してください。' };
  }

  const supabase = createAdminClient();

  if (!childId || !/^\d{4}$/.test(pin)) {
    await logKidAuthEvent(supabase, { eventType: 'invalid_input', reason: 'child_id_or_pin_format' });
    return { error: '子どもIDと4桁PINを入力してください。' };
  }

  if (!isUuid(childId)) {
    await logKidAuthEvent(supabase, { eventType: 'invalid_input', reason: 'child_id_not_uuid' });
    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  const { data: authState } = await supabase.rpc('get_child_auth_for_login', {
    target_child_id: childId
  });
  const state = authState?.[0];

  if (!state?.child_exists) {
    burnPinVerifyCost(pin);
    await logKidAuthEvent(supabase, { childId, eventType: 'child_not_found' });
    return { error: '子どもIDまたはPINが正しくありません。' };
  }

  if (!state.pin_hash) {
    burnPinVerifyCost(pin);
    await logKidAuthEvent(supabase, { childId, eventType: 'pin_not_set' });
    return { error: 'PINが設定されていません。保護者画面で設定してください。' };
  }

  if (state.pin_locked_until && new Date(state.pin_locked_until) > new Date()) {
    burnPinVerifyCost(pin);
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

  if (!state.family_id) {
    return { error: '子どもセッションの初期化に失敗しました。管理者に連絡してください。' };
  }

  await setKidSession({ childId, familyId: state.family_id });
  revalidatePath('/kids/home');
  redirect('/kids/home');
}

export async function kidSignOut() {
  await clearKidSession();
  redirect('/kids/login');
}
