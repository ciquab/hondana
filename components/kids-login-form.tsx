'use client';

import { useActionState } from 'react';
import { verifyKidPin, type KidAuthResult } from '@/app/actions/kid-auth';

type Child = {
  id: string;
  display_name: string;
};

export function KidsLoginForm({ childOptions }: { childOptions: Child[] }) {
  const [state, formAction, pending] = useActionState<KidAuthResult, FormData>(verifyKidPin, {});

  return (
    <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow">
      {childOptions.length > 0 ? (
        <div>
          <label htmlFor="childId" className="mb-1 block text-sm font-medium">
            子ども
          </label>
          <select id="childId" name="childId" className="w-full rounded border p-2" required>
            <option value="">選択してください</option>
            {childOptions.map((child) => (
              <option key={child.id} value={child.id}>
                {child.display_name}（{child.id.slice(0, 8)}）
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="childId" className="mb-1 block text-sm font-medium">
            子どもID
          </label>
          <input
            id="childId"
            name="childId"
            type="text"
            className="w-full rounded border p-2"
            placeholder="子どもIDを入力"
            required
          />
        </div>
      )}

      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-medium">
          4桁PIN
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
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? '確認中…' : 'ログイン'}
      </button>
    </form>
  );
}
