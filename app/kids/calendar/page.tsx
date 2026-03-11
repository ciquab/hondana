import Link from 'next/link';
import { AppTopNav } from '@/components/app-top-nav';
import { EmptyStateCard } from '@/components/empty-state-card';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { ageText } from '@/lib/kids/age-text';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

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
  const base =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? `${monthParam}-01`
      : undefined;
  const monthStart = base
    ? new Date(base)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const nextMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    1
  );

  return {
    monthLabel: `${monthStart.getFullYear()}ねん${monthStart.getMonth() + 1}がつ`,
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

  const ageMode = await resolveKidAgeMode(supabase, childId);

  const dayMap = new Map<number, { count: number; stamp?: string }>();
  for (const row of (records ?? []) as CalendarEntryRow[]) {
    const day = new Date(row.created_at).getDate();
    const prev = dayMap.get(day) ?? { count: 0 };
    dayMap.set(day, {
      count: prev.count + 1,
      stamp: row.stamp ?? prev.stamp
    });
  }

  const daysInMonth = new Date(
    bounds.monthStart.getFullYear(),
    bounds.monthStart.getMonth() + 1,
    0
  ).getDate();

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === bounds.monthStart.getFullYear() &&
    today.getMonth() === bounds.monthStart.getMonth();

  const prevMonth = formatMonthParam(
    new Date(
      bounds.monthStart.getFullYear(),
      bounds.monthStart.getMonth() - 1,
      1
    )
  );
  const hasEntries = dayMap.size > 0;

  const nextMonthParam = formatMonthParam(
    new Date(
      bounds.monthStart.getFullYear(),
      bounds.monthStart.getMonth() + 1,
      1
    )
  );

  return (
    <main className="mx-auto max-w-2xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: `${child.display_name} の カレンダー`,
          standard: `${child.display_name} のどくしょカレンダー`
        })}
        backHref="/kids/home"
        backLabel={ageText(ageMode, { junior: 'ほーむ', standard: 'ホーム' })}
      />

      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/kids/calendar?month=${prevMonth}`}
          className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
        >
          {ageText(ageMode, { junior: '◀ まえ', standard: '◀ まえのつき' })}
        </Link>
        <p className="flex-1 text-center font-semibold">{bounds.monthLabel}</p>
        <Link
          href={`/kids/calendar?month=${nextMonthParam}`}
          className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
        >
          {ageText(ageMode, { junior: 'つぎ ▶', standard: 'つぎのつき ▶' })}
        </Link>
      </div>

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">こんげつのきろく</h2>
        {hasEntries ? (
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
                  <div
                    className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}
                  >
                    {day}
                  </div>
                  {info ? (
                    <div className="mt-0.5 text-xs text-slate-700">
                      <div>{info.count}さつ</div>
                      <div>
                        {info.stamp
                          ? (STAMP_EMOJI[info.stamp] ?? info.stamp)
                          : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-slate-500">-</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon="📅"
            title="こんげつの きろくは まだないよ"
            description="きょう よんだほんを とうろくしてみよう。"
            primaryAction={
              <Link
                href="/kids/records/new"
                className={`inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 font-bold text-white transition hover:bg-orange-700 ${ageMode === 'junior' ? 'h-14 text-base' : 'h-10 text-sm'}`}
              >
                {ageText(ageMode, { junior: 'きろくする', standard: 'きろくをつける' })}
              </Link>
            }
          />
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">げっとしたばっじ</h2>
        {badges.length > 0 ? (
          <ul className="space-y-2">
            {badges.map((badge) => {
              return (
                <li key={badge.badge_id} className="rounded border p-3">
                  <p className="font-medium">
                    {badge.icon ?? '🏅'} {badge.name ?? badge.badge_id}
                  </p>
                  <p className="text-sm text-slate-600">
                    {badge.description ?? ''}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="text-3xl">🏅</span>
            <p className="mt-2 text-sm text-slate-600">
              まだ バッジは ないよ
            </p>
            <p className="mt-1 text-xs text-slate-400">
              きろくすると バッジが もらえるよ！
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
