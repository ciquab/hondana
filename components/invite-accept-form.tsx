'use client';

import { useActionState } from 'react';
import { acceptInvite, type ActionResult } from '@/app/actions/family';

export function InviteAcceptForm({ defaultCode }: { defaultCode: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(acceptInvite, {});

  return (
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
        defaultValue={defaultCode}
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
  );
}
