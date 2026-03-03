'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { createFamily, type ActionResult } from '@/app/actions/family';
import { createClient } from '@/lib/supabase/client';

export default function FamilySettingsPage() {
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createFamily, {});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .limit(1)
        .then(({ data }) => {
          setHasFamily((data ?? []).length > 0);
        });
    });
  }, []);

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">家族設定</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      {hasFamily === null ? null : hasFamily ? (
        <div className="mb-6 rounded bg-green-50 p-4 text-green-800">
          家族は作成済みです。必要であれば別家族を追加できます。
        </div>
      ) : (
        <div className="mb-6 rounded bg-amber-50 p-4 text-amber-800">
          まだ家族がありません。最初の家族を作成してください。
        </div>
      )}

      <form action={formAction} className="rounded-xl bg-white p-4 shadow">
        <label htmlFor="familyName" className="mb-2 block text-sm font-medium">
          家族名
        </label>
        <input
          id="familyName"
          name="name"
          className="mb-3 w-full rounded border p-2"
          placeholder="例: 田中ファミリー"
          required
        />

        {state.error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? '作成中…' : '家族を作成'}
        </button>
      </form>
    </main>
  );
}
