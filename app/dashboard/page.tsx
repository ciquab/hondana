import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import {
  getChildrenForCurrentUser,
  getFamiliesForCurrentUser
} from '@/lib/db/family';
import {
  getRecordCountsForChildren,
  getMonthlyReadCountsForChildren
} from '@/lib/db/records';
import {
  getDashboardActions,
  getWeeklyHighlights
} from '@/lib/db/dashboard-actions';
import { DashboardChildrenTabs } from '@/components/dashboard-children-tabs';
import { DashboardActions } from '@/components/dashboard-actions';

export default async function DashboardPage() {
  const families = await getFamiliesForCurrentUser();

  if (families.length === 0) {
    redirect('/settings/family');
  }

  const currentFamilyName =
    ((families[0]?.families as { name?: string } | null)?.name ?? '').trim() ||
    '（未設定）';

  const children = await getChildrenForCurrentUser();
  const childIds = children.map((c) => c.id);
  const [
    recordCounts,
    { total: monthlyTotal, byChild: monthlyByChild },
    dashboardActions,
    weeklyHighlights
  ] = await Promise.all([
    getRecordCountsForChildren(childIds),
    getMonthlyReadCountsForChildren(childIds),
    getDashboardActions(childIds),
    getWeeklyHighlights(childIds)
  ]);

  const currentMonth = new Date().getMonth() + 1;

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* ヘッダー：ブランド色で家族名を主語に */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400">家族の読書記録</p>
          <h1 className="text-xl font-bold text-amber-800">{currentFamilyName}</h1>
        </div>
        <form action={signOut}>
          <button className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-50">
            ログアウト
          </button>
        </form>
      </header>

      {/* 今月のサマリー：数字を先に見せる */}
      {children.length > 0 && (
        <section className="mb-4 surface p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-stone-400">{currentMonth}月の読書</p>
              <p className="mt-0.5 text-3xl font-bold text-stone-900">
                {monthlyTotal}
                <span className="ml-1 text-base font-normal text-stone-500">冊</span>
              </p>
            </div>
            {children.length > 1 && (
              <ul className="flex flex-col items-end gap-1">
                {children.map((child) => (
                  <li key={child.id} className="flex items-center gap-2 text-sm">
                    <span className="text-stone-500">{child.display_name}</span>
                    <span className="font-semibold text-stone-800">
                      {monthlyByChild[child.id] ?? 0} 冊
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* アクション：「今やること」は目立たせる */}
      {children.length > 0 && <DashboardActions actions={dashboardActions} />}

      {/* 子ども一覧 */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-stone-500">子ども</h2>
        <div className="surface overflow-hidden">
          <DashboardChildrenTabs
            childProfiles={children}
            recordCounts={recordCounts}
            monthlyByChild={monthlyByChild}
            weeklyHighlights={weeklyHighlights}
          />
        </div>
      </section>

      {/* 設定リンク：最小限のみ */}
      <nav className="flex flex-wrap gap-2">
        <Link
          href="/settings/family"
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
        >
          家族設定
        </Link>
        <Link
          href="/settings/children"
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
        >
          子どもを追加
        </Link>
        <Link
          href="/invite"
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
        >
          招待コードで参加
        </Link>
        <Link
          href="/kids/login"
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
        >
          子どもモードへ
        </Link>
      </nav>
    </main>
  );
}
