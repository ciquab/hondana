'use client';

import type { DashboardAction } from '@/lib/db/dashboard-actions';
import { TrackedLink } from '@/components/tracked-link';

type Props = {
  actions: DashboardAction[];
};

export function DashboardActions({ actions }: Props) {
  if (actions.length === 0) {
    return (
      <section className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="text-emerald-600" aria-hidden>
          ✓
        </span>
        <p className="text-sm font-medium text-emerald-700">
          すべて対応済みです
        </p>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <h2 className="mb-2 text-sm font-semibold text-stone-500">
        対応が必要な項目（{actions.length}件）
      </h2>
      <ul className="surface overflow-hidden divide-y divide-stone-100">
        {actions.map((action, i) => (
          <li key={i}>
            <TrackedLink
              href={action.href}
              eventName="dashboard_action_click"
              target={action.href}
              meta={{ icon: action.icon, childName: action.childName }}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-stone-50"
            >
              <span className="text-xl" aria-hidden>
                {action.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">
                  {action.childName}の記録に
                  {action.icon === '💬' ? 'コメント' : 'アクション'}
                </p>
                <p className="truncate text-xs text-stone-400">
                  {action.message}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-orange-600">
                対応する →
              </span>
            </TrackedLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
