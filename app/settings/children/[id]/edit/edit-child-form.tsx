'use client';

import { useActionState } from 'react';
import { updateChild, type ActionResult } from '@/app/actions/family';

type Props = {
  child: {
    id: string;
    displayName: string;
    birthYear: number | null;
    ageModeOverride: 'auto' | 'junior' | 'standard';
  };
};

export function EditChildForm({ child }: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateChild,
    {}
  );

  return (
    <form action={formAction} className="rounded-xl bg-white p-4 shadow">
      <input type="hidden" name="childId" value={child.id} />

      <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
        表示名
      </label>
      <input
        id="displayName"
        name="displayName"
        className="mb-3 w-full rounded border p-2"
        defaultValue={child.displayName}
        required
      />

      <label htmlFor="birthYear" className="mb-2 block text-sm font-medium">
        生まれた年（年齢に合わせた表示調整に利用）
      </label>
      <input
        id="birthYear"
        name="birthYear"
        type="number"
        className="mb-4 w-full rounded border p-2"
        defaultValue={child.birthYear ?? ''}
        placeholder="例: 2018"
      />

      <fieldset className="mb-4 rounded border p-3">
        <legend className="px-1 text-sm font-medium">年齢モード</legend>
        <label className="mb-2 flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="ageModeOverride"
            value="auto"
            defaultChecked={child.ageModeOverride === 'auto'}
          />
          <span>自動（生年から判定）</span>
        </label>
        <label className="mb-2 flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="ageModeOverride"
            value="junior"
            defaultChecked={child.ageModeOverride === 'junior'}
          />
          <span>低学年モード固定（ひらがな中心）</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="ageModeOverride"
            value="standard"
            defaultChecked={child.ageModeOverride === 'standard'}
          />
          <span>標準モード固定</span>
        </label>
      </fieldset>

      {state.error && (
        <p className="mb-3 text-sm text-red-600">{state.error}</p>
      )}
      {state.ok && <p className="mb-3 text-sm text-green-700">{state.ok}</p>}

      <button
        className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        {pending ? '更新中…' : '更新する'}
      </button>
    </form>
  );
}
