import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { getKidMessages } from '@/lib/kids/messages';
import { BadgeCelebration } from '@/components/badge-celebration';
import { MissionProgress } from '@/components/mission-progress';
import { KidSuggestionsSection } from '@/components/kid-suggestions-section';
import { BookCoverImage } from '@/components/book-cover-image';
import { TrackedLink } from '@/components/tracked-link';
import { ageText } from '@/lib/kids/age-text';
import {
  getAgeModeFromProfile,
  type AgeModeOverride
} from '@/lib/kids/age-mode';

type RecentRow = { id: string; title: string | null; cover_url: string | null };
type ChildRow = {
  display_name: string;
  birth_year: number | null;
  age_mode_override: AgeModeOverride | null;
};

type SuggestionRow = {
  id: string;
  created_at: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  cover_url: string | null;
  status: string;
};

function calcDaysLeft(endsAt: string | null | undefined): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function KidsHomePage({
  searchParams
}: {
  searchParams: Promise<{ badge?: string }>;
}) {
  const { childId, supabase } = await requireKidContext();
  const params = await searchParams;

  const [
    { data: childRows },
    { data: recentRows },
    badges,
    { unreadCount },
    { data: suggestionRows },
    { data: missionRows }
  ] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', {
      target_child_id: childId,
      max_rows: 6
    }),
    getChildBadges(),
    getKidMessages(),
    supabase.rpc('get_kid_suggestions', { target_child_id: childId }),
    supabase.rpc('get_kid_active_mission', { target_child_id: childId })
  ]);
  const suggestions = (suggestionRows ?? []) as SuggestionRow[];
  const activeMission =
    missionRows && missionRows.length > 0
      ? (missionRows[0] as {
          title: string;
          icon: string;
          target_value: number;
          current_progress: number;
          status: string;
          ends_at: string;
        })
      : null;

  const child = (childRows?.[0] ?? null) as ChildRow | null;
  if (!child) redirect('/kids/login');

  const ageMode = getAgeModeFromProfile({
    birthYear: child.birth_year,
    ageModeOverride: child.age_mode_override ?? 'auto'
  });

  const newBadge = params.badge
    ? (badges.find((b) => b.badge_id === params.badge) ?? null)
    : null;

  const missionDaysLeft = calcDaysLeft(activeMission?.ends_at);

  return (
    <main className="relative mx-auto max-w-xl px-4 pb-10 pt-4">
      {newBadge && <BadgeCelebration badge={newBadge} ageMode={ageMode} />}

      {/* ヘッダー：コンパクトに、名前とログアウトのみ */}
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-amber-800">
          {child.display_name}
        </h1>
        <form action={kidSignOut}>
          <button className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-500 transition hover:bg-stone-50">
            {ageText(ageMode, { junior: 'おわる', standard: 'ログアウト' })}
          </button>
        </form>
      </header>

      {/* 未読アラート：rose = 注意色。メッセージがある時だけ表示 */}
      {unreadCount > 0 && (
        <TrackedLink
          href="/kids/messages"
          eventName="kid_home_notice_click"
          childId={childId}
          target="unread_messages"
          meta={{ age_mode: ageMode }}
          className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 transition hover:bg-rose-100"
        >
          <div>
            <p className="text-sm font-bold text-rose-700">
              {ageText(ageMode, {
                junior: `💌 メッセージが ${unreadCount} けんあるよ`,
                standard: `💌 未読メッセージが ${unreadCount} 件あります`
              })}
            </p>
            <p className="text-xs text-rose-600">
              {ageText(ageMode, {
                junior: 'おうちのひとからだよ',
                standard: 'おうちの人からのメッセージです'
              })}
            </p>
          </div>
          <span className="ml-3 flex-shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
            {ageText(ageMode, { junior: 'よむ →', standard: '確認 →' })}
          </span>
        </TrackedLink>
      )}

      {/* 主役CTA：「記録する」を画面の主役にする */}
      <TrackedLink
        href="/kids/records/new"
        eventName="kid_home_nav_click"
        childId={childId}
        target="record_new"
        meta={{ age_mode: ageMode }}
        className="mb-4 flex items-center justify-between rounded-2xl bg-orange-600 px-5 py-5 shadow-md transition hover:bg-orange-700 active:scale-[0.98]"
      >
        <div>
          <p className="text-xl font-bold text-white">
            {ageText(ageMode, {
              junior: 'きろくする',
              standard: '今日の記録をつける'
            })}
          </p>
          <p className="mt-0.5 text-sm text-orange-100">
            {ageText(ageMode, {
              junior: 'よんだほんをとうろくしよう',
              standard: '読んだ本を登録しよう'
            })}
          </p>
        </div>
        <span className="text-4xl" aria-hidden>
          ✏️
        </span>
      </TrackedLink>

      {/* サブナビ：3つの等価リンク（主役CTAより明確に格下） */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <TrackedLink
          href="/kids/records"
          eventName="kid_home_nav_click"
          childId={childId}
          target="records"
          meta={{ age_mode: ageMode }}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white py-3 shadow-sm transition hover:bg-stone-50"
        >
          <span className="text-2xl" aria-hidden>
            📚
          </span>
          <span className="text-xs font-medium text-stone-600">
            {ageText(ageMode, { junior: 'よもっと！', standard: '本棚' })}
          </span>
        </TrackedLink>

        <TrackedLink
          href="/kids/calendar"
          eventName="kid_home_nav_click"
          childId={childId}
          target="calendar"
          meta={{ age_mode: ageMode }}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 bg-white py-3 shadow-sm transition hover:bg-stone-50"
        >
          <span className="text-2xl" aria-hidden>
            📅
          </span>
          <span className="text-xs font-medium text-stone-600">
            {ageText(ageMode, {
              junior: 'カレンダー',
              standard: 'カレンダー'
            })}
          </span>
        </TrackedLink>

        {/* メッセージ：未読があればrose色で区別（注意色の一貫した使用） */}
        <TrackedLink
          href="/kids/messages"
          eventName="kid_home_nav_click"
          childId={childId}
          target="messages"
          meta={{ age_mode: ageMode }}
          className={`relative flex flex-col items-center gap-1.5 rounded-xl border py-3 shadow-sm transition ${
            unreadCount > 0
              ? 'border-rose-200 bg-rose-50 hover:bg-rose-100'
              : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="text-2xl" aria-hidden>
            💌
          </span>
          <span
            className={`text-xs font-medium ${unreadCount > 0 ? 'text-rose-700' : 'text-stone-600'}`}
          >
            {ageText(ageMode, { junior: 'おてがみ', standard: 'メッセージ' })}
          </span>
        </TrackedLink>
      </div>

      {/* ミッション：indigo = ミッション専用色 */}
      {activeMission && (
        <MissionProgress
          ageMode={ageMode}
          title={activeMission.title}
          icon={activeMission.icon}
          targetValue={activeMission.target_value}
          currentProgress={activeMission.current_progress}
          status={activeMission.status}
          endsAt={activeMission.ends_at}
        />
      )}

      {/* ミッション告知（ホーム上部にも重複して表示されていた分を整理） */}
      {!activeMission && missionDaysLeft === null && null}

      {/* 最近読んだ本 */}
      <section className="mb-6 kid-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-500">
            {ageText(ageMode, {
              junior: '📚 さいきんよんだほん',
              standard: '📚 最近読んだ本'
            })}
          </h2>
          <Link href="/kids/records" className="kid-link">
            {ageText(ageMode, {
              junior: 'ぜんぶみる',
              standard: 'すべて見る'
            })}
          </Link>
        </div>
        {recentRows && recentRows.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(recentRows as RecentRow[]).map((row) => {
              const title = row.title ?? 'ふめいなほん';
              return (
                <Link
                  key={row.id}
                  href={`/kids/records/${row.id}`}
                  className="flex-shrink-0 transition hover:-translate-y-0.5"
                  title={title}
                >
                  <BookCoverImage
                    src={row.cover_url}
                    alt={title}
                    className="h-20 w-14 rounded object-cover shadow-sm"
                    fallbackClassName="flex h-20 w-14 items-center justify-center rounded bg-amber-100 text-xs text-amber-700"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-5 text-center">
            <span className="text-3xl" aria-hidden>
              📚
            </span>
            <p className="mt-2 text-sm font-medium text-stone-600">
              {ageText(ageMode, {
                junior: 'まだきろくがないよ',
                standard: 'まだ記録がありません'
              })}
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              {ageText(ageMode, {
                junior: 'ほんをよんだらきろくしてみよう！',
                standard: '本を読んだら記録してみよう。'
              })}
            </p>
          </div>
        )}
      </section>

      {/* バッジ：ゼロ件の場合は非表示（空状態を見せない） */}
      {badges.length > 0 && (
        <section className="mb-6 kid-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-500">
              {ageText(ageMode, {
                junior: '🏅 ゲットしたバッジ',
                standard: '🏅 ゲットしたバッジ'
              })}
            </h2>
            <Link href="/kids/badges" className="kid-link">
              {ageText(ageMode, {
                junior: 'ぜんぶみる',
                standard: 'すべて見る'
              })}
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {badges.slice(0, 6).map((badge) => {
              const displayName =
                ageMode === 'junior' && badge.junior_name
                  ? badge.junior_name
                  : badge.name ?? badge.badge_id;
              return (
                <Link
                  key={badge.badge_id}
                  href={`/kids/badges/${badge.badge_id}`}
                  className="flex flex-shrink-0 flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 transition hover:bg-amber-100"
                >
                  <span className="text-2xl">{badge.icon ?? '🏅'}</span>
                  <span className="whitespace-nowrap text-xs text-amber-800">
                    {displayName}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* おすすめ本 */}
      {suggestions.length > 0 && (
        <KidSuggestionsSection suggestions={suggestions} />
      )}
    </main>
  );
}
