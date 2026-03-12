import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppTopNav } from '@/components/app-top-nav';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadge } from '@/lib/kids/badges';
import { ageText } from '@/lib/kids/age-text';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function BadgeDetailPage({
  params
}: {
  params: Promise<{ badgeId: string }>;
}) {
  const { childId, supabase } = await requireKidContext();
  const { badgeId } = await params;

  const [badgeOrNull, ageMode] = await Promise.all([
    getChildBadge(badgeId),
    resolveKidAgeMode(supabase, childId)
  ]);

  if (!badgeOrNull) notFound();
  const badge = badgeOrNull;

  const displayName =
    ageMode === 'junior' && badge.junior_name
      ? badge.junior_name
      : badge.name ?? badge.badge_id;
  const displayDescription =
    ageMode === 'junior' && badge.junior_description
      ? badge.junior_description
      : badge.description ?? '';

  return (
    <main className="mx-auto max-w-xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: 'バッジの しょうさい',
          standard: 'バッジの詳細'
        })}
        backHref="/kids/badges"
        backLabel={ageText(ageMode, {
          junior: 'いちらん',
          standard: '一覧'
        })}
      />

      <div className="flex flex-col items-center rounded-2xl border border-amber-200 bg-white/95 p-8 shadow">
        <span className="text-7xl">{badge.icon ?? '🏅'}</span>

        <h2 className="mt-4 text-xl font-bold text-amber-900">
          {displayName}
        </h2>

        <p className="mt-2 text-center text-sm text-amber-800">
          {displayDescription}
        </p>

        <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-2">
          <p className="text-xs text-amber-700">
            {ageText(ageMode, {
              junior: 'ゲットした ひ',
              standard: '取得日'
            })}
          </p>
          <p className="text-sm font-semibold text-amber-900">
            {formatDate(badge.awarded_at)}
          </p>
        </div>

        <Link
          href="/kids/badges"
          className="mt-6 rounded-full border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          {ageText(ageMode, {
            junior: 'バッジ いちらんへ',
            standard: 'バッジ一覧へ'
          })}
        </Link>
      </div>
    </main>
  );
}
