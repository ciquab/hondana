import Link from 'next/link';
import { getKidContext } from '@/lib/kids/context';
import { getChildBadges } from '@/lib/kids/badges';
import { createServiceClient } from '@/lib/supabase/service';

function getMonthBounds(monthParam: string | undefined) {
  const base = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? `${monthParam}-01` : undefined;
  const monthStart = base ? new Date(base) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  return {
    monthLabel: `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`,
    from: monthStart.toISOString(),
    to: nextMonth.toISOString(),
    monthStart
  };
}

export default async function KidsCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { childId, displayName } = await getKidContext();

  const { month } = await searchParams;
  const bounds = getMonthBounds(month);

  const supabase = createServiceClient();
  const [{ data: records }, badges] = await Promise.all([
    supabase
      .from('reading_records')
      .select('id, created_at, record_reactions_child(stamp)')
      .eq('child_id', childId)
      .gte('created_at', bounds.from)
      .lt('created_at', bounds.to),
    getChildBadges(childId)
  ]);

  const dayMap = new Map<number, { count: number; stamp?: string }>();
  for (const row of records ?? []) {
    const day = new Date(row.created_at).getDate();
    const prev = dayMap.get(day) ?? { count: 0 };
    dayMap.set(day, {
      count: prev.count + 1,
      stamp: (row.record_reactions_child as { stamp?: string }[] | null)?.[0]?.stamp ?? prev.stamp
    });
  }

  const daysInMonth = new Date(bounds.monthStart.getFullYear(), bounds.monthStart.getMonth() + 1, 0).getDate();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>
      <h1 className="mb-1 text-2xl font-bold">{displayName} のどくしょカレンダー</h1>
      <p className="mb-4 text-sm text-slate-600">{bounds.monthLabel}</p>

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">今月の記録</h2>
        <div className="grid grid-cols-7 gap-2 text-center text-xs">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const info = dayMap.get(day);
            return (
              <div key={day} className="rounded border p-2">
                <div className="font-semibold">{day}</div>
                {info ? (
                  <div className="mt-1 text-[11px] text-slate-700">
                    <div>{info.count}冊</div>
                    <div>{info.stamp ?? '📘'}</div>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-400">-</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">ゲットしたバッジ</h2>
        {badges.length > 0 ? (
          <ul className="space-y-2">
            {badges.map((badge) => {
              const detail = badge.badges as
                | { icon?: string; name?: string; description?: string }
                | { icon?: string; name?: string; description?: string }[]
                | null;
              const info = Array.isArray(detail) ? detail[0] : detail;

              return (
                <li key={badge.badge_id} className="rounded border p-3">
                  <p className="font-medium">
                    {info?.icon ?? '🏅'} {info?.name ?? badge.badge_id}
                  </p>
                  <p className="text-sm text-slate-600">{info?.description ?? ''}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">まだバッジはありません。記録してみよう！</p>
        )}
      </section>
    </main>
  );
}
