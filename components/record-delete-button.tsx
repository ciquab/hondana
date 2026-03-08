'use client';

import { useActionState } from 'react';
import { deleteRecord } from '@/app/actions/record';
import type { ActionResult } from '@/lib/actions/types';

export function RecordDeleteButton({ recordId }: { recordId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteRecord,
    {}
  );

  return (
    <form
      action={formAction}
      className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
      onSubmit={(e) => {
        if (!window.confirm('この記録を削除します。よろしいですか？')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="recordId" value={recordId} />
      <p className="mb-2 text-sm text-red-700">
        誤って登録した記録を削除できます。削除後は元に戻せません。
      </p>
      {state.error && (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? '削除中…' : 'この記録を削除'}
      </button>
    </form>
  );
}
