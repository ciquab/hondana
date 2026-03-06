import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';

type CalendarEntryRow = { created_at: string; stamp: string | null };

const STAMP_EMOJI: Record<string, string> = {
  great: '🌟',
  fun: '😊',
  ok: '😐',
  hard: '😓'
};

function formatMonthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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
  const { childId, supabase } = await requireKidContext();

  const { month } = await searchParams;
  const bounds = getMonthBounds(month);

  const [{ data: records }, { data: childRows }, badges] = await Promise.all([
    supabase.rpc('get_kid_calendar_entries', {
      target_child_id: childId,
      from_ts: bounds.from,
      to_ts: bounds.to
    }),
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    getChildBadges()
  ]);

  const child = childRows?.[0];
  if (!child) redirect('/kids/login');

  const dayMap = new Map<number, { count: number; stamp?: string }>();
  for (const row of ((records ?? []) as CalendarEntryRow[])) {
    const day = new Date(row.created_at).getDate();
    const prev = dayMap.get(day) ?? { count: 0 };
    dayMap.set(day, {
      count: prev.count + 1,
      stamp: row.stamp ?? prev.stamp
    });
  }

  const daysInMonth = new Date(bounds.monthStart.getFullYear(), bounds.monthStart.getMonth() + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === bounds.monthStart.getFullYear() &&
    today.getMonth() === bounds.monthStart.getMonth();

  const prevMonth = formatMonthParam(
    new Date(bounds.monthStart.getFullYear(), bounds.monthStart.getMonth() - 1, 1)
  );
  const nextMonthParam = formatMonthParam(
    new Date(bounds.monthStart.getFullYear(), bounds.monthStart.getMonth() + 1, 1)
  );

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>
      <h1 className="mb-1 text-2xl font-bold">{child.display_name} のどくしょカレンダー</h1>

      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/kids/calendar?month=${prevMonth}`}
          className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
        >
          ◀ 前の月
        </Link>
        <p className="flex-1 text-center font-semibold">{bounds.monthLabel}</p>
        <Link
          href={`/kids/calendar?month=${nextMonthParam}`}
          className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
        >
          次の月 ▶
        </Link>
      </div>

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">今月の記録</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const info = dayMap.get(day);
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <div
                key={day}
                className={`rounded border p-1.5 ${isToday ? 'border-blue-400 bg-blue-50' : ''}`}
              >
                <div className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}>{day}</div>
                {info ? (
                  <div className="mt-0.5 text-[11px] text-slate-700">
                    <div>{info.count}冊</div>
                    <div>{info.stamp ? (STAMP_EMOJI[info.stamp] ?? info.stamp) : ''}</div>
                  </div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-slate-300">-</div>
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
              return (
                <li key={badge.badge_id} className="rounded border p-3">
                  <p className="font-medium">
                    {badge.icon ?? '🏅'} {badge.name ?? badge.badge_id}
                  </p>
                  <p className="text-sm text-slate-600">{badge.description ?? ''}</p>
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
