import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { requireKidContext } from '@/lib/kids/client';
import { getChildBadges } from '@/lib/kids/badges';
import { getKidMessages } from '@/lib/kids/messages';
import { BadgeCelebration } from '@/components/badge-celebration';

type RecentRow = { id: string; title: string | null; cover_url: string | null };

export default async function KidsHomePage({
  searchParams,
}: {
  searchParams: Promise<{ badge?: string }>;
}) {
  const { childId, supabase } = await requireKidContext();
  const params = await searchParams;

  const [{ data: childRows }, { data: recentRows }, badges, { unreadCount }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', { target_child_id: childId, max_rows: 6 }),
    getChildBadges(),
    getKidMessages()
  ]);

  const child = childRows?.[0];
  if (!child) redirect('/kids/login');

  const newBadge = params.badge
    ? badges.find((b) => b.badge_id === params.badge) ?? null
    : null;

  return (
    <main className="mx-auto max-w-xl p-4">
      {newBadge && <BadgeCelebration badge={newBadge} />}

      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{child.display_name} のホーム</h1>
        <form action={kidSignOut}>
          <button className="rounded border px-3 py-1 text-sm">ログアウト</button>
        </form>
      </header>

      {/* ナビゲーション: 2×2 カードグリッド */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/kids/records/new"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-4 shadow-sm transition hover:bg-emerald-100 border border-emerald-200"
        >
          <span className="text-4xl">✏️</span>
          <span className="text-sm font-medium text-emerald-800 text-center">きょうの記録をつける</span>
        </Link>
        <Link
          href="/kids/records"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-indigo-50 p-4 shadow-sm transition hover:bg-indigo-100 border border-indigo-200"
        >
          <span className="text-4xl">📚</span>
          <span className="text-sm font-medium text-indigo-800 text-center">本だなを見る</span>
        </Link>
        <Link
          href="/kids/calendar"
          className="relative flex flex-col items-center gap-2 rounded-2xl bg-violet-50 p-4 shadow-sm transition hover:bg-violet-100 border border-violet-200"
        >
          <span className="text-4xl">📅</span>
          <span className="text-sm font-medium text-violet-800 text-center">カレンダーを見る</span>
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
          <span className={`text-sm font-medium text-center ${unreadCount > 0 ? 'text-rose-800' : 'text-slate-700'}`}>
            メッセージ
          </span>
        </Link>
      </div>

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">バッジ</h2>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              return (
                <span key={badge.badge_id} className="rounded-full bg-amber-100 px-3 py-1 text-sm">
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
          <h2 className="text-lg font-semibold">さいきん読んだ本</h2>
          <Link href="/kids/records" className="text-sm text-blue-600 underline">
            過去の記録をひらく
          </Link>
        </div>
        {recentRows && recentRows.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(recentRows as RecentRow[]).map((row) => {
              const title = row.title ?? '不明な本';
              return (
                <li key={row.id}>
                  <Link href={`/kids/records/${row.id}`} className="block rounded border p-1">
                    {row.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.cover_url} alt={title} className="h-24 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                        No cover
                      </div>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-slate-700">{title}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">まだ記録がありません。</p>
        )}
      </section>
    </main>
  );
}
