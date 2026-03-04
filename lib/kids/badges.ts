<<<<<<< Updated upstream
import { createAdminClient } from '@/lib/supabase/admin';
=======
import { createServiceClient } from '@/lib/supabase/service';
>>>>>>> Stashed changes

const BADGE_IDS = {
  FIRST_BOOK: 'first_book',
  TEN_BOOKS: 'ten_books',
  SEVEN_DAY_STREAK: 'seven_day_streak',
  MANY_FEELINGS: 'many_feelings'
} as const;

// UTC タイムスタンプを JST (UTC+9) の YYYY-MM-DD に変換する
function toJSTDateString(utcTimestamp: string): string {
  const ms = new Date(utcTimestamp).getTime() + 9 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function longestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueSorted = Array.from(new Set(dates)).sort();
  let max = 1;
  let current = 1;

  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const prev = new Date(uniqueSorted[i - 1]);
    const cur = new Date(uniqueSorted[i]);
    const diffDays = Math.floor((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }

  return max;
}

export async function evaluateChildBadges(childId: string, sourceRecordId: string) {
<<<<<<< Updated upstream
  const supabase = createAdminClient();
=======
  const supabase = createServiceClient();
>>>>>>> Stashed changes

  const [{ count: totalRecords }, { data: allRecords }, { data: allTags }] = await Promise.all([
    supabase
      .from('reading_records')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId),
    supabase.from('reading_records').select('created_at').eq('child_id', childId),
    supabase.from('record_feeling_tags').select('tag').eq('child_id', childId)
  ]);

  const awarded: string[] = [];

  if ((totalRecords ?? 0) >= 1) awarded.push(BADGE_IDS.FIRST_BOOK);
  if ((totalRecords ?? 0) >= 10) awarded.push(BADGE_IDS.TEN_BOOKS);

  const streak = longestStreak(
    (allRecords ?? [])
      .map((row) => (row.created_at ? toJSTDateString(row.created_at) : null))
      .filter((v): v is string => Boolean(v))
  );
  if (streak >= 7) awarded.push(BADGE_IDS.SEVEN_DAY_STREAK);

  const uniqueFeelingCount = new Set((allTags ?? []).map((row) => row.tag)).size;
  if (uniqueFeelingCount >= 10) awarded.push(BADGE_IDS.MANY_FEELINGS);

  if (awarded.length === 0) return;

  await supabase.from('child_badges').upsert(
    awarded.map((badgeId) => ({
      child_id: childId,
      badge_id: badgeId,
      source_record_id: sourceRecordId
    })),
    { onConflict: 'child_id,badge_id', ignoreDuplicates: true }
  );
}

export async function getChildBadges(childId: string) {
<<<<<<< Updated upstream
  const supabase = createAdminClient();
=======
  const supabase = createServiceClient();
>>>>>>> Stashed changes

  const { data } = await supabase
    .from('child_badges')
    .select('badge_id, awarded_at, badges(id, name, description, icon, sort_order)')
    .eq('child_id', childId)
    .order('awarded_at', { ascending: false });

  return data ?? [];
}
