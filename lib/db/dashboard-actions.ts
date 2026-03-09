import { createClient } from '@/lib/supabase/server';

export type DashboardAction = {
  type: 'uncommented_record' | 'mission_alert' | 'no_records_this_week';
  childName: string;
  childId: string;
  message: string;
  href: string;
  icon: string;
};

export async function getDashboardActions(
  childIds: string[]
): Promise<DashboardAction[]> {
  if (childIds.length === 0) return [];

  const supabase = await createClient();
  const actions: DashboardAction[] = [];

  // 1. 未コメント記録
  const { data: uncommented } = await supabase.rpc(
    'get_uncommented_records_for_children',
    { target_child_ids: childIds, max_rows: 3 }
  );
  for (const row of (uncommented ?? []) as {
    record_id: string;
    child_id: string;
    child_name: string;
    book_title: string;
  }[]) {
    actions.push({
      type: 'uncommented_record',
      childName: row.child_name,
      childId: row.child_id,
      message: `「${row.book_title}」にコメントしよう`,
      href: `/records/${row.record_id}`,
      icon: '💬',
    });
  }

  // 2. ミッションアラート
  const { data: alerts } = await supabase.rpc(
    'get_mission_alerts_for_children',
    { target_child_ids: childIds }
  );
  for (const row of (alerts ?? []) as {
    child_id: string;
    child_name: string;
    mission_title: string;
    current_progress: number;
    target_value: number;
  }[]) {
    actions.push({
      type: 'mission_alert',
      childName: row.child_name,
      childId: row.child_id,
      message: `「${row.mission_title}」まであと${row.target_value - row.current_progress}`,
      href: `/children/${row.child_id}`,
      icon: '🎯',
    });
  }

  // 3. 今週記録なしの子ども
  const { data: noRecords } = await supabase.rpc(
    'get_children_without_records_this_week',
    { target_child_ids: childIds }
  );
  for (const row of (noRecords ?? []) as {
    child_id: string;
    child_name: string;
  }[]) {
    actions.push({
      type: 'no_records_this_week',
      childName: row.child_name,
      childId: row.child_id,
      message: '今週まだ記録がありません',
      href: `/children/${row.child_id}`,
      icon: '📖',
    });
  }

  // 最大3件に絞る
  return actions.slice(0, 3);
}

export type WeeklyHighlight = {
  recordId: string;
  bookTitle: string;
  coverUrl: string | null;
  stamp: string;
};

export async function getWeeklyHighlights(
  childIds: string[]
): Promise<Record<string, WeeklyHighlight | null>> {
  if (childIds.length === 0) return {};

  const supabase = await createClient();
  const result: Record<string, WeeklyHighlight | null> = {};

  await Promise.all(
    childIds.map(async (childId) => {
      const { data } = await supabase.rpc('get_weekly_highlight_for_child', {
        target_child_id: childId,
      });
      const row = (data as { record_id: string; book_title: string; cover_url: string | null; stamp: string }[] | null)?.[0];
      result[childId] = row
        ? {
            recordId: row.record_id,
            bookTitle: row.book_title,
            coverUrl: row.cover_url,
            stamp: row.stamp,
          }
        : null;
    })
  );

  return result;
}
