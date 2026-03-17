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
  'btn-primary inline-flex items-center justify-center px-4 text-sm font-bold';
const SECONDARY_BTN =
  'btn-secondary inline-flex items-center justify-center border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-800 hover:bg-sky-100';

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
        backLabel={ageText(ageMode, { junior: 'ホーム', standard: 'ホーム' })}
      />
      <p
        className={`mb-4 ${ageMode === 'junior' ? 'text-base' : 'text-sm'} text-sky-800`}
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
            junior: 'まだ おてがみは ないよ',
            standard: 'まだメッセージはありません'
          })}
          description={ageText(ageMode, {
            junior: (
              <>
                ほんをよんで きろくすると、おうちのひとから
                <br />
                おてがみが とどくかも！
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
              className={`${PRIMARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'min-h-11'}`}
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
              className={`${SECONDARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'min-h-11'}`}
            >
              {ageText(ageMode, {
                junior: 'ホーム',
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
              className={`rounded-xl border bg-white/95 p-4 shadow ${message.unread ? 'border-sky-300 bg-sky-50/40' : 'border-sky-100'}`}
            >
              {/* 本のタイトル（タップで記録ページへ） */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  href={`/kids/records/${message.record_id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold text-sky-900 underline underline-offset-2 hover:text-sky-700">
                    📖 {message.bookTitle}
                  </p>
                </Link>
                <p className="shrink-0 text-xs text-sky-700">
                  {(() => {
                    const d = new Date(message.created_at);
                    return ageMode === 'junior'
                      ? `${d.getMonth() + 1}がつ${d.getDate()}にち`
                      : `${d.getMonth() + 1}月${d.getDate()}日`;
                  })()}
                </p>
              </div>

              {/* 送信者名とメッセージ本文 */}
              <div className="rounded-lg bg-sky-50/60 px-3 py-2">
                <p className="mb-1 text-xs font-semibold text-sky-700">
                  {message.authorDisplayName}
                </p>
                <p className="text-sky-950">{message.body}</p>
              </div>

              {/* リアクション（誰がどの絵文字を送ったか） */}
              {Object.keys(message.reactions).length > 0 ? (
                <div className="mt-2 space-y-1">
                  {Object.entries(message.reactions).map(([emoji, data]) => (
                    <div key={emoji} className="flex items-center gap-2">
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sm text-sky-800">
                        {EMOJI_MAP[emoji] ?? emoji} {data.count}
                      </span>
                      <span className="text-xs text-sky-600">
                        {data.names.join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-sky-700">
                  {ageText(ageMode, {
                    junior: 'リアクションは まだないよ',
                    standard: 'リアクションはまだありません'
                  })}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                {message.unread ? (
                  <form action={markKidMessageRead}>
                    <input type="hidden" name="commentId" value={message.id} />
                    <TrackedSubmitButton
                      eventName="kid_message_mark_read"
                      childId={childId}
                      target="mark_read"
                      meta={{ age_mode: ageMode }}
                      className={`btn-primary px-3 font-semibold ${ageMode === 'junior' ? 'h-12 text-base' : 'min-h-11 text-sm'}`}
                    >
                      {ageText(ageMode, {
                        junior: 'よんだ！',
                        standard: '既読にする'
                      })}
                    </TrackedSubmitButton>
                  </form>
                ) : (
                  <p className="text-xs text-emerald-700">
                    {ageText(ageMode, {
                      junior: 'よんだよ ✓',
                      standard: '既読 ✓'
                    })}
                  </p>
                )}
                <Link
                  href={`/kids/records/${message.record_id}`}
                  className="kid-link text-xs"
                >
                  {ageText(ageMode, {
                    junior: 'きろくをみる →',
                    standard: '記録を見る →'
                  })}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
