import { requireKidContext } from '@/lib/kids/client';

export type ChildBadgeRow = {
  badge_id: string;
  awarded_at: string;
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  junior_name: string | null;
  junior_description: string | null;
};

export async function evaluateChildBadges(sourceRecordId: string) {
  const { supabase, childId } = await requireKidContext();

  await supabase.rpc('evaluate_kid_badges', {
    target_child_id: childId,
    target_source_record_id: sourceRecordId
  });
}

export async function getChildBadge(badgeId: string): Promise<ChildBadgeRow | null> {
  const badges = await getChildBadges();
  return badges.find((b) => b.badge_id === badgeId) ?? null;
}

export async function getChildBadges(): Promise<ChildBadgeRow[]> {
  const { supabase, childId } = await requireKidContext();

  const { data } = await supabase.rpc('get_kid_badges', {
    target_child_id: childId
  });

  return (data ?? []) as ChildBadgeRow[];
}
