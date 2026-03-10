import Link from 'next/link';
import { AppTopNav } from '@/components/app-top-nav';
import { redirect } from 'next/navigation';
import { markKidMessageRead } from '@/app/actions/kid-message';
import { requireKidContext } from '@/lib/kids/client';
import { getKidMessages } from '@/lib/kids/messages';

const EMOJI_MAP: Record<string, string> = {
  heart: '❤️',
  thumbsup: '👍',
  star: '🌟',
  clap: '👏'
};

export default async function KidsMessagesPage() {
  const { childId, supabase } = await requireKidContext();
  const [{ data: childRows }, { messages, unreadCount }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    getKidMessages()
  ]);

  const child = childRows?.[0];
  if (!child) redirect('/kids/login');

  return (
    <main className="mx-auto max-w-2xl p-4">
      <AppTopNav
        title={`${child.display_name} へのメッセージ`}
        backHref="/kids/home"
        backLabel="ホーム"
      />
      <p className="mb-4 text-sm text-slate-600">みどく {unreadCount} けん</p>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-white py-8 text-center shadow">
          <span className="text-4xl">💬</span>
          <p className="mt-2 font-semibold text-slate-700">
            まだ メッセージは ないよ
          </p>
          <p className="mt-1 text-sm text-slate-500">
            ほんをよんで きろくすると、おうちのひとから
            <br />
            メッセージが とどくかも！
          </p>
          <Link
            href="/kids/records/new"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
          >
            📖 きろくをつける
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl border bg-white p-4 shadow ${message.unread ? 'border-blue-400' : 'border-slate-200'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {message.bookTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(message.created_at).toLocaleString('ja-JP')}
                </p>
              </div>

              <p className="text-slate-800">{message.body}</p>

              <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                {Object.entries(message.reactions).length > 0 ? (
                  Object.entries(message.reactions).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="rounded-full bg-slate-100 px-2 py-0.5"
                    >
                      {EMOJI_MAP[emoji] ?? emoji} {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">
                    リアクションはまだありません
                  </span>
                )}
              </div>

              {message.unread ? (
                <form action={markKidMessageRead} className="mt-3">
                  <input type="hidden" name="commentId" value={message.id} />
                  <button
                    type="submit"
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                  >
                    よんだ！
                  </button>
                </form>
              ) : (
                <p className="mt-3 text-xs text-green-700">よんだよ</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
