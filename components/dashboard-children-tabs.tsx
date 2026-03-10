'use client';

import Link from 'next/link';
import { TrackedLink } from '@/components/tracked-link';
import { useState } from 'react';

type Child = {
  id: string;
  display_name: string;
  birth_year: number | null;
};

type WeeklyHighlight = {
  recordId: string;
  bookTitle: string;
  coverUrl: string | null;
  stamp: string;
} | null;

type Props = {
  childProfiles: Child[];
  recordCounts: Record<string, number>;
  monthlyByChild: Record<string, number>;
  weeklyHighlights?: Record<string, WeeklyHighlight>;
};

const STAMP_LABELS: Record<string, string> = {
  great: '🌟 すごくよかった',
  fun: '😊 たのしかった',
  ok: '😐 ふつう',
  hard: '😓 むずかしかった',
};

export function DashboardChildrenTabs({ childProfiles, recordCounts, monthlyByChild, weeklyHighlights }: Props) {
  const [activeId, setActiveId] = useState<string>(childProfiles[0]?.id ?? '');

  if (childProfiles.length === 0) {
    return <p className="text-slate-600">子どもプロフィールがありません。追加してください。</p>;
  }

  const active = childProfiles.find((c) => c.id === activeId) ?? childProfiles[0];

  return (
    <div>
      {/* タブ */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {childProfiles.map((child) => (
          <button
            key={child.id}
            onClick={() => setActiveId(child.id)}
            className={`flex flex-shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
              child.id === activeId
                ? 'border-b-4 border-orange-500 text-orange-700'
                : 'border-b-4 border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-base">🧒</span>
            {child.display_name}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {active && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800">{active.display_name}</p>
              <p className="text-sm text-slate-500">生年: {active.birth_year ?? '未設定'}</p>
            </div>
            <Link
              href={`/children/${active.id}`}
              className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
            >
              詳細を見る →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TrackedLink
              href={`/children/${active.id}/records/new`}
              eventName="dashboard_child_quick_add_click"
              childId={active.id}
              target="child_record_new"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              ＋記録を追加
            </TrackedLink>
            <Link
              href={`/children/${active.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              最新を見る
            </Link>
          </div>

          <div className="mt-3 flex gap-4">
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-center">
              <p className="text-xs text-slate-500">合計</p>
              <p className="text-xl font-bold text-slate-800">{recordCounts[active.id] ?? 0} 冊</p>
            </div>
            <div className="rounded-lg bg-orange-50 px-4 py-2 text-center">
              <p className="text-xs text-orange-600">今月</p>
              <p className="text-xl font-bold text-orange-700">{monthlyByChild[active.id] ?? 0} 冊</p>
            </div>
          </div>

          {/* 今週のハイライト */}
          {weeklyHighlights?.[active.id] && (() => {
            const hl = weeklyHighlights[active.id]!;
            return (
              <Link
                href={`/records/${hl.recordId}`}
                className="mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:bg-amber-100"
              >
                {hl.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hl.coverUrl}
                    alt=""
                    className="h-12 w-9 flex-shrink-0 rounded object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded bg-amber-200 text-xs">📖</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-700">🌟 今週のハイライト</p>
                  <p className="truncate text-sm font-medium text-slate-800">{hl.bookTitle}</p>
                  <p className="text-xs text-slate-500">{STAMP_LABELS[hl.stamp] ?? hl.stamp}</p>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            );
          })()}
        </div>
      )}
    </div>
  );
}
