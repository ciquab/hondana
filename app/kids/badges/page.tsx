import Link from 'next/link';
import { AppTopNav } from '@/components/app-top-nav';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { ageText } from '@/lib/kids/age-text';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

function formatDate(iso: string, ageMode: 'junior' | 'standard'): string {
  const d = new Date(iso);
  return ageMode === 'junior'
    ? `${d.getFullYear()}ねん${d.getMonth() + 1}がつ${d.getDate()}にち`
    : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function BadgeListPage() {
  const { childId, supabase } = await requireKidContext();

  const [badges, ageMode] = await Promise.all([
    getChildBadges(),
    resolveKidAgeMode(supabase, childId)
  ]);

  return (
    <main className="mx-auto max-w-xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: 'バッジ いちらん',
          standard: 'バッジ一覧'
        })}
        backHref="/kids/home"
        backLabel={ageText(ageMode, { junior: 'ホーム', standard: 'ホーム' })}
      />

      {badges.length > 0 ? (
        <ul className="space-y-3">
          {badges.map((badge) => {
            const displayName =
              ageMode === 'junior' && badge.junior_name
                ? badge.junior_name
                : (badge.name ?? badge.badge_id);
            const displayDescription =
              ageMode === 'junior' && badge.junior_description
                ? badge.junior_description
                : (badge.description ?? '');

            return (
              <li key={badge.badge_id}>
                <Link
                  href={`/kids/badges/${badge.badge_id}`}
                  className="flex items-start gap-3 rounded-xl border border-sky-200 bg-white/95 p-4 shadow-sm transition hover:bg-sky-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-2xl">
                    {badge.icon ?? '🏅'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sky-900">{displayName}</p>
                    <p className="mt-0.5 text-sm text-sky-800">
                      {displayDescription}
                    </p>
                    <p className="mt-1 text-xs text-sky-600">
                      {formatDate(badge.awarded_at, ageMode)}
                    </p>
                  </div>
                  <span className="mt-1 text-sky-400" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-sky-100 bg-white/95 py-12 text-center shadow">
          <span className="text-5xl">🏅</span>
          <p className="mt-3 font-semibold text-sky-900">
            {ageText(ageMode, {
              junior: 'まだ バッジは ないよ',
              standard: 'まだバッジはありません'
            })}
          </p>
          <p className="mt-1 text-sm text-sky-700">
            {ageText(ageMode, {
              junior: 'ほんを よんで きろくすると バッジが もらえるよ！',
              standard: '本を読んで記録するとバッジがもらえます。'
            })}
          </p>
          <Link
            href="/kids/records/new"
            className="btn-primary mt-4 inline-flex items-center gap-1 rounded-full px-5"
          >
            {ageText(ageMode, {
              junior: '📖 きろくする',
              standard: '📖 記録をつける'
            })}
          </Link>
        </div>
      )}
    </main>
  );
}
