import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKidSessionChildId } from '@/lib/kids/session';

export default async function KidsRecordsPage() {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc('is_child_in_my_family', {
    target_child_id: childId
  });

  if (!allowed) redirect('/kids/login');

  const [{ data: child }, { data: records }] = await Promise.all([
    supabase.from('children').select('display_name').eq('id', childId).single(),
    supabase
      .from('reading_records')
      .select('id, created_at, books(title, cover_url)')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(100)
  ]);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{child?.display_name ?? 'こども'} の本だな</h1>

      {!records || records.length === 0 ? (
        <div className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow">
          まだ読書記録がありません。まずは「きょうの記録をつける」からはじめよう！
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">これまでの読書記録 {records.length} 件</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {records.map((record) => {
              const book = record.books as
                | { title?: string; cover_url?: string | null }
                | { title?: string; cover_url?: string | null }[]
                | null;
              const info = Array.isArray(book) ? book[0] : book;
              const title = info?.title ?? '不明な本';
              const cover = info?.cover_url ?? null;

              return (
                <li key={record.id}>
                  <Link href={`/records/${record.id}`} className="block rounded-lg border bg-white p-2 shadow-sm">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={title} className="mb-2 h-36 w-full rounded object-cover" />
                    ) : (
                      <div className="mb-2 flex h-36 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-500">
                        No cover
                      </div>
                    )}
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(record.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
