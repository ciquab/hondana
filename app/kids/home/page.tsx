import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { getKidMessages } from '@/lib/kids/messages';
import { BadgeCelebration } from '@/components/badge-celebration';

type RecentRow = { id: string; title: string | null; cover_url: string | null };
type SuggestionRow = {
  id: string;
  created_at: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  status: string;
};

const NO_COVER_COLORS = [
  { bg: '#FDE68A', text: '#92400E' },
  { bg: '#BBF7D0', text: '#065F46' },
  { bg: '#BFDBFE', text: '#1E3A8A' },
  { bg: '#DDD6FE', text: '#4C1D95' },
  { bg: '#FBCFE8', text: '#831843' },
  { bg: '#FED7AA', text: '#7C2D12' }
];

function pickColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return NO_COVER_COLORS[hash % NO_COVER_COLORS.length];
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
    { data: suggestionRows }
  ] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', {
      target_child_id: childId,
      max_rows: 6
    }),
    getChildBadges(),
    getKidMessages(),
    supabase.rpc('get_kid_suggestions', { target_child_id: childId })
  ]);
  const suggestions = (suggestionRows ?? []) as SuggestionRow[];

  const latestMessage = messages[0] ?? null;

  const child = childRows?.[0];
  if (!child) redirect('/kids/login');

  const newBadge = params.badge
    ? (badges.find((b) => b.badge_id === params.badge) ?? null)
    : null;

  return (
    <main className="relative mx-auto max-w-xl p-4 pb-28">
      {newBadge && <BadgeCelebration badge={newBadge} />}

      <header className="mb-4 flex items-center justify-between rounded-2xl bg-amber-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            🧒
          </span>
          <h1 className="text-xl font-bold text-amber-900">
            {child.display_name} のホーム
          </h1>
        </div>
        <form action={kidSignOut}>
          <button className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-amber-800">
            ログアウト
          </button>
        </form>
      </header>

      {/* ナビゲーション: 2×2 カードグリッド */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/kids/records/new"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-4 shadow-sm transition hover:bg-emerald-100 border border-emerald-200"
        >
          <span className="text-4xl">✏️</span>
          <span className="text-sm font-medium text-emerald-800 text-center">
            きょうのきろくをつける
          </span>
        </Link>
        <Link
          href="/kids/records"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-indigo-50 p-4 shadow-sm transition hover:bg-indigo-100 border border-indigo-200"
        >
          <span className="text-4xl">📚</span>
          <span className="text-sm font-medium text-indigo-800 text-center">
            ほんだなをみる
          </span>
        </Link>
        <Link
          href="/kids/calendar"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-violet-50 p-4 shadow-sm transition hover:bg-violet-100 border border-violet-200"
        >
          <span className="text-4xl">📅</span>
          <span className="text-sm font-medium text-violet-800 text-center">
            カレンダーをみる
          </span>
        </Link>
        <Link
          href="/kids/messages"
          className={`relative flex flex-col items-center gap-2 rounded-2xl p-4 shadow-sm transition border ${
            unreadCount > 0
              ? 'bg-rose-50 border-rose-200 hover:bg-rose-100'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="text-4xl">💌</span>
          <span
            className={`text-sm font-medium text-center ${unreadCount > 0 ? 'text-rose-800' : 'text-slate-700'}`}
          >
            メッセージ
          </span>
        </Link>
      </div>

      {suggestions.length > 0 && (
        <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="mb-2 text-xs font-semibold text-orange-700">
            📚 おとなからのおすすめ
          </p>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {suggestions.map((s) => {
              const title = s.title ?? 'ほん';
              const { bg, text } = pickColor(s.id);
              return (
                <li key={s.id} className="flex-shrink-0">
                  {s.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.cover_url}
                      alt={title}
                      className="h-20 w-14 rounded object-cover shadow"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-14 items-center justify-center overflow-hidden rounded shadow"
                      style={{ backgroundColor: bg }}
                    >
                      <span
                        className="text-[10px] font-medium leading-tight"
                        style={{
                          writingMode: 'vertical-rl',
                          color: text,
                          maxHeight: '4.5rem',
                          overflow: 'hidden'
                        }}
                      >
                        {title.length > 14 ? `${title.slice(0, 14)}…` : title}
                      </span>
                    </div>
                  )}
                  <p className="mt-1 w-14 truncate text-center text-[10px] text-orange-800">
                    {title}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {latestMessage && (
        <section className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-rose-600">
              💌 おとなからのメッセージ
            </p>
            <Link
              href="/kids/messages"
              className="text-xs text-rose-500 underline"
            >
              ぜんぶみる
            </Link>
          </div>
          <p className="text-sm text-rose-900 line-clamp-2">
            {latestMessage.body}
          </p>
          <p className="mt-1 text-xs text-rose-400">
            {latestMessage.bookTitle}
          </p>
        </section>
      )}

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">バッジ</h2>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              return (
                <span
                  key={badge.badge_id}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm"
                >
                  {badge.icon ?? '🏅'} {badge.name ?? badge.badge_id}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">まだバッジはありません。</p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">さいきんよんだほん</h2>
          <Link
            href="/kids/records"
            className="text-sm text-blue-600 underline"
          >
            まえのきろくをひらく
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
                    className="block rounded border p-1"
                  >
                    {row.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cover_url}
                        alt={title}
                        className="h-24 w-full rounded object-cover"
                      />
                    ) : (
                      (() => {
                        const { bg, text } = pickColor(row.id);
                        return (
                          <div
                            className="flex h-24 w-full items-center justify-center overflow-hidden rounded"
                            style={{ backgroundColor: bg }}
                          >
                            <span
                              className="text-[10px] font-medium leading-tight"
                              style={{
                                writingMode: 'vertical-rl',
                                color: text,
                                maxHeight: '5.5rem',
                                overflow: 'hidden'
                              }}
                            >
                              {title.length > 16
                                ? `${title.slice(0, 16)}…`
                                : title}
                            </span>
                          </div>
                        );
                      })()
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                      {title}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">まだきろくがありません。</p>
        )}
      </section>

      {/* とうろく FAB */}
      <Link
        href="/kids/records/new"
        className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600 active:scale-95"
        style={{ maxWidth: 'calc(100vw - 2rem)' }}
      >
        <span>📷</span>
        <span>ほんを とうろくする</span>
      </Link>
    </main>
  );
}
