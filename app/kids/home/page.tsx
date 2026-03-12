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
    { messages, unreadCount },
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

  const latestMessage = messages[0] ?? null;

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
    <main className="relative mx-auto max-w-xl p-4 pb-8">
      {newBadge && <BadgeCelebration badge={newBadge} />}

      <header className="mb-4 rounded-2xl border border-amber-200 bg-amber-100/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-sm">
              🧒
            </span>
            <h1 className="truncate text-xl font-bold text-amber-900">
              {ageText(ageMode, {
                junior: `${child.display_name} の ほーむ`,
                standard: `${child.display_name} のホーム`
              })}
            </h1>
          </div>
          <form action={kidSignOut}>
            <button className="w-full rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900 transition hover:bg-amber-100 sm:w-auto">
              {ageText(ageMode, { junior: 'おわる', standard: 'ログアウト' })}
            </button>
          </form>
        </div>
      </header>

      {(unreadCount > 0 || activeMission) && (
        <section className="mb-4 space-y-2">
          {unreadCount > 0 && (
            <TrackedLink
              href="/kids/messages"
              eventName="kid_home_notice_click"
              childId={childId}
              target="unread_messages"
              meta={{ age_mode: ageMode }}
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-xs font-semibold text-rose-600">
                  {ageText(ageMode, {
                    junior: '💌 しらせ',
                    standard: '💌 お知らせ'
                  })}
                </p>
                <p className="text-sm font-semibold text-rose-900">
                  {ageText(ageMode, {
                    junior: `みどくメッセージが ${unreadCount} けんあるよ`,
                    standard: `未読メッセージが ${unreadCount} 件あります`
                  })}
                </p>
              </div>
              <span className="rounded-full bg-rose-400 px-3 py-1 text-xs font-bold text-white">
                {ageText(ageMode, {
                  junior: 'よみにいく',
                  standard: '確認する'
                })}
              </span>
            </TrackedLink>
          )}

          {activeMission && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-violet-600">
                🎯 いまのミッション
              </p>
              <p className="text-sm font-semibold text-violet-900">
                {activeMission.title}
              </p>
              {missionDaysLeft !== null && (
                <p className="text-xs text-violet-700">
                  あと {missionDaysLeft} にち
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ナビゲーション: 2×2 カードグリッド */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <TrackedLink
          href="/kids/records/new"
          eventName="kid_home_nav_click"
          childId={childId}
          target="record_new"
          meta={{ age_mode: ageMode }}
          className="relative flex flex-col items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm transition hover:bg-orange-100"
        >
          <span className="text-4xl">✏️</span>
          <span className="text-center text-sm font-medium text-orange-800">
            {ageText(ageMode, {
              junior: 'きろくする',
              standard: 'きょうのきろくをつける'
            })}
          </span>
        </TrackedLink>
        <TrackedLink
          href="/kids/records"
          eventName="kid_home_nav_click"
          childId={childId}
          target="records"
          meta={{ age_mode: ageMode }}
          className="relative flex flex-col items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm transition hover:bg-sky-100"
        >
          <span className="text-4xl">📚</span>
          <span className="text-center text-sm font-medium text-sky-800">
            {ageText(ageMode, {
              junior: 'ほんだな',
              standard: 'ほんだなをみる'
            })}
          </span>
        </TrackedLink>
        <TrackedLink
          href="/kids/calendar"
          eventName="kid_home_nav_click"
          childId={childId}
          target="calendar"
          meta={{ age_mode: ageMode }}
          className="relative flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:bg-amber-100"
        >
          <span className="text-4xl">📅</span>
          <span className="text-center text-sm font-medium text-amber-800">
            {ageText(ageMode, {
              junior: 'カレンダー',
              standard: 'カレンダーをみる'
            })}
          </span>
        </TrackedLink>
        <TrackedLink
          href="/kids/messages"
          eventName="kid_home_nav_click"
          childId={childId}
          target="messages"
          meta={{ age_mode: ageMode }}
          className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 shadow-sm transition ${
            unreadCount > 0
              ? 'border-rose-200 bg-rose-50 hover:bg-rose-100'
              : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
          }`}
        >
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="text-4xl">💌</span>
          <span
            className={`text-center text-sm font-medium ${unreadCount > 0 ? 'text-rose-800' : 'text-orange-800'}`}
          >
            {ageText(ageMode, { junior: 'おてがみ', standard: 'メッセージ' })}
          </span>
        </TrackedLink>
      </div>

      <section className="mb-6 rounded-xl border border-amber-100 bg-white/95 p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {ageText(ageMode, {
              junior: 'さいきん よんだ ほん',
              standard: '最近読んだ本'
            })}
          </h2>
          <Link
            href="/kids/records"
            className="text-sm text-orange-700 underline"
          >
            {ageText(ageMode, {
              junior: 'まえの きろくを みる',
              standard: '過去の記録を見る'
            })}
          </Link>
        </div>
        {recentRows && recentRows.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(recentRows as RecentRow[]).map((row) => {
              const title = row.title ?? 'ふめいなほん';
              return (
                <li key={row.id}>
                  <Link
                    href={`/kids/records/${row.id}`}
                    className="block rounded border border-amber-100 bg-amber-50/30 p-1"
                  >
                    <BookCoverImage
                      src={row.cover_url}
                      alt={title}
                      className="h-24 w-full rounded object-cover"
                      fallbackClassName="flex h-24 w-full items-center justify-center rounded bg-amber-100 text-xs text-amber-700"
                    />
                    <p className="mt-1 line-clamp-2 text-xs text-amber-900">
                      {title}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="text-4xl">📚</span>
            <p className="mt-2 font-semibold text-amber-900">
              {ageText(ageMode, {
                junior: 'まだ きろくが ないよ',
                standard: 'まだ記録がありません'
              })}
            </p>
            <p className="mt-1 text-sm text-amber-700">
              {ageText(ageMode, {
                junior: 'ほんをよんだら きろくしてみよう！',
                standard: '本を読んだら記録してみよう。'
              })}
            </p>
            <Link
              href="/kids/records/new"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
            >
              {ageText(ageMode, {
                junior: '📖 きろくをつける',
                standard: '📖 記録をつける'
              })}
            </Link>
          </div>
        )}
      </section>

      {activeMission && (
        <MissionProgress
          title={activeMission.title}
          icon={activeMission.icon}
          targetValue={activeMission.target_value}
          currentProgress={activeMission.current_progress}
          status={activeMission.status}
          endsAt={activeMission.ends_at}
        />
      )}

      <section className="mb-6 rounded-xl border border-amber-100 bg-white/95 p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">バッジ</h2>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              return (
                <span
                  key={badge.badge_id}
                  className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm text-amber-900"
                >
                  {badge.icon ?? '🏅'} {badge.name ?? badge.badge_id}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="text-4xl">🏅</span>
            <p className="mt-2 font-semibold text-amber-900">
              まだ バッジは ないよ
            </p>
            <p className="mt-1 text-sm text-amber-700">
              1さつ きろくすると はじめてのバッジが もらえるよ！
            </p>
          </div>
        )}
      </section>

      {suggestions.length > 0 && (
        <KidSuggestionsSection suggestions={suggestions} />
      )}

      {latestMessage && (
        <section className="mb-6 rounded-xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-600">
              {ageText(ageMode, {
                junior: '💌 おうちのひとからのメッセージ',
                standard: '💌 おうちのひとからのメッセージ'
              })}
            </p>
            <Link
              href="/kids/messages"
              className="text-xs text-rose-700 underline"
            >
              {ageText(ageMode, {
                junior: 'ぜんぶ みる',
                standard: 'すべて見る'
              })}
            </Link>
          </div>
          <p className="line-clamp-2 text-sm text-rose-900">
            {latestMessage.body}
          </p>
          <p className="mt-1 text-xs text-rose-700">
            {latestMessage.bookTitle}
          </p>
        </section>
      )}
    </main>
  );
}
