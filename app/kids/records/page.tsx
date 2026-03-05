import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';

type BookRow = {
  id: string;
  created_at: string;
  title: string | null;
  cover_url: string | null;
};

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export default async function KidsRecordsPage() {
  const { childId, supabase } = await requireKidContext();
  const [{ data: childRows }, { data: recordRows }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', { target_child_id: childId, max_rows: 120 })
  ]);

  const child = childRows?.[0];

  if (!child) redirect('/kids/login');

  const records = (recordRows ?? []) as BookRow[];
  const shelfRows = chunkRows(records, 4);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>

      <section className="rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-4 shadow">
        <h1 className="text-2xl font-bold text-amber-900">{child.display_name} の本だな</h1>

        {records.length === 0 ? (
          <div className="mt-4 rounded-xl bg-white/80 p-5 text-sm text-slate-700">
            まだ読書記録がありません。まずは「きょうの記録をつける」からはじめよう！
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-amber-900">これまでの読書記録 {records.length} 件</p>

            <div className="mt-4 space-y-4">
              {shelfRows.map((row, rowIndex) => (
                <div key={rowIndex} className="relative rounded-lg bg-amber-100/70 px-3 pb-4 pt-3">
                  <div className="flex min-h-48 items-end gap-3">
                    {row.map((record) => {
                      const title = record.title ?? 'ふめいな本';
                      const cover = record.cover_url ?? null;

                      return (
                        <Link
                          key={record.id}
                          href={`/kids/records/${record.id}`}
                          title={title}
                          className="relative w-20 flex-shrink-0 rounded-md p-1 transition hover:-translate-y-1"
                        >
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={title} className="h-32 w-full rounded object-cover shadow-md" />
                          ) : (
                            <div className="flex h-32 w-full items-center justify-center rounded bg-indigo-100 p-1 text-center text-[11px] leading-tight text-indigo-700 shadow-md">
                              {title.length > 22 ? `${title.slice(0, 22)}…` : title}
                            </div>
                          )}

                          <div className="pointer-events-none absolute -bottom-3 left-1 right-1 rounded-md bg-white/95 px-1 py-1 shadow">
                            <p className="line-clamp-2 h-8 text-center text-[10px] leading-4 text-slate-700">{title}</p>
                          </div>
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
