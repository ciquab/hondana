import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRecordsForChild } from '@/lib/db/records';
import { STATUS_LABELS, type ReadingStatus } from '@/lib/validations/record';

type Props = {
  params: Promise<{ childId: string }>;
};

type BookInfo = {
  title: string;
  author?: string;
  cover_url?: string | null;
};

export default async function ChildRecordsPage({ params }: Props) {
  const { childId } = await params;

  const supabase = await createClient();

  // Verify child exists and belongs to user's family
  const { data: allowed } = await supabase.rpc('is_child_in_my_family', {
    target_child_id: childId
  });

  if (!allowed) notFound();

  const { data: child } = await supabase
    .from('children')
    .select('id, display_name')
    .eq('id', childId)
    .single();

  if (!child) notFound();

  const records = await getRecordsForChild(childId);

  const grouped = {
    reading: records.filter((r) => r.status === 'reading'),
    want_to_read: records.filter((r) => r.status === 'want_to_read'),
    finished: records.filter((r) => r.status === 'finished')
  };

  const sectionOrder: ReadingStatus[] = ['reading', 'want_to_read', 'finished'];

  // Collect books with covers for bookshelf visual
  const finishedBooks = grouped.finished
    .map((r) => r.books as unknown as BookInfo | null)
    .filter((b): b is BookInfo => b !== null);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 underline">
            ダッシュボードへ戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{child.display_name} の読書記録</h1>
        </div>
        <Link
          href={`/children/${childId}/records/new`}
          className="rounded bg-emerald-600 px-4 py-2 text-white"
        >
          記録を追加
        </Link>
      </div>

      {/* Bookshelf visual */}
      {finishedBooks.length > 0 && (
        <section className="mb-6 rounded-xl bg-amber-50 p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">
            {child.display_name} の本棚（読了 {finishedBooks.length}冊）
          </h2>
          <div className="flex flex-wrap gap-2">
            {finishedBooks.map((book, i) =>
              book.cover_url ? (
                <img
                  key={i}
                  src={book.cover_url}
                  alt={book.title}
                  title={book.title}
                  className="h-24 rounded shadow transition hover:scale-105"
                />
              ) : (
                <div
                  key={i}
                  title={book.title}
                  className="flex h-24 w-16 items-center justify-center rounded bg-slate-200 p-1 text-center shadow"
                >
                  <span className="text-[10px] leading-tight text-slate-600">
                    {book.title.length > 12 ? book.title.slice(0, 12) + '…' : book.title}
                  </span>
                </div>
              )
            )}
          </div>
          {/* Shelf line */}
          <div className="mt-2 h-1.5 rounded bg-amber-700/30" />
        </section>
      )}

      {records.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow">
          <p className="text-slate-600">まだ読書記録がありません。</p>
          <Link
            href={`/children/${childId}/records/new`}
            className="mt-3 inline-block text-blue-600 underline"
          >
            最初の記録を追加する
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sectionOrder.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="mb-2 text-lg font-semibold">
                  {STATUS_LABELS[status]}（{items.length}）
                </h2>
                <ul className="space-y-2">
                  {items.map((record) => {
                    const book = record.books as unknown as BookInfo | null;
                    return (
                      <li key={record.id}>
                        <Link
                          href={`/records/${record.id}`}
                          className="flex items-center gap-3 rounded-lg bg-white p-4 shadow transition hover:bg-slate-50"
                        >
                          {book?.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt=""
                              className="h-14 w-10 flex-shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                              No img
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium">{book?.title ?? '不明な本'}</p>
                            <p className="text-sm text-slate-500">
                              {book?.author ?? '著者不明'}
                              {record.finished_on && ` ・ 読了: ${record.finished_on}`}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
