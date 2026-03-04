'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { updateRecordStatus, type ActionResult } from '@/app/actions/record';
import { createComment, type CommentActionResult } from '@/app/actions/comment';
import { toggleReaction } from '@/app/actions/reaction';
import { READING_STATUSES, STATUS_LABELS, type ReadingStatus } from '@/lib/validations/record';

type RecordDetail = {
  id: string;
  family_id: string;
  child_id: string;
  status: string;
  memo: string | null;
  finished_on: string | null;
  created_at: string;
  updated_at: string;
  books: { id: string; title: string; author: string | null; isbn13: string | null; cover_url: string | null };
  children: { id: string; display_name: string };
};

type Comment = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

type Reaction = {
  id: string;
  user_id: string;
  emoji: string;
};

const EMOJI_MAP: Record<string, string> = {
  heart: '❤️',
  thumbsup: '👍',
  star: '🌟',
  clap: '👏',
};

export default function RecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(updateRecordStatus, {});
  const [commentState, commentFormAction, commentPending] = useActionState<CommentActionResult, FormData>(
    async (prev, formData) => {
      const result = await createComment(prev, formData);
      if (!result.error) {
        fetchComments();
      }
      return result;
    },
    {}
  );

  const fetchComments = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('record_comments')
      .select('id, author_user_id, body, created_at')
      .eq('record_id', recordId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments((data as Comment[]) ?? []);
      });
  }, [recordId]);

  const fetchReactions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('record_reactions')
      .select('id, user_id, emoji')
      .eq('record_id', recordId);
    setReactions((data as Reaction[]) ?? []);
  }, [recordId]);

  const handleReaction = useCallback(
    async (emoji: string) => {
      if (!currentUserId) return;
      setReactingEmoji(emoji);

      // Optimistic update: toggle locally first
      setReactions((prev) => {
        const existing = prev.find((r) => r.user_id === currentUserId && r.emoji === emoji);
        if (existing) {
          // Remove
          return prev.filter((r) => r.id !== existing.id);
        } else {
          // Add
          return [...prev, { id: `optimistic-${Date.now()}`, user_id: currentUserId, emoji }];
        }
      });

      setReactingEmoji(null);

      // Sync with server in background
      try {
        await toggleReaction(recordId, emoji);
        // Re-fetch actual data to ensure consistency
        fetchReactions();
      } catch {
        // Revert on error by re-fetching
        fetchReactions();
      }
    },
    [recordId, currentUserId, fetchReactions]
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });

    supabase
      .from('reading_records')
      .select(
        'id, family_id, child_id, status, memo, finished_on, created_at, updated_at, books(id, title, author, isbn13, cover_url), children(id, display_name)'
      )
      .eq('id', recordId)
      .single()
      .then(({ data }) => {
        setRecord(data as RecordDetail | null);
        setLoading(false);
      });

    fetchComments();
    fetchReactions();
  }, [recordId, fetchComments, fetchReactions]);

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <p className="text-slate-500">読み込み中…</p>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <p className="text-slate-600">記録が見つかりません。</p>
        <Link href="/dashboard" className="text-blue-600 underline">
          ダッシュボードへ戻る
        </Link>
      </main>
    );
  }

  // Group reactions by emoji
  const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, mine: false };
    }
    reactionCounts[r.emoji].count++;
    if (r.user_id === currentUserId) {
      reactionCounts[r.emoji].mine = true;
    }
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href={`/children/${record.child_id}`} className="text-sm text-blue-600 underline">
        {record.children?.display_name ?? '子ども'} の記録一覧へ戻る
      </Link>

      <div className="mt-3 rounded-xl bg-white p-5 shadow">
        <div className="flex gap-4">
          {record.books?.cover_url && (
            <img
              src={record.books.cover_url}
              alt={`${record.books.title} の表紙`}
              className="h-28 flex-shrink-0 rounded shadow"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{record.books?.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {record.books?.author ?? '著者不明'}
              {record.books?.isbn13 && ` ・ ISBN: ${record.books.isbn13}`}
            </p>

            <div className="mt-3 inline-block rounded bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">
              {STATUS_LABELS[record.status as ReadingStatus] ?? record.status}
            </div>
          </div>
        </div>

        {record.memo && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-slate-600">メモ</h2>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{record.memo}</p>
          </div>
        )}

        {record.finished_on && (
          <p className="mt-3 text-sm text-slate-500">読了日: {record.finished_on}</p>
        )}

        <p className="mt-2 text-xs text-slate-400">
          登録: {new Date(record.created_at).toLocaleDateString('ja-JP')}
          {record.updated_at !== record.created_at &&
            ` ・ 更新: ${new Date(record.updated_at).toLocaleDateString('ja-JP')}`}
        </p>

        {/* Reactions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {Object.entries(EMOJI_MAP).map(([key, emoji]) => {
            const info = reactionCounts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleReaction(key)}
                disabled={reactingEmoji !== null}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${
                  info?.mine
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                } disabled:opacity-50`}
              >
                <span>{emoji}</span>
                {info && <span className="text-xs font-medium">{info.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <form action={formAction} className="mt-6 space-y-4 rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold">記録を更新</h2>
        <input type="hidden" name="recordId" value={record.id} />

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            ステータス
          </label>
          <select
            id="status"
            name="status"
            className="w-full rounded border p-2"
            defaultValue={record.status}
          >
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="memo" className="mb-1 block text-sm font-medium">
            メモ
          </label>
          <textarea
            id="memo"
            name="memo"
            className="w-full rounded border p-2"
            rows={3}
            defaultValue={record.memo ?? ''}
          />
        </div>

        <div>
          <label htmlFor="finishedOn" className="mb-1 block text-sm font-medium">
            読了日
          </label>
          <input
            id="finishedOn"
            name="finishedOn"
            type="date"
            className="w-full rounded border p-2"
            defaultValue={record.finished_on ?? ''}
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? '更新中…' : '更新する'}
        </button>
      </form>

      {/* コメントセクション */}
      <section className="mt-6 rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold">コメント（{comments.length}件）</h2>

        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">まだコメントはありません。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {c.author_user_id === currentUserId && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">自分</span>
                  )}
                  <time>{new Date(c.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form action={commentFormAction} className="mt-4">
          <input type="hidden" name="recordId" value={record.id} />
          <textarea
            name="body"
            className="w-full rounded border p-2 text-sm"
            rows={2}
            placeholder="コメントを入力…"
            maxLength={500}
            required
          />
          {commentState.error && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {commentState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={commentPending}
            className="mt-2 rounded bg-emerald-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {commentPending ? '送信中…' : '送信'}
          </button>
        </form>
      </section>
    </main>
  );
}
