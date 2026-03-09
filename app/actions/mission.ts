'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/actions/types';

export async function setChildMission(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const childId = String(formData.get('childId') ?? '').trim();
  const templateId = String(formData.get('templateId') ?? '').trim();
  const familyId = String(formData.get('familyId') ?? '').trim();

  if (!childId || !templateId || !familyId) {
    return { error: 'ミッション設定に必要な情報が不足しています。' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_child_mission', {
    target_child_id: childId,
    target_template_id: templateId,
    target_family_id: familyId,
  });

  if (error) {
    return { error: 'ミッションの設定に失敗しました。' };
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath('/kids/home');
  return {};
}
