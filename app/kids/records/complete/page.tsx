import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { MissionProgress } from '@/components/mission-progress';
import { BookCoverImage } from '@/components/book-cover-image';
import { ageText } from '@/lib/kids/age-text';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

const STAMP_LABELS: Record<string, { emoji: string; label: string }> = {
  great: { emoji: '🌟', label: 'すごくよかった' },
  fun: { emoji: '😊', label: 'たのしかった' },
  ok: { emoji: '😐', label: 'ふつう' },
  hard: { emoji: '😓', label: 'むずかしかった' }
};

type RecordRow = {
  id: string;
  title: string | null;
  cover_url: string | null;
  stamp: string | null;
};

type MissionRow = {
  title: string;
  icon: string;
  target_value: number;
  current_progress: number;
  status: string;
  ends_at: string;
};

type BadgeRow = {
  badge_id: string;
  name: string | null;
  icon: string | null;
};

export default async function RecordCompletePage({
  searchParams
}: {
  searchParams: Promise<{ recordId?: string; badge?: string }>;
}) {
  const { childId, supabase } = await requireKidContext();
  const params = await searchParams;

  if (!params.recordId) redirect('/kids/home');

  const [{ data: recordRows }, { data: missionRows }, badgeInfo] = await Promise.all([
    supabase.rpc('get_kid_record_detail', {
      target_child_id: childId,
      target_record_id: params.recordId
    }),
    supabase.rpc('get_kid_active_mission', {
      target_child_id: childId
    }),
    params.badge
      ? supabase.from('badges').select('id, name, icon').eq('id', params.badge).single()
      : Promise.resolve({ data: null })
  ]);

  const record = (recordRows as RecordRow[] | null)?.[0] ?? null;
  const mission = (missionRows as MissionRow[] | null)?.[0] ?? null;
  const newBadge = badgeInfo?.data as BadgeRow | null;
  if (!record) redirect('/kids/home');

  const ageMode = await resolveKidAgeMode(supabase, childId);
  const stampInfo = STAMP_LABELS[record.stamp ?? ''];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-4 text-center">
      <div className="mb-6">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">
          {ageText(ageMode, { junior: 'きろく できた！', standard: 'きろく できたよ！' })}
        </h1>
      </div>

      <div className="mb-6 w-full max-w-xs rounded-2xl bg-white p-5 shadow">
        {record.cover_url ? (
          <BookCoverImage
            src={record.cover_url}
            alt={record.title ?? ''}
            className="mx-auto h-36 rounded shadow"
            fallbackClassName="mx-auto flex h-36 w-24 items-center justify-center rounded bg-amber-100 text-2xl text-slate-500 shadow"
            fallbackText="No img"
          />
        ) : (
          <div className="mx-auto flex h-36 w-24 items-center justify-center rounded bg-amber-100 text-4xl shadow">
            📖
          </div>
        )}
        <p className="mt-3 text-lg font-bold text-slate-800">{record.title ?? 'ほん'}</p>
        {stampInfo && (
          <p className="mt-1 text-sm text-slate-600">
            {stampInfo.emoji} {stampInfo.label}
          </p>
        )}
      </div>

      {mission && (
        <div className="mb-4 w-full max-w-xs">
          <MissionProgress
            title={mission.title}
            icon={mission.icon}
            targetValue={mission.target_value}
            currentProgress={mission.current_progress}
            status={mission.status}
            endsAt={mission.ends_at}
          />
        </div>
      )}

      {newBadge && (
        <div className="mb-6 w-full max-w-xs rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-600">あたらしいバッジ！</p>
          <p className="mt-1 text-3xl">{newBadge.icon ?? '🏅'}</p>
          <p className="mt-1 font-bold text-amber-800">{newBadge.name ?? newBadge.badge_id}</p>
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/kids/records/new"
          className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow hover:bg-orange-600"
        >
          {ageText(ageMode, { junior: '📚 もう 1さつ', standard: '📚 もう1さつ とうろく' })}
        </Link>
        <Link
          href="/kids/home"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {ageText(ageMode, { junior: '🏠 ほーむ', standard: '🏠 ホームにもどる' })}
        </Link>
      </div>
    </main>
  );
}
