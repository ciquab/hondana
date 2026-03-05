import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKidSessionChildId } from '@/lib/kids/session';
import { getChildBadges } from '@/lib/kids/badges';
import { getKidMessages } from '@/lib/kids/messages';

type RecentRow = { id: string; title: string | null; cover_url: string | null };

export default async function KidsHomePage() {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = createAdminClient();
  const [{ data: childRows }, { data: recentRows }, badges, { unreadCount }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', { target_child_id: childId, max_rows: 6 }),
    getChildBadges(childId),
    getKidMessages(childId)
  ]);

  const child = childRows?.[0];
  if (!child) redirect('/kids/login');

  return (
    <main className="mx-auto max-w-xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{child.display_name} のホーム</h1>
        <form action={kidSignOut}>
          <button className="rounded border px-3 py-1 text-sm">ログアウト</button>
        </form>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/kids/records/new" className="inline-block rounded bg-emerald-600 px-4 py-2 text-white">
          きょうの記録をつける
        </Link>
        <Link href="/kids/records" className="inline-block rounded bg-indigo-600 px-4 py-2 text-white">
          本だなを見る
        </Link>
        <Link href="/kids/calendar" className="inline-block rounded bg-violet-600 px-4 py-2 text-white">
          カレンダーを見る
        </Link>
        <Link href="/kids/messages" className="inline-block rounded bg-rose-600 px-4 py-2 text-white">
          メッセージ {unreadCount > 0 ? `(${unreadCount})` : ''}
        </Link>
      </div>

      <section className="mb-6 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">バッジ</h2>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 4).map((badge) => {
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
          <ul className="grid grid-cols-3 gap-2">
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
