import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { createClient } from '@/lib/supabase/server';
import { getKidSessionChildId } from '@/lib/kids/session';
import { getChildBadges } from '@/lib/kids/badges';
import { getKidMessages } from '@/lib/kids/messages';

export default async function KidsHomePage() {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc('is_child_in_my_family', {
    target_child_id: childId
  });

  if (!allowed) redirect('/kids/login');

  const { data: child } = await supabase
    .from('children')
    .select('id, display_name')
    .eq('id', childId)
    .single();

  if (!child) redirect('/kids/login');

  const [{ data: recent }, badges, { unreadCount }] = await Promise.all([
    supabase
    .from('reading_records')
    .select('id, created_at, books(title)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(5),
    getChildBadges(childId),
    getKidMessages(childId)
  ]);

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
              const detail = badge.badges as
                | { icon?: string; name?: string }
                | { icon?: string; name?: string }[]
                | null;
              const info = Array.isArray(detail) ? detail[0] : detail;
              return (
                <span key={badge.badge_id} className="rounded-full bg-amber-100 px-3 py-1 text-sm">
                  {info?.icon ?? '🏅'} {info?.name ?? badge.badge_id}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">まだバッジはありません。</p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">さいきん読んだ本</h2>
        {recent && recent.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-700">
            {recent.map((row) => (
              <li key={row.id}>・{(row.books as { title?: string } | null)?.title ?? '不明な本'}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">まだ記録がありません。</p>
        )}
      </section>
    </main>
  );
}
