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
  hard: '😓 むずかしかった'
};

export function DashboardChildrenTabs({
  childProfiles,
  recordCounts,
  monthlyByChild,
  weeklyHighlights
}: Props) {
  const [activeId, setActiveId] = useState<string>(
    childProfiles[0]?.id ?? ''
  );

  if (childProfiles.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-stone-500">
          子どもプロフィールがありません。
        </p>
        <Link
          href="/settings/children"
          className="mt-2 inline-block text-sm text-amber-700 underline underline-offset-2"
        >
          追加する →
        </Link>
      </div>
    );
  }

  const active =
    childProfiles.find((c) => c.id === activeId) ?? childProfiles[0];

  return (
    <div>
      {/* タブ：amber-600 = 選択状態色 */}
      {childProfiles.length > 1 && (
        <div className="flex overflow-x-auto border-b border-stone-100">
          {childProfiles.map((child) => (
            <button
              key={child.id}
              onClick={() => setActiveId(child.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${
                child.id === activeId
                  ? 'border-b-2 border-amber-600 text-amber-800'
                  : 'border-b-2 border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {child.display_name}
            </button>
          ))}
        </div>
      )}

      {/* タブコンテンツ */}
      {active && (
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-stone-800">
                {active.display_name}
              </p>
              <p className="text-xs text-stone-400">
                生年: {active.birth_year ?? '未設定'}
              </p>
            </div>
            <Link
              href={`/children/${active.id}`}
              className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-800"
            >
              詳細を見る →
            </Link>
          </div>

          {/* 統計：総数と今月数 */}
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg bg-stone-50 px-3 py-2 text-center">
              <p className="text-xs text-stone-400">累計</p>
              <p className="text-2xl font-bold text-stone-800">
                {recordCounts[active.id] ?? 0}
                <span className="ml-0.5 text-sm font-normal text-stone-500">冊</span>
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-amber-50 px-3 py-2 text-center">
              <p className="text-xs text-amber-600">今月</p>
              <p className="text-2xl font-bold text-amber-700">
                {monthlyByChild[active.id] ?? 0}
                <span className="ml-0.5 text-sm font-normal text-amber-500">冊</span>
              </p>
            </div>
          </div>

          {/* アクション */}
          <div className="mt-3 flex gap-2">
            <TrackedLink
              href={`/children/${active.id}/records/new`}
              eventName="dashboard_child_quick_add_click"
              childId={active.id}
              target="child_record_new"
              className="btn-primary flex-1"
            >
              ＋ 記録を追加
            </TrackedLink>
            <Link
              href={`/children/${active.id}`}
              className="btn-secondary flex-1"
            >
              最新を見る
            </Link>
          </div>

          {/* 今週のハイライト：amber = ブランド色として自然 */}
          {weeklyHighlights?.[active.id] &&
            (() => {
              const hl = weeklyHighlights[active.id]!;
              return (
                <Link
                  href={`/records/${hl.recordId}`}
                  className="mt-3 flex items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 transition hover:bg-stone-100"
                >
                  {hl.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hl.coverUrl}
                      alt=""
                      className="h-12 w-9 flex-shrink-0 rounded object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded bg-stone-200 text-xs">
                      📖
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-700">
                      今週のハイライト
                    </p>
                    <p className="truncate text-sm font-medium text-stone-800">
                      {hl.bookTitle}
                    </p>
                    <p className="text-xs text-stone-400">
                      {STAMP_LABELS[hl.stamp] ?? hl.stamp}
                    </p>
                  </div>
                  <span className="text-stone-300" aria-hidden>
                    →
                  </span>
                </Link>
              );
            })()}
        </div>
      )}
    </div>
  );
}
