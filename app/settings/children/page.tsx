import Link from 'next/link';
import { createChild } from '@/app/actions/family';

export default function ChildrenSettingsPage() {
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">子どもプロフィール作成</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      <form action={createChild} className="rounded-xl bg-white p-4 shadow">
        <label className="mb-2 block text-sm">表示名</label>
        <input
          name="displayName"
          className="mb-3 w-full rounded border p-2"
          placeholder="例: たろう"
          required
        />

        <label className="mb-2 block text-sm">生年（任意）</label>
        <input name="birthYear" type="number" className="mb-4 w-full rounded border p-2" placeholder="2018" />

        <button className="rounded bg-emerald-600 px-4 py-2 text-white" type="submit">
          子どもを追加
        </button>
      </form>
    </main>
  );
}
