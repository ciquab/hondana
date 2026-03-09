import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, type ReadingStatus } from '@/lib/validations/record';
import { RecordDetailInteractive } from '@/components/record-detail-interactive';
import { RecordDeleteButton } from '@/components/record-delete-button';

type Props = {
  params: Promise<{ recordId: string }>;
};

export default async function RecordDetailPage({ params }: Props) {
  const { recordId } = await params;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: record }, { data: commentRows }, { data: reactionRows }] =
    await Promise.all([
      supabase
        .from('reading_records')
        .select(
          'id, family_id, child_id, status, memo, finished_on, created_at, updated_at, books(id, title, author, isbn13, cover_url), children(id, display_name)'
        )
        .eq('id', recordId)
        .single(),
      supabase
        .from('record_comments')
        .select('id, author_user_id, body, created_at')
        .eq('record_id', recordId)
        .order('created_at', { ascending: true }),
      supabase
        .from('record_reactions')
        .select('id, user_id, emoji')
        .eq('record_id', recordId)
    ]);

  if (!record) notFound();

  const comments = (commentRows ?? []) as {
    id: string;
    author_user_id: string;
    body: string;
    created_at: string;
  }[];
  const reactions = (reactionRows ?? []) as {
    id: string;
    user_id: string;
    emoji: string;
  }[];

  // Build member name map for comment authors
  const authorUserIds = Array.from(
    new Set(comments.map((c) => c.author_user_id))
  );
  const memberNameMap: Record<string, string> = {};
  if (authorUserIds.length > 0) {
    const { data: members } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .in('user_id', authorUserIds);
    for (const m of (members ?? []) as {
      user_id: string;
      display_name: string;
    }[]) {
      memberNameMap[m.user_id] = m.display_name ?? '保護者';
    }
  }

  const books = record.books as {
    id: string;
    title: string;
    author: string | null;
    isbn13: string | null;
    cover_url: string | null;
  } | null;
  const children = record.children as {
    id: string;
    display_name: string;
  } | null;

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link
        href={`/children/${record.child_id}`}
        className="text-sm text-blue-600 underline"
      >
        {children?.display_name ?? '子ども'} の記録一覧へ戻る
      </Link>

      <div className="mt-3 rounded-xl bg-white p-5 shadow">
        <div className="flex gap-4">
          {books?.cover_url && (
            <img
              src={books.cover_url}
              alt={`${books.title} の表紙`}
              className="h-28 flex-shrink-0 rounded shadow"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{books?.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {books?.author ?? '著者不明'}
              {books?.isbn13 && ` ・ ISBN: ${books.isbn13}`}
            </p>

            <div className="mt-3 inline-block rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">
              {STATUS_LABELS[record.status as ReadingStatus] ?? record.status}
            </div>
          </div>
        </div>

        {record.memo && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-slate-600">メモ</h2>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">
              {record.memo}
            </p>
          </div>
        )}

        {record.finished_on && (
          <p className="mt-3 text-sm text-slate-500">
            読了日: {record.finished_on}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-400">
          登録: {new Date(record.created_at).toLocaleDateString('ja-JP')}
          {record.updated_at !== record.created_at &&
            ` ・ 更新: ${new Date(record.updated_at).toLocaleDateString('ja-JP')}`}
        </p>
      </div>

      <RecordDeleteButton recordId={record.id} />

      <RecordDetailInteractive
        recordId={record.id}
        currentUserId={user.id}
        currentStatus={record.status}
        currentMemo={record.memo}
        currentFinishedOn={record.finished_on}
        initialComments={comments}
        initialReactions={reactions}
        initialMemberNameMap={memberNameMap}
      />
    </main>
  );
}
