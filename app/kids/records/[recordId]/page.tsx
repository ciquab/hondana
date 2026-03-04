import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKidSessionChildId } from '@/lib/kids/session';

export default async function KidRecordDetailPage({
  params
}: {
  params: Promise<{ recordId: string }>;
}) {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const { recordId } = await params;
  const supabase = createAdminClient();

  const { data: record } = await supabase
    .from('reading_records')
    .select('id, created_at, status, memo, finished_on, books(title, author, isbn13, cover_url), children(display_name)')
    .eq('id', recordId)
    .eq('child_id', childId)
    .maybeSingle();

  if (!record) notFound();

  const book = Array.isArray(record.books) ? record.books[0] : record.books;
  const child = Array.isArray(record.children) ? record.children[0] : record.children;

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/kids/records" className="text-sm text-blue-600 underline">
        本だなへ戻る
      </Link>

      <div className="mt-3 rounded-xl bg-white p-5 shadow">
        <h1 className="text-xl font-bold">{book?.title ?? '本のタイトル不明'}</h1>
        <p className="mt-1 text-sm text-slate-600">{child?.display_name ?? 'こども'} の記録</p>

        {book?.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title ?? '表紙'} className="mt-3 h-48 w-32 rounded object-cover shadow" />
        ) : null}

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="font-medium text-slate-700">著者</dt>
            <dd className="text-slate-600">{book?.author ?? '不明'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">ISBN</dt>
            <dd className="text-slate-600">{book?.isbn13 ?? 'なし'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">ステータス</dt>
            <dd className="text-slate-600">{record.status}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">記録日</dt>
            <dd className="text-slate-600">{new Date(record.created_at).toLocaleDateString('ja-JP')}</dd>
          </div>
          {record.finished_on ? (
            <div>
              <dt className="font-medium text-slate-700">読了日</dt>
              <dd className="text-slate-600">{record.finished_on}</dd>
            </div>
          ) : null}
          {record.memo ? (
            <div>
              <dt className="font-medium text-slate-700">メモ</dt>
              <dd className="whitespace-pre-wrap text-slate-600">{record.memo}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </main>
  );
}
