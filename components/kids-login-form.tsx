'use client';

import { useActionState } from 'react';
import { verifyKidPin, type KidAuthResult } from '@/app/actions/kid-auth';

export function KidsLoginForm({
  disabled = false,
  childIdFromLink = ''
}: {
  disabled?: boolean;
  childIdFromLink?: string;
}) {
  const [state, formAction, pending] = useActionState<KidAuthResult, FormData>(
    verifyKidPin,
    {}
  );
  const hasChildIdInLink = childIdFromLink.length > 0;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl bg-white p-4 shadow"
    >
      {hasChildIdInLink ? (
        <>
          <input type="hidden" name="childId" value={childIdFromLink} />
          <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
            ログインリンクを かくにんしました。PINをいれてください。
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="childId" className="mb-1 block text-sm font-medium">
            こどもID
          </label>
          <input
            id="childId"
            name="childId"
            type="text"
            className="w-full rounded border p-2"
            placeholder="こどもIDをいれてね"
            required
            disabled={disabled}
          />
        </div>
      )}

      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-medium">
          4けたPIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          className="w-full rounded border p-2"
          placeholder="0000"
          required
          disabled={disabled}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {disabled ? 'せっていまち' : pending ? 'かくにんちゅう…' : 'ログイン'}
      </button>
    </form>
  );
}
