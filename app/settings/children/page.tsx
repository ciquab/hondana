'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createChild, type ActionResult } from '@/app/actions/family';

export default function ChildrenSettingsPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createChild, {});

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">子どもプロフィール作成</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      <form action={formAction} className="rounded-xl bg-white p-4 shadow">
        <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
          表示名
        </label>
        <input
          id="displayName"
          name="displayName"
          className="mb-3 w-full rounded border p-2"
          placeholder="例: たろう"
          required
        />

        <label htmlFor="birthYear" className="mb-2 block text-sm font-medium">
          生年（任意）
        </label>
        <input
          id="birthYear"
          name="birthYear"
          type="number"
          className="mb-4 w-full rounded border p-2"
          placeholder="2018"
        />

        {state.error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? '追加中…' : '子どもを追加'}
        </button>
      </form>
    </main>
  );
}
