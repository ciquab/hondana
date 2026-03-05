import { createAdminClient } from '@/lib/supabase/admin';

export type ChildBadgeRow = {
  badge_id: string;
  awarded_at: string;
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
};

export async function evaluateChildBadges(childId: string, sourceRecordId: string) {
  const supabase = createAdminClient();

  await supabase.rpc('evaluate_kid_badges', {
    target_child_id: childId,
    target_source_record_id: sourceRecordId
  });
}

export async function getChildBadges(childId: string): Promise<ChildBadgeRow[]> {
  const supabase = createAdminClient();

  const { data } = await supabase.rpc('get_kid_badges', {
    target_child_id: childId
  });

  return (data ?? []) as ChildBadgeRow[];
}
