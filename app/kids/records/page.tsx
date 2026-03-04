import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getKidSessionChildId } from '@/lib/kids/session';

type BookRow = {
  id: string;
  created_at: string;
  books:
    | { title?: string; cover_url?: string | null }
    | { title?: string; cover_url?: string | null }[]
    | null;
};

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

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
      .limit(120)
  ]);

  const shelfRows = chunkRows((records ?? []) as BookRow[], 4);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>

      <section className="rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-4 shadow">
        <h1 className="text-2xl font-bold text-amber-900">{child?.display_name ?? 'こども'} の本だな</h1>
        <p className="mt-1 text-sm text-amber-800">ほんものの本だなみたいに、よんだ本をならべたよ！</p>

        {!records || records.length === 0 ? (
          <div className="mt-4 rounded-xl bg-white/80 p-5 text-sm text-slate-700">
            まだ読書記録がありません。まずは「きょうの記録をつける」からはじめよう！
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-amber-900">これまでの読書記録 {records.length} 件</p>

            <div className="mt-4 space-y-4">
              {shelfRows.map((row, rowIndex) => (
                <div key={rowIndex} className="relative rounded-lg bg-amber-100/70 px-3 pb-4 pt-3">
                  <div className="flex min-h-44 items-end gap-3">
                    {row.map((record) => {
                      const detail = Array.isArray(record.books) ? record.books[0] : record.books;
                      const title = detail?.title ?? 'ふめいな本';
                      const cover = detail?.cover_url ?? null;

                      return (
                        <Link
                          key={record.id}
                          href={`/records/${record.id}`}
                          title={title}
                          className="w-20 flex-shrink-0 rounded-md p-1 transition hover:-translate-y-1"
                        >
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={title} className="h-32 w-full rounded object-cover shadow-md" />
                          ) : (
                            <div className="flex h-32 w-full items-center justify-center rounded bg-indigo-100 p-1 text-center text-[11px] leading-tight text-indigo-700 shadow-md">
                              {title.length > 22 ? `${title.slice(0, 22)}…` : title}
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-700">{title}</p>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="absolute bottom-0 left-2 right-2 h-2 rounded bg-amber-800/60" />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
