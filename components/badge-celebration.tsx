'use client';

import { useRouter } from 'next/navigation';
import type { ChildBadgeRow } from '@/lib/kids/badges';
import type { AgeMode } from '@/lib/kids/age-mode';

type Props = {
  badge: ChildBadgeRow;
  ageMode?: AgeMode;
};

export function BadgeCelebration({ badge, ageMode = 'standard' }: Props) {
  const router = useRouter();

  const dismiss = () => {
    router.replace('/kids/home');
  };

  const displayName =
    ageMode === 'junior' && badge.junior_name
      ? badge.junior_name
      : badge.name ?? badge.badge_id;
  const displayDescription =
    ageMode === 'junior' && badge.junior_description
      ? badge.junior_description
      : badge.description;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={dismiss}
    >
      <div
        className="mx-4 rounded-2xl bg-white p-8 text-center shadow-2xl animate-bounce"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-6xl">{badge.icon ?? '🏅'}</p>
        <p className="mt-3 text-xl font-bold text-slate-800">{displayName}</p>
        <p className="mt-1 text-sm text-slate-500">{displayDescription}</p>
        <p className="mt-1 text-xs text-amber-600 font-medium">
          {ageMode === 'junior' ? 'バッジ ゲット！🎉' : 'バッジかくとく！🎉'}
        </p>
        <button
          onClick={dismiss}
          className="mt-4 rounded-full bg-amber-400 px-6 py-2 text-sm font-bold text-white hover:bg-amber-500"
        >
          やったー！
        </button>
      </div>
    </div>
  );
}
