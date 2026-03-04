'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { acceptInvite, type ActionResult } from '@/app/actions/family';

export default function InvitePage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(acceptInvite, {});

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">家族に参加</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      <p className="mb-4 text-sm text-slate-600">
        パートナーから受け取った招待コードを入力して、家族に参加できます。
      </p>

      <form action={formAction} className="rounded-xl bg-white p-4 shadow">
        <label htmlFor="inviteCode" className="mb-2 block text-sm font-medium">
          招待コード
        </label>
        <input
          id="inviteCode"
          name="code"
          className="mb-3 w-full rounded border p-2 text-center font-mono text-lg uppercase tracking-widest"
          placeholder="ABCD1234"
          maxLength={8}
          required
        />

        {state.error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="w-full rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? '参加中…' : '家族に参加する'}
        </button>
      </form>
    </main>
  );
}
