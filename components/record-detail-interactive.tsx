'use client';

import { useActionState, useCallback, useState } from 'react';
import { updateRecordStatus } from '@/app/actions/record';
import {
  createComment,
  deleteComment,
  updateComment,
  type CommentActionResult
} from '@/app/actions/comment';
import { toggleReaction } from '@/app/actions/reaction';
import { createClient } from '@/lib/supabase/client';
import { READING_STATUSES, STATUS_LABELS } from '@/lib/validations/record';
import type { ActionResult } from '@/lib/actions/types';

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
  clap: '👏'
};

const COMMENT_TEMPLATES = [
  'よくよめたね！',
  'すごい！',
  'いっしょに読もうね',
  'どんなお話だった？'
];

type Props = {
  recordId: string;
  currentUserId: string;
  currentStatus: string;
  currentMemo: string | null;
  currentFinishedOn: string | null;
  initialComments: Comment[];
  initialReactions: Reaction[];
  initialMemberNameMap: Record<string, string>;
};

export function RecordDetailInteractive({
  recordId,
  currentUserId,
  currentStatus,
  currentMemo,
  currentFinishedOn,
  initialComments,
  initialReactions,
  initialMemberNameMap
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [reactions, setReactions] = useState(initialReactions);
  const [memberNameMap, setMemberNameMap] = useState(initialMemberNameMap);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [commentEditPending, setCommentEditPending] = useState(false);
  const [commentDeletePendingId, setCommentDeletePendingId] = useState<
    string | null
  >(null);
  const [commentOperationError, setCommentOperationError] = useState('');

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateRecordStatus,
    {}
  );

  const fetchMemberNames = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('family_members')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const nextMap: Record<string, string> = {};
    for (const row of (data ?? []) as {
      user_id: string;
      display_name: string;
    }[]) {
      nextMap[row.user_id] = row.display_name ?? '保護者';
    }
    setMemberNameMap((prev) => ({ ...prev, ...nextMap }));
  }, []);

  const fetchComments = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('record_comments')
      .select('id, author_user_id, body, created_at')
      .eq('record_id', recordId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = (data as Comment[]) ?? [];
        setComments(rows);
        const userIds = Array.from(
          new Set(rows.map((row) => row.author_user_id))
        );
        if (userIds.length > 0) fetchMemberNames(userIds);
      });
  }, [recordId, fetchMemberNames]);

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
      setReactingEmoji(emoji);
      setReactions((prev) => {
        const existing = prev.find(
          (r) => r.user_id === currentUserId && r.emoji === emoji
        );
        if (existing) return prev.filter((r) => r.id !== existing.id);
        return [
          ...prev,
          { id: `optimistic-${Date.now()}`, user_id: currentUserId, emoji }
        ];
      });

      try {
        await toggleReaction(recordId, emoji);
        await fetchReactions();
      } catch {
        await fetchReactions();
      } finally {
        setReactingEmoji(null);
      }
    },
    [recordId, currentUserId, fetchReactions]
  );

  const [commentState, commentFormAction, commentPending] = useActionState<
    CommentActionResult,
    FormData
  >(async (prev, formData) => {
    const result = await createComment(prev, formData);
    if (!result.error) {
      setCommentBody('');
      setCommentOperationError('');
      fetchComments();
    }
    return result;
  }, {});

  const startEditingComment = (comment: Comment) => {
    setCommentOperationError('');
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingBody('');
  };

  const submitCommentEdit = async () => {
    if (!editingCommentId) return;

    setCommentOperationError('');
    setCommentEditPending(true);

    const formData = new FormData();
    formData.set('commentId', editingCommentId);
    formData.set('body', editingBody);

    const result = await updateComment({}, formData);
    setCommentEditPending(false);

    if (result.error) {
      setCommentOperationError(result.error);
      return;
    }

    cancelEditingComment();
    fetchComments();
  };

  const removeComment = async (commentId: string) => {
    setCommentOperationError('');
    setCommentDeletePendingId(commentId);

    const formData = new FormData();
    formData.set('commentId', commentId);

    const result = await deleteComment({}, formData);
    setCommentDeletePendingId(null);

    if (result.error) {
      setCommentOperationError(result.error);
      return;
    }

    if (editingCommentId === commentId) {
      cancelEditingComment();
    }
    fetchComments();
  };

  // Group reactions by emoji
  const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, mine: false };
    }
    reactionCounts[r.emoji].count++;
    if (r.user_id === currentUserId) reactionCounts[r.emoji].mine = true;
  }

  return (
    <>
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
              {info && (
                <span className="text-xs font-medium">{info.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status update form */}
      <form
        action={formAction}
        className="mt-6 space-y-4 rounded-xl bg-white p-4 shadow"
      >
        <h2 className="font-semibold">記録を更新</h2>
        <input type="hidden" name="recordId" value={recordId} />

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            ステータス
          </label>
          <select
            id="status"
            name="status"
            className="w-full rounded border p-2"
            defaultValue={currentStatus}
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
            defaultValue={currentMemo ?? ''}
          />
        </div>

        <div>
          <label
            htmlFor="finishedOn"
            className="mb-1 block text-sm font-medium"
          >
            読了日
          </label>
          <input
            id="finishedOn"
            name="finishedOn"
            type="date"
            className="w-full rounded border p-2"
            defaultValue={currentFinishedOn ?? ''}
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

      {/* Comments */}
      <section className="mt-6 rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold">コメント（{comments.length}件）</h2>

        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            まだコメントはありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {comments.map((c) => {
              const mine = c.author_user_id === currentUserId;
              const editing = editingCommentId === c.id;

              return (
                <li key={c.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700">
                        {mine
                          ? '自分'
                          : (memberNameMap[c.author_user_id] ?? '保護者')}
                      </span>
                      <time>
                        {new Date(c.created_at).toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>

                    {mine && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingComment(c)}
                          disabled={
                            commentEditPending ||
                            commentDeletePendingId !== null
                          }
                          className="text-xs text-blue-600 underline disabled:opacity-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                'このコメントを削除します。よろしいですか？'
                              )
                            ) {
                              void removeComment(c.id);
                            }
                          }}
                          disabled={
                            commentDeletePendingId === c.id ||
                            commentEditPending
                          }
                          className="text-xs text-red-600 underline disabled:opacity-50"
                        >
                          {commentDeletePendingId === c.id ? '削除中…' : '削除'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        className="w-full rounded border p-2 text-sm"
                        rows={2}
                        maxLength={500}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void submitCommentEdit()}
                          disabled={commentEditPending}
                          className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {commentEditPending ? '保存中…' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingComment}
                          disabled={commentEditPending}
                          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {c.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {commentOperationError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {commentOperationError}
          </p>
        )}

        <form action={commentFormAction} className="mt-4">
          <input type="hidden" name="recordId" value={recordId} />
          <div className="mb-2 flex flex-wrap gap-1.5">
            {COMMENT_TEMPLATES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCommentBody(t)}
                className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs text-orange-700 hover:bg-orange-100"
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            name="body"
            className="w-full rounded border p-2 text-sm"
            rows={2}
            placeholder="コメントを入力…"
            maxLength={500}
            required
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
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
    </>
  );
}
