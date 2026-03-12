import Link from 'next/link';
import { AppTopNav } from '@/components/app-top-nav';
import { EmptyStateCard } from '@/components/empty-state-card';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { ageText } from '@/lib/kids/age-text';
import {
  getAgeModeFromProfile,
  type AgeModeOverride
} from '@/lib/kids/age-mode';

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

  const child = (childRows?.[0] ?? null) as {
    display_name: string;
    birth_year: number | null;
    age_mode_override: AgeModeOverride | null;
  } | null;
  if (!child) redirect('/kids/login');

  const ageMode = getAgeModeFromProfile({
    birthYear: child.birth_year,
    ageModeOverride: child.age_mode_override ?? 'auto'
  });

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
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
        >
          {ageText(ageMode, { junior: '◀ まえ', standard: '◀ 前の月' })}
        </Link>
        <p className="flex-1 text-center font-semibold">{bounds.monthLabel}</p>
        <Link
          href={`/kids/calendar?month=${nextMonthParam}`}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
        >
          {ageText(ageMode, { junior: 'つぎ ▶', standard: '次の月 ▶' })}
        </Link>
      </div>

      <section className="mb-6 rounded-xl border border-amber-100 bg-white/95 p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">
          {ageText(ageMode, {
            junior: 'こんげつのきろく',
            standard: '今月の記録'
          })}
        </h2>
        {hasEntries ? (
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const info = dayMap.get(day);
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={day}
                  className={`rounded border p-1.5 ${isToday ? 'border-orange-300 bg-orange-50' : 'border-amber-100 bg-amber-50/30'}`}
                >
                  <div
                    className={`font-semibold ${isToday ? 'text-orange-700' : 'text-amber-900'}`}
                  >
                    {day}
                  </div>
                  {info ? (
                    <div className="mt-0.5 text-xs text-amber-900">
                      <div>
                        {ageText(ageMode, {
                          junior: `${info.count}さつ`,
                          standard: `${info.count}冊`
                        })}
                      </div>
                      <div>
                        {info.stamp
                          ? (STAMP_EMOJI[info.stamp] ?? info.stamp)
                          : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-amber-700">-</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon="📅"
            title={ageText(ageMode, {
              junior: 'こんげつの きろくは まだないよ',
              standard: '今月の記録はまだありません'
            })}
            description={ageText(ageMode, {
              junior: 'きょう よんだほんを とうろくしてみよう。',
              standard: '今日読んだ本を登録してみよう。'
            })}
            primaryAction={
              <Link
                href="/kids/records/new"
                className={`inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 font-bold text-white transition hover:bg-orange-600 ${ageMode === 'junior' ? 'h-14 text-base' : 'h-10 text-sm'}`}
              >
                {ageText(ageMode, {
                  junior: 'きろくする',
                  standard: '記録をつける'
                })}
              </Link>
            }
          />
        )}
      </section>

      <section className="rounded-xl border border-amber-100 bg-white/95 p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">げっとしたバッジ</h2>
        {badges.length > 0 ? (
          <ul className="space-y-2">
            {badges.map((badge) => {
              return (
                <li
                  key={badge.badge_id}
                  className="rounded-lg border border-amber-200 bg-amber-50/40 p-3"
                >
                  <p className="font-medium">
                    {badge.icon ?? '🏅'} {badge.name ?? badge.badge_id}
                  </p>
                  <p className="text-sm text-amber-800">
                    {badge.description ?? ''}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="text-3xl">🏅</span>
            <p className="mt-2 text-sm text-amber-800">まだ バッジは ないよ</p>
            <p className="mt-1 text-xs text-amber-600">
              きろくすると バッジが もらえるよ！
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
