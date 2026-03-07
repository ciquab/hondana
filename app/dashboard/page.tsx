import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { getChildrenForCurrentUser, getFamiliesForCurrentUser } from '@/lib/db/family';
import { getRecordCountsForChildren, getMonthlyReadCountsForChildren } from '@/lib/db/records';

export default async function DashboardPage() {
  const families = await getFamiliesForCurrentUser();

  if (families.length === 0) {
    redirect('/settings/family');
  }

  const children = await getChildrenForCurrentUser();
  const childIds = children.map((c) => c.id);
  const [recordCounts, { total: monthlyTotal, byChild: monthlyByChild }] = await Promise.all([
    getRecordCountsForChildren(childIds),
    getMonthlyReadCountsForChildren(childIds),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <form action={signOut}>
          <button className="rounded border px-3 py-1">ログアウト</button>
        </form>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="rounded bg-blue-600 px-3 py-2 text-white" href="/settings/family">
          家族設定
        </Link>
        <Link className="rounded bg-emerald-600 px-3 py-2 text-white" href="/settings/children">
          子ども追加
        </Link>
        <Link className="rounded bg-purple-600 px-3 py-2 text-white" href="/invite">
          招待コードで参加
        </Link>
        <Link className="rounded bg-amber-600 px-3 py-2 text-white" href="/kids/login">
          こどもモード
        </Link>
      </div>

      {children.length > 0 && (
        <section className="mb-4 rounded-xl bg-blue-50 p-4 shadow">
          <h2 className="mb-2 text-sm font-semibold text-blue-700">
            📅 今月の読書まとめ（{new Date().getMonth() + 1}月）
          </h2>
          <p className="mb-2 text-2xl font-bold text-blue-900">{monthlyTotal} 冊</p>
          {children.length > 1 && (
            <ul className="space-y-1">
              {children.map((child) => (
                <li key={child.id} className="flex items-center justify-between text-sm">
                  <span className="text-blue-800">{child.display_name}</span>
                  <span className="font-medium text-blue-700">{monthlyByChild[child.id] ?? 0} 冊</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">子ども一覧</h2>
        {children.length === 0 ? (
          <p className="text-slate-600">子どもプロフィールがありません。追加してください。</p>
        ) : (
          <ul className="space-y-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/children/${child.id}`}
                  className="block rounded border p-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{child.display_name}</p>
                      <p className="text-sm text-slate-600">
                        生年: {child.birth_year ?? '未設定'}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {recordCounts[child.id] ?? 0} 冊
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
