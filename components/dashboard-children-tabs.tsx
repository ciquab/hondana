'use client';

import Link from 'next/link';
import { useState } from 'react';

type Child = {
  id: string;
  display_name: string;
  birth_year: number | null;
};

type Props = {
  children: Child[];
  recordCounts: Record<string, number>;
  monthlyByChild: Record<string, number>;
};

export function DashboardChildrenTabs({ children, recordCounts, monthlyByChild }: Props) {
  const [activeId, setActiveId] = useState<string>(children[0]?.id ?? '');

  if (children.length === 0) {
    return <p className="text-slate-600">子どもプロフィールがありません。追加してください。</p>;
  }

  const active = children.find((c) => c.id === activeId) ?? children[0];

  return (
    <div>
      {/* タブ */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {children.map((child) => (
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
        </div>
      )}
    </div>
  );
}
