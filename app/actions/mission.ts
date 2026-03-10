'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/actions/types';

function parseDurationDays(input: FormDataEntryValue | null): number {
  const value = Number(String(input ?? '7'));
  return value === 14 ? 14 : 7;
}

function parseTargetValue(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > 20) return null;
  return value;
}

export async function setChildMission(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const childId = String(formData.get('childId') ?? '').trim();
  const templateId = String(formData.get('templateId') ?? '').trim();
  const familyId = String(formData.get('familyId') ?? '').trim();
  const durationDays = parseDurationDays(formData.get('durationDays'));
  const customTargetValue = parseTargetValue(formData.get('customTargetValue'));

  if (!childId || !templateId || !familyId) {
    return { error: 'ミッション設定に必要な情報が不足しています。' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_child_mission', {
    target_child_id: childId,
    target_template_id: templateId,
    target_family_id: familyId,
    duration_days: durationDays,
    custom_target_value: customTargetValue
  });

  if (error) {
    return { error: 'ミッションの設定に失敗しました。' };
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath('/kids/home');
  return {};
}
