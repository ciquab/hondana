'use client';

import { useActionState } from 'react';
import { setChildPin, type ActionResult } from '@/app/actions/family';

type Props = {
  childId: string;
  hasPinAlready: boolean;
};

export default function SetChildPinForm({ childId, hasPinAlready }: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(setChildPin, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="childId" value={childId} />

      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-medium">
          新しいPIN（4桁）
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          className="w-full rounded border p-2"
          placeholder="例: 1234"
          required
        />
      </div>

      <div>
        <label htmlFor="pinConfirm" className="mb-1 block text-sm font-medium">
          PIN確認
        </label>
        <input
          id="pinConfirm"
          name="pinConfirm"
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          className="w-full rounded border p-2"
          placeholder="もう一度入力"
          required
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-700" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? '設定中…' : hasPinAlready ? 'PINを変更する' : 'PINを設定する'}
      </button>
    </form>
  );
}
