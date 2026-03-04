'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { createFamily, createInvite, type ActionResult } from '@/app/actions/family';
import { createClient } from '@/lib/supabase/client';

export default function FamilySettingsPage() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [familyState, familyAction, familyPending] = useActionState<ActionResult, FormData>(
    createFamily,
    {}
  );
  const [inviteState, inviteAction, invitePending] = useActionState<ActionResult, FormData>(
    createInvite,
    {}
  );

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
          const rows = data ?? [];
          setHasFamily(rows.length > 0);
          if (rows.length > 0) {
            setFamilyId(rows[0].family_id);
          }
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
        <div className="mb-6 space-y-3">
          <div className="rounded bg-amber-50 p-4 text-amber-800">
            まだ家族がありません。最初の家族を作成してください。
          </div>
          <div className="rounded bg-purple-50 p-4 text-purple-800">
            招待コードをお持ちですか？{' '}
            <Link href="/invite" className="font-medium underline">
              こちらから家族に参加
            </Link>
          </div>
        </div>
      )}

      <form action={familyAction} className="mb-6 rounded-xl bg-white p-4 shadow">
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

        {familyState.error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {familyState.error}
          </p>
        )}

        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={familyPending}
        >
          {familyPending ? '作成中…' : '家族を作成'}
        </button>
      </form>

      {familyId && (
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">パートナーを招待</h2>
          <p className="mb-3 text-sm text-slate-600">
            招待コードを発行して、もう一人の保護者をこの家族に追加できます。コードの有効期限は48時間です。
          </p>

          <form action={inviteAction}>
            <input type="hidden" name="familyId" value={familyId} />

            {inviteState.error && (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {inviteState.error}
              </p>
            )}

            {inviteState.inviteCode && (
              <div className="mb-3 rounded bg-blue-50 p-3">
                <p className="mb-1 text-sm text-slate-600">招待コード:</p>
                <p className="text-center font-mono text-2xl font-bold tracking-widest text-blue-700">
                  {inviteState.inviteCode}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  このコードをパートナーに伝えてください。
                </p>
              </div>
            )}

            <button
              className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={invitePending}
            >
              {invitePending ? '発行中…' : '招待コードを発行'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
