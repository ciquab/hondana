import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { getChildrenForCurrentUser, getFamiliesForCurrentUser } from '@/lib/db/family';
import { getRecordCountsForChildren, getMonthlyReadCountsForChildren } from '@/lib/db/records';
import { getDashboardActions, getWeeklyHighlights } from '@/lib/db/dashboard-actions';
import { DashboardChildrenTabs } from '@/components/dashboard-children-tabs';
import { DashboardActions } from '@/components/dashboard-actions';

export default async function DashboardPage() {
  const families = await getFamiliesForCurrentUser();

  if (families.length === 0) {
    redirect('/settings/family');
  }

  const children = await getChildrenForCurrentUser();
  const childIds = children.map((c) => c.id);
  const [recordCounts, { total: monthlyTotal, byChild: monthlyByChild }, dashboardActions, weeklyHighlights] = await Promise.all([
    getRecordCountsForChildren(childIds),
    getMonthlyReadCountsForChildren(childIds),
    getDashboardActions(childIds),
    getWeeklyHighlights(childIds),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <form action={signOut}>
          <button className="rounded border px-3 py-1">ログアウト</button>
        </form>
      </header>

      <section className="mb-4 rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-base font-semibold text-slate-800">よく使うメニュー</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 transition hover:bg-blue-100"
            href="/settings/family"
          >
            <p className="text-sm font-semibold text-blue-900">🏠 家族設定</p>
            <p className="mt-1 text-xs text-blue-800/80">家族情報の確認・編集</p>
          </Link>
          <Link
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 transition hover:bg-emerald-100"
            href="/settings/children"
          >
            <p className="text-sm font-semibold text-emerald-900">👦 子ども追加</p>
            <p className="mt-1 text-xs text-emerald-800/80">プロフィールを登録</p>
          </Link>
          <Link
            className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 transition hover:bg-purple-100"
            href="/invite"
          >
            <p className="text-sm font-semibold text-purple-900">🤝 招待コードで参加</p>
            <p className="mt-1 text-xs text-purple-800/80">他の保護者を招待する</p>
          </Link>
          <Link
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
            href="/kids/login"
          >
            <p className="text-sm font-semibold text-amber-900">🧒 こどもモード</p>
            <p className="mt-1 text-xs text-amber-800/80">お子さま向け画面へ移動</p>
          </Link>
        </div>
      </section>

      {children.length > 0 && (
        <section className="mb-4 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 p-4 shadow">
          <h2 className="mb-2 text-sm font-semibold text-white/90">
            📅 今月の読書まとめ（{new Date().getMonth() + 1}月）
          </h2>
          <p className="mb-2 text-2xl font-bold text-white">{monthlyTotal} 冊</p>
          {children.length > 1 && (
            <ul className="space-y-1">
              {children.map((child) => (
                <li key={child.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/90">{child.display_name}</span>
                  <span className="font-medium text-white">{monthlyByChild[child.id] ?? 0} 冊</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {children.length > 0 && (
        <DashboardActions actions={dashboardActions} />
      )}

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">子ども一覧</h2>
        <DashboardChildrenTabs
          children={children}
          recordCounts={recordCounts}
          monthlyByChild={monthlyByChild}
          weeklyHighlights={weeklyHighlights}
        />
      </section>
    </main>
  );
}
