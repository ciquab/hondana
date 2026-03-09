import Link from 'next/link';
import type { DashboardAction } from '@/lib/db/dashboard-actions';

type Props = {
  actions: DashboardAction[];
};

export function DashboardActions({ actions }: Props) {
  if (actions.length === 0) {
    return (
      <section className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-center text-sm font-medium text-emerald-700">
          ✅ 全部できています！
        </p>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-xl bg-white p-4 shadow">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">
        ✅ きょうの やること
      </h2>
      <ul className="space-y-2">
        {actions.map((action, i) => (
          <li key={i}>
            <Link
              href={action.href}
              className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
            >
              <span className="text-xl">{action.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {action.childName}の きろくに {action.icon === '💬' ? 'コメント' : 'アクション'}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {action.message}
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
