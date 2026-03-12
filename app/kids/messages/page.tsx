import Link from 'next/link';
import { AppTopNav } from '@/components/app-top-nav';
import { EmptyStateCard } from '@/components/empty-state-card';
import { redirect } from 'next/navigation';
import { markKidMessageRead } from '@/app/actions/kid-message';
import { requireKidContext } from '@/lib/kids/client';
import { getKidMessages } from '@/lib/kids/messages';
import { TrackedSubmitButton } from '@/components/tracked-submit-button';
import { ageText } from '@/lib/kids/age-text';
import {
  getAgeModeFromProfile,
  type AgeModeOverride
} from '@/lib/kids/age-mode';

const EMOJI_MAP: Record<string, string> = {
  heart: '❤️',
  thumbsup: '👍',
  star: '🌟',
  clap: '👏'
};

const PRIMARY_BTN =
  'inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600';
const SECONDARY_BTN =
  'inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100';

export default async function KidsMessagesPage() {
  const { childId, supabase } = await requireKidContext();
  const [{ data: childRows }, { messages, unreadCount }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    getKidMessages()
  ]);

  const child = (childRows?.[0] ?? null) as {
    display_name: string;
    birth_year: number | null;
    age_mode_override: AgeModeOverride | null;
  } | null;
  if (!child) redirect('/kids/login');

  const ageMode = getAgeModeFromProfile({
    birthYear: child.birth_year,
    ageModeOverride: child.age_mode_override ?? 'auto'
  });

  return (
    <main className="mx-auto max-w-2xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: `${child.display_name} への おてがみ`,
          standard: `${child.display_name} へのメッセージ`
        })}
        backHref="/kids/home"
        backLabel={ageText(ageMode, { junior: 'ほーむ', standard: 'ホーム' })}
      />
      <p
        className={`mb-4 ${ageMode === 'junior' ? 'text-base' : 'text-sm'} text-amber-800`}
      >
        {ageText(ageMode, {
          junior: `みどく ${unreadCount} けん`,
          standard: `未読 ${unreadCount} 件`
        })}
      </p>

      {messages.length === 0 ? (
        <EmptyStateCard
          icon="💬"
          title={ageText(ageMode, {
            junior: 'まだ メッセージは ないよ',
            standard: 'まだメッセージはありません'
          })}
          description={ageText(ageMode, {
            junior: (
              <>
                ほんをよんで きろくすると、おうちのひとから
                <br />
                メッセージが とどくかも！
              </>
            ),
            standard: (
              <>
                本を読んで記録すると、おうちのひとから
                <br />
                メッセージが届くかもしれません。
              </>
            )
          })}
          primaryAction={
            <Link
              href="/kids/records/new"
              className={`${PRIMARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'h-10'}`}
            >
              {ageText(ageMode, {
                junior: '📖 きろくする',
                standard: '📖 記録をつける'
              })}
            </Link>
          }
          secondaryAction={
            <Link
              href="/kids/home"
              className={`${SECONDARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'h-10'}`}
            >
              {ageText(ageMode, {
                junior: 'ほーむ',
                standard: 'ホームに戻る'
              })}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl border bg-white/95 p-4 shadow ${message.unread ? 'border-orange-300 bg-orange-50/40' : 'border-amber-100'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-900">
                  {message.bookTitle}
                </p>
                <p className="text-xs text-amber-700">
                  {new Date(message.created_at).toLocaleString('ja-JP')}
                </p>
              </div>

              <p className="text-amber-950">{message.body}</p>

              <div className="mt-2 flex flex-wrap gap-2 text-sm text-amber-800">
                {Object.entries(message.reactions).length > 0 ? (
                  Object.entries(message.reactions).map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="rounded-full bg-amber-100 px-2 py-0.5"
                    >
                      {EMOJI_MAP[emoji] ?? emoji} {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-800">
                    {ageText(ageMode, {
                      junior: 'リアクションは まだないよ',
                      standard: 'リアクションはまだありません'
                    })}
                  </span>
                )}
              </div>

              {message.unread ? (
                <form action={markKidMessageRead} className="mt-3">
                  <input type="hidden" name="commentId" value={message.id} />
                  <TrackedSubmitButton
                    eventName="kid_message_mark_read"
                    childId={childId}
                    target="mark_read"
                    meta={{ age_mode: ageMode }}
                    className={`rounded-lg bg-orange-500 px-3 py-1.5 font-semibold text-white hover:bg-orange-600 ${ageMode === 'junior' ? 'h-12 text-base' : 'text-sm'}`}
                  >
                    {ageText(ageMode, {
                      junior: 'よんだ！',
                      standard: '既読にする'
                    })}
                  </TrackedSubmitButton>
                </form>
              ) : (
                <p className="mt-3 text-xs text-emerald-700">
                  {ageText(ageMode, {
                    junior: 'よんだよ',
                    standard: '既読です'
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
