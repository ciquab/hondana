import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { getChildrenForCurrentUser, getFamiliesForCurrentUser } from '@/lib/db/family';
import { getRecordCountsForChildren } from '@/lib/db/records';

export default async function DashboardPage() {
  const families = await getFamiliesForCurrentUser();

  if (families.length === 0) {
    redirect('/settings/family');
  }

  const children = await getChildrenForCurrentUser();
  const recordCounts = await getRecordCountsForChildren(children.map((c) => c.id));

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <form action={signOut}>
          <button className="rounded border px-3 py-1">ログアウト</button>
        </form>
      </header>

      <div className="mb-4 flex gap-2">
        <Link className="rounded bg-blue-600 px-3 py-2 text-white" href="/settings/family">
          家族設定
        </Link>
        <Link className="rounded bg-emerald-600 px-3 py-2 text-white" href="/settings/children">
          子ども追加
        </Link>
      </div>

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
