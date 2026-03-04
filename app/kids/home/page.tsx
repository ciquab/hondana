import Link from 'next/link';
import { redirect } from 'next/navigation';
import { kidSignOut } from '@/app/actions/kid-auth';
import { createClient } from '@/lib/supabase/server';
import { getKidSessionChildId } from '@/lib/kids/session';

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

  const { data: recent } = await supabase
    .from('reading_records')
    .select('id, created_at, books(title)')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto max-w-xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{child.display_name} のホーム</h1>
        <form action={kidSignOut}>
          <button className="rounded border px-3 py-1 text-sm">ログアウト</button>
        </form>
      </header>

      <div className="mb-4">
        <Link href="/kids/records/new" className="inline-block rounded bg-emerald-600 px-4 py-2 text-white">
          きょうの記録をつける
        </Link>
      </div>

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
