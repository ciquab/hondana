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
    <form action={formAction} className="surface space-y-4 p-4">
      {hasChildIdInLink ? (
        <>
          <input type="hidden" name="childId" value={childIdFromLink} />
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
            ログインリンクを かくにんしました。PINをいれてください。
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="childId" className="mb-1 block text-sm font-medium">
            ログインID
          </label>
          <input
            id="childId"
            name="childId"
            type="text"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase tracking-widest"
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            required
            disabled={disabled}
          />
          <p className="mt-1 text-xs text-slate-500">おうちのひとに きいてね</p>
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
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="0000"
          required
          disabled={disabled}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || disabled}
        className="btn-primary h-14 w-full text-base font-bold disabled:opacity-50"
      >
        {disabled ? 'せっていまち' : pending ? 'かくにんちゅう…' : 'ログイン'}
      </button>
    </form>
  );
}
