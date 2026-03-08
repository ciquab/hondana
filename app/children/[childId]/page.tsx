import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRecordsForChild, getGenreBreakdownForChild, getCommentedRecordIds } from '@/lib/db/records';
import { STATUS_LABELS, type ReadingStatus } from '@/lib/validations/record';
import { SuggestBookForm } from '@/components/suggest-book-form';

const GENRE_LABELS: Record<string, { emoji: string; label: string }> = {
  story:        { emoji: '📖', label: '物語・小説' },
  zukan:        { emoji: '🔬', label: '図鑑・科学' },
  manga:        { emoji: '🎭', label: 'マンガ' },
  picture_book: { emoji: '🖼️', label: '絵本・詩' },
  other:        { emoji: '📚', label: 'その他' },
};

const GENRE_ORDER = ['story', 'zukan', 'manga', 'picture_book', 'other'];

function GenreBreakdownChart({ breakdown }: { breakdown: Record<string, number> }) {
  const maxCount = Math.max(...Object.values(breakdown), 1);
  return (
    <div className="max-w-xs space-y-2">
      {GENRE_ORDER.map((key) => {
        const count = breakdown[key] ?? 0;
        const { emoji, label } = GENRE_LABELS[key] ?? { emoji: '📚', label: key };
        const pct = Math.round((count / maxCount) * 100);
        return (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="w-28 flex-shrink-0 text-slate-600">
              {emoji} {label}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded transition-all ${count === 0 ? 'bg-slate-200' : 'bg-amber-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`w-10 text-right font-medium ${count === 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {count} 冊
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  params: Promise<{ childId: string }>;
};

type BookInfo = {
  title: string;
  author: string | null;
  cover_url: string | null;
};

type FinishedBookEntry = {
  recordId: string;
  book: BookInfo;
};

function toBookInfo(books: unknown): BookInfo | null {
  if (!books || typeof books !== 'object' || Array.isArray(books)) return null;
  const b = books as Record<string, unknown>;
  if (typeof b.title !== 'string') return null;
  return {
    title: b.title,
    author: typeof b.author === 'string' ? b.author : null,
    cover_url: typeof b.cover_url === 'string' ? b.cover_url : null,
  };
}

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

  const [records, genreBreakdown] = await Promise.all([
    getRecordsForChild(childId),
    getGenreBreakdownForChild(childId),
  ]);

  const commentedRecordIds = await getCommentedRecordIds(records.map((r) => r.id));

  const grouped = {
    reading: records.filter((r) => r.status === 'reading'),
    want_to_read: records.filter((r) => r.status === 'want_to_read'),
    finished: records.filter((r) => r.status === 'finished')
  };

  const sectionOrder: ReadingStatus[] = ['reading', 'want_to_read', 'finished'];

  // Collect books for bookshelf visual
  const finishedBooks = grouped.finished
    .map((r) => {
      const book = toBookInfo(r.books);
      return book ? { recordId: r.id, book } : null;
    })
    .filter((e): e is FinishedBookEntry => e !== null);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 underline">
            ダッシュボードへ戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{child.display_name} の読書記録</h1>
        </div>
        <div className="flex items-center gap-2">
          <SuggestBookForm childId={childId} />
          <Link
            href={`/children/${childId}/records/new`}
            className="rounded bg-emerald-600 px-4 py-2 text-white"
          >
            記録を追加
          </Link>
        </div>
      </div>

      {/* Bookshelf visual */}
      {finishedBooks.length > 0 && (
        <section className="mb-6 rounded-xl bg-amber-50 p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold text-amber-800">
            {child.display_name} の本棚（読了 {finishedBooks.length}冊）
          </h2>
          <div className="flex flex-wrap gap-2">
            {finishedBooks.map(({ recordId, book }, i) =>
              book.cover_url ? (
                <Link
                  key={i}
                  href={`/records/${recordId}`}
                  title={book.title}
                  className="block transition hover:scale-105"
                >
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="h-24 rounded shadow"
                  />
                </Link>
              ) : (
                <Link
                  key={i}
                  href={`/records/${recordId}`}
                  title={book.title}
                  className="flex h-24 w-16 items-center justify-center rounded bg-slate-200 p-1 text-center shadow transition hover:scale-105"
                >
                  <span className="text-[10px] leading-tight text-slate-600">
                    {book.title.length > 12 ? book.title.slice(0, 12) + '…' : book.title}
                  </span>
                </Link>
              )
            )}
          </div>
          {/* Shelf line */}
          <div className="mt-2 h-1.5 rounded bg-amber-700/30" />
        </section>
      )}

      {/* Genre breakdown chart */}
      {Object.keys(genreBreakdown).length > 0 && (
        <section className="mb-6 rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">ジャンル内訳</h2>
          <GenreBreakdownChart breakdown={genreBreakdown} />
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
                    const book = toBookInfo(record.books);
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{book?.title ?? '不明な本'}</p>
                            <p className="text-sm text-slate-500">
                              {book?.author ?? '著者不明'}
                              {record.finished_on && ` ・ 読了: ${record.finished_on}`}
                            </p>
                          </div>
                          {commentedRecordIds.has(record.id) ? (
                            <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                              💬 コメント済み
                            </span>
                          ) : (
                            <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                              ✏️ コメントする
                            </span>
                          )}
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
