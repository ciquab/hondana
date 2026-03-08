'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { canCreateAdminClient, createAdminClient } from '@/lib/supabase/admin';
import { hashPin } from '@/lib/kids/pin';
import { sanitizeHeaderValue, getClientIpFromForwardedFor } from '@/lib/utils/request';
import type { ActionResult as BaseActionResult } from '@/lib/actions/types';

export type ActionResult = BaseActionResult<{ inviteCode?: string; ok?: string }>;


async function logInviteAuditEvent(
  payload: {
    actorUserId: string;
    action:
      | 'create_invite_failed'
      | 'create_invite_success'
      | 'revoke_invite_failed'
      | 'revoke_invite_success'
      | 'accept_invite_failed'
      | 'accept_invite_success';
    familyId?: string | null;
    inviteId?: string | null;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (!canCreateAdminClient()) return;

  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const userAgent = headerStore.get('user-agent');

  const ip = getClientIpFromForwardedFor(forwardedFor);
  const safeUserAgent = sanitizeHeaderValue(userAgent, 300);

  const supabase = createAdminClient();

  try {
    await supabase.rpc('log_family_invite_audit_event', {
      target_actor_user_id: payload.actorUserId,
      target_family_id: payload.familyId ?? null,
      target_invite_id: payload.inviteId ?? null,
      target_action: payload.action,
      target_reason: payload.reason ?? null,
      target_metadata: {
        ip,
        userAgent: safeUserAgent,
        ...(payload.metadata ?? {})
      }
    });
  } catch {
    // audit log failure must not block user action
  }
}

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
    // PIN 設定失敗 → children レコードをロールバック
    const { error: rollbackError } = await supabase
      .from('children')
      .delete()
      .eq('id', newChild.id);
    if (rollbackError) {
      // ロールバック自体が失敗した場合は孤立レコードが残るためログに残す
      console.error('[createChild] rollback failed: orphan child record may exist', {
        childId: newChild.id,
        rollbackError,
      });
    }
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
    await logInviteAuditEvent({
      actorUserId: user.id,
      action: 'create_invite_failed',
      familyId: null,
      reason: error.message,
      metadata: { attemptedFamilyId: familyId }
    });
    return { error: '招待コードの発行に失敗しました。もう一度お試しください。' };
  }

  await logInviteAuditEvent({
    actorUserId: user.id,
    action: 'create_invite_success',
    familyId,
    reason: 'created',
    metadata: { inviteCodePrefix: String(data).slice(0, 3) }
  });

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

  const { data: inviteBefore } = await supabase
    .from('family_invites')
    .select('id, family_id')
    .eq('id', inviteId)
    .maybeSingle();

  const { data, error } = await supabase.rpc('revoke_family_invite', {
    target_invite_id: inviteId
  });

  if (error || !data) {
    await logInviteAuditEvent({
      actorUserId: user.id,
      action: 'revoke_invite_failed',
      familyId: inviteBefore?.family_id ?? null,
      inviteId,
      reason: error?.message ?? 'revoke_returned_false'
    });
    return { error: '招待コードの無効化に失敗しました。' };
  }

  await logInviteAuditEvent({
    actorUserId: user.id,
    action: 'revoke_invite_success',
    familyId: inviteBefore?.family_id ?? null,
    inviteId,
    reason: 'revoked'
  });

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

  const { data: familyId, error } = await supabase.rpc('accept_family_invite', {
    code
  });

  if (error) {
    await logInviteAuditEvent({
      actorUserId: user.id,
      action: 'accept_invite_failed',
      familyId: null,
      reason: error.message,
      metadata: { inviteCodePrefix: code.slice(0, 3).toUpperCase() }
    });

    if (error.message.includes('Already a member')) {
      return { error: 'すでにこの家族のメンバーです。' };
    }
    return { error: '招待コードが無効か、有効期限が切れています。' };
  }

  await logInviteAuditEvent({
    actorUserId: user.id,
    action: 'accept_invite_success',
    familyId: familyId ?? null,
    reason: 'accepted',
    metadata: { inviteCodePrefix: code.slice(0, 3).toUpperCase() }
  });

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateMyDisplayName(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (!displayName) return { error: '表示名を入力してください。' };
  if (displayName.length > 30) return { error: '表示名は30文字以内で入力してください。' };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { error } = await supabase
    .from('family_members')
    .update({ display_name: displayName })
    .eq('user_id', user.id);

  if (error) return { error: '表示名の更新に失敗しました。' };

  revalidatePath('/settings/family');
  return { ok: '表示名を更新しました。' };
}
