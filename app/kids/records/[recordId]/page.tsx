import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKidSessionChildId } from '@/lib/kids/session';

const STATUS_LABELS: Record<string, string> = {
  want_to_read: 'よみたい',
  reading: 'よんでる',
  finished: 'よみおわった'
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

type ParentComment = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string;
};

type ParentReaction = {
  emoji: string;
  user_id: string;
};

function formatYmdDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('ja-JP');
}

export default async function KidRecordDetailPage({
  params
}: {
  params: Promise<{ recordId: string }>;
}) {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const { recordId } = await params;
  const supabase = createAdminClient();

  const [{ data: record }, { data: comments }, { data: reactions }] = await Promise.all([
    supabase
      .from('reading_records')
      .select(
        'id, created_at, status, memo, finished_on, books(title, author, isbn13, cover_url), children(display_name), record_reactions_child(stamp), record_feeling_tags(tag)'
      )
      .eq('id', recordId)
      .eq('child_id', childId)
      .maybeSingle(),
    supabase
      .from('record_comments')
      .select('id, body, created_at, author_user_id')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('record_reactions').select('emoji, user_id').eq('record_id', recordId)
  ]);

  if (!record) notFound();

  const parentUserIds = new Set<string>();
  for (const comment of (comments ?? []) as ParentComment[]) parentUserIds.add(comment.author_user_id);
  for (const reaction of (reactions ?? []) as ParentReaction[]) parentUserIds.add(reaction.user_id);

  const { data: members } = parentUserIds.size
    ? await supabase
        .from('family_members')
        .select('user_id, display_name')
        .in('user_id', Array.from(parentUserIds))
    : { data: [] as { user_id: string; display_name: string }[] };

  const memberNameMap = new Map<string, string>();
  for (const member of members ?? []) {
    memberNameMap.set(member.user_id, member.display_name ?? '保護者');
  }

  const book = Array.isArray(record.books) ? record.books[0] : record.books;
  const child = Array.isArray(record.children) ? record.children[0] : record.children;
  const stampRows = (record.record_reactions_child as { stamp?: string }[] | null) ?? [];
  const feelingRows = (record.record_feeling_tags as { tag?: string }[] | null) ?? [];
  const stamp = stampRows[0]?.stamp ?? null;

  const reactionCountMap = new Map<string, number>();
  const reactionByParent = new Map<string, Record<string, number>>();

  for (const row of (reactions ?? []) as ParentReaction[]) {
    reactionCountMap.set(row.emoji, (reactionCountMap.get(row.emoji) ?? 0) + 1);

    const parentName = memberNameMap.get(row.user_id) ?? '保護者';
    const current = reactionByParent.get(parentName) ?? {};
    current[row.emoji] = (current[row.emoji] ?? 0) + 1;
    reactionByParent.set(parentName, current);
  }

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/kids/records" className="text-sm text-blue-600 underline">
        ほんだなへもどる
      </Link>

      <div className="mt-3 rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-100 p-5 shadow">
        <p className="text-xs font-medium text-indigo-700">{child?.display_name ?? 'こども'} のどくしょきろく</p>
        <h1 className="mt-1 text-2xl font-bold text-indigo-950">{book?.title ?? 'タイトルふめい'}</h1>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-medium text-indigo-800">
            {STATUS_LABELS[record.status] ?? record.status}
          </span>
          {stamp ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
              {STAMP_LABELS[stamp] ?? stamp}
            </span>
          ) : null}
        </div>

        {book?.cover_url ? (
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={book.cover_url} alt={book.title ?? 'ひょうし'} className="h-48 w-32 rounded-lg object-cover shadow" />
          </div>
        ) : (
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg bg-white/80 text-sm text-slate-500">
            ひょうし画像はありません
          </div>
        )}

        {feelingRows.length > 0 ? (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-indigo-800">きもちタグ</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {feelingRows.map((row, i) => (
                <span key={`${row.tag}-${i}`} className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-900">
                  {row.tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-4 rounded-xl bg-white/85 p-4">
          <h2 className="text-sm font-semibold text-indigo-900">おうちのひとのリアクション</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {reactionCountMap.size > 0 ? (
              Array.from(reactionCountMap.entries()).map(([emoji, count]) => (
                <span key={emoji} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {EMOJI_MAP[emoji] ?? emoji} {count}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">まだリアクションはありません</p>
            )}
          </div>

          {reactionByParent.size > 0 ? (
            <ul className="mt-3 space-y-2">
              {Array.from(reactionByParent.entries()).map(([parentName, emojis]) => (
                <li key={parentName} className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                  <p className="font-medium">{parentName}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(emojis).map(([emoji, count]) => (
                      <span key={`${parentName}-${emoji}`} className="rounded-full bg-white px-2 py-0.5 text-xs">
                        {EMOJI_MAP[emoji] ?? emoji} {count}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="mt-4 rounded-xl bg-white/85 p-4">
          <h2 className="text-sm font-semibold text-indigo-900">おうちのひとからのコメント</h2>
          {comments && comments.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {(comments as ParentComment[]).map((comment) => (
                <li key={comment.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-semibold text-indigo-700">
                    {memberNameMap.get(comment.author_user_id) ?? '保護者'}
                  </p>
                  <p className="whitespace-pre-wrap">{comment.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(comment.created_at).toLocaleString('ja-JP')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">まだコメントはありません</p>
          )}
        </section>

        <dl className="mt-5 space-y-3 rounded-xl bg-white/80 p-4 text-sm">
          <div>
            <dt className="font-medium text-slate-700">ちょしゃ</dt>
            <dd className="text-slate-700">{book?.author ?? 'ふめい'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">ISBN</dt>
            <dd className="text-slate-700">{book?.isbn13 ?? 'なし'}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">きろくしたひ</dt>
            <dd className="text-slate-700">{new Date(record.created_at).toLocaleDateString('ja-JP')}</dd>
          </div>
          {record.finished_on ? (
            <div>
              <dt className="font-medium text-slate-700">よみおわったひ</dt>
              <dd className="text-slate-700">{formatYmdDate(record.finished_on)}</dd>
            </div>
          ) : null}
          {record.memo ? (
            <div>
              <dt className="font-medium text-slate-700">メモ</dt>
              <dd className="whitespace-pre-wrap text-slate-700">{record.memo}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </main>
  );
}
