import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';
import { ageText } from '@/lib/kids/age-text';
import { BookCoverImage } from '@/components/book-cover-image';

const STATUS_LABELS: Record<string, string> = {
  want_to_read: 'よみたい',
  reading: 'よんでる',
  finished: 'よみおわった',
  read_aloud: 'よんでもらった'
};

const STAMP_LABELS: Record<string, string> = {
  great: '🌟 すごくよかった',
  fun: '😊 たのしかった',
  ok: '😐 ふつう',
  hard: '😓 むずかしかった'
};

const EMOJI_MAP: Record<string, string> = {
  heart: '❤️',
  thumbsup: '👍',
  star: '🌟',
  clap: '👏'
};

type RecordDetailRow = {
  id: string;
  created_at: string;
  status: string;
  memo: string | null;
  finished_on: string | null;
  child_display_name: string | null;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  cover_url: string | null;
  stamp: string | null;
  feeling_tags: string[] | null;
};

type ParentComment = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string;
  author_display_name: string;
};

type ParentReaction = {
  emoji: string;
  user_id: string;
  parent_display_name: string;
};


export default async function KidRecordDetailPage({
  params
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { childId, supabase } = await requireKidContext();

  const { recordId } = await params;

  const [ageMode, [{ data: detailRows }, { data: commentRows }, { data: reactionRows }]] =
    await Promise.all([
      resolveKidAgeMode(supabase, childId),
      Promise.all([
    await Promise.all([
        supabase.rpc('get_kid_record_detail', {
          target_child_id: childId,
          target_record_id: recordId
        }),
        supabase.rpc('get_kid_record_comments', {
          target_child_id: childId,
          target_record_id: recordId,
          max_rows: 10
        }),
        supabase.rpc('get_kid_record_reactions', {
          target_child_id: childId,
          target_record_id: recordId
        })
      ])
    ]);

  const record = (detailRows as RecordDetailRow[] | null)?.[0];
  if (!record) notFound();

  const comments = (commentRows ?? []) as ParentComment[];
  const reactions = (reactionRows ?? []) as ParentReaction[];

  const reactionCountMap = new Map<string, number>();
  const reactionByParent = new Map<string, Record<string, number>>();

  for (const row of reactions) {
    reactionCountMap.set(row.emoji, (reactionCountMap.get(row.emoji) ?? 0) + 1);

    const parentName = row.parent_display_name ?? 'おうちのひと';
    const current = reactionByParent.get(parentName) ?? {};
    current[row.emoji] = (current[row.emoji] ?? 0) + 1;
    reactionByParent.set(parentName, current);
  }

  const feelingTags = record.feeling_tags ?? [];

  return (
    <main className="mx-auto max-w-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/kids/records" className="kid-link">
          ほんだなにもどる
        </Link>
        <Link
          href={`/kids/records/${record.id}/edit`}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-orange-600 active:scale-95"
        >
          ✏️ {ageText(ageMode, { junior: 'へんしゅう', standard: '編集' })}
        </Link>
      </div>

      <article className="kid-note-card mt-3">
        <div className="rounded-xl border border-amber-200/70 bg-white/75 p-4">
          <p className="text-xs font-medium text-amber-700">
            {record.child_display_name ?? 'こども'} のどくしょきろく
          </p>
          <h1 className="mt-1 text-2xl font-bold text-amber-950">
            {record.title ?? 'タイトルふめい'}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-amber-900">
              {STATUS_LABELS[record.status] ?? record.status}
            </span>
            {record.stamp ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
                {STAMP_LABELS[record.stamp] ?? record.stamp}
              </span>
            ) : null}
          </div>

          {record.cover_url ? (
            <div className="mt-4 flex justify-center">
              <BookCoverImage
                src={record.cover_url}
                alt={record.title ?? 'ひょうし'}
                className="h-48 w-32 rounded-lg object-cover shadow"
                fallbackClassName="flex h-48 w-32 items-center justify-center rounded-lg bg-white/80 text-sm text-slate-500"
                fallbackText="ひょうしがぞうはありません"
              />
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-white/80 text-sm text-slate-500">
              ひょうしがぞうはありません
            </div>
          )}

          {feelingTags.length > 0 ? (
            <section className="mt-4">
              <h2 className="text-sm font-semibold text-amber-900">
                きもちタグ
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {feelingTags.map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-4 rounded-xl border border-amber-100 bg-white/90 p-4">
            <h2 className="text-sm font-semibold text-amber-900">
              おうちのひとのリアクション
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {reactionCountMap.size > 0 ? (
                Array.from(reactionCountMap.entries()).map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {EMOJI_MAP[emoji] ?? emoji} {count}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  まだリアクションはありません
                </p>
              )}
            </div>

            {reactionByParent.size > 0 ? (
              <ul className="mt-3 space-y-2">
                {Array.from(reactionByParent.entries()).map(
                  ([parentName, emojis]) => (
                    <li
                      key={parentName}
                      className="rounded-lg bg-amber-50/80 p-2 text-sm text-slate-700"
                    >
                      <p className="font-medium">{parentName}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(emojis).map(([emoji, count]) => (
                          <span
                            key={`${parentName}-${emoji}`}
                            className="rounded-full bg-white px-2 py-0.5 text-xs"
                          >
                            {EMOJI_MAP[emoji] ?? emoji} {count}
                          </span>
                        ))}
                      </div>
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </section>

          <section className="mt-4 rounded-xl border border-amber-100 bg-white/90 p-4">
            <h2 className="text-sm font-semibold text-amber-900">
              おうちのひとからのコメント
            </h2>
            {comments.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="mb-1 text-xs font-semibold text-amber-700">
                      {comment.author_display_name}
                    </p>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(() => {
                        const d = new Date(comment.created_at);
                        return `${d.getMonth() + 1}がつ${d.getDate()}にち`;
                      })()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                まだコメントはありません
              </p>
            )}
          </section>

          <dl className="mt-5 space-y-3 rounded-xl border border-amber-100 bg-white/90 p-4 text-sm">
            {record.author ? (
              <div>
                <dt className="font-medium text-slate-700">かいたひと</dt>
                <dd className="text-slate-700">{record.author}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-slate-700">きろくしたひ</dt>
              <dd className="text-slate-700">
                {(() => {
                  const d = new Date(record.created_at);
                  return `${d.getMonth() + 1}がつ${d.getDate()}にち`;
                })()}
              </dd>
            </div>
            {record.finished_on ? (
              <div>
                <dt className="font-medium text-slate-700">よみおわったひ</dt>
                <dd className="text-slate-700">
                  {(() => {
                    const d = new Date(`${record.finished_on}T00:00:00`);
                    return `${d.getMonth() + 1}がつ${d.getDate()}にち`;
                  })()}
                </dd>
              </div>
            ) : null}
            {record.memo ? (
              <div>
                <dt className="font-medium text-slate-700">ひとことかんそう</dt>
                <dd className="whitespace-pre-wrap text-slate-700">
                  {record.memo}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </article>
    </main>
  );
}
