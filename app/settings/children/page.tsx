'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createChild, type ActionResult } from '@/app/actions/family';
import { createClient } from '@/lib/supabase/client';

type ChildRow = {
  id: string;
  display_name: string;
};

export default function ChildrenSettingsPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createChild, {});
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: members } = await supabase.from('family_members').select('family_id').eq('user_id', user.id);
      const familyIds = (members ?? []).map((row) => row.family_id);
      if (familyIds.length === 0) {
        setChildren([]);
        return;
      }

      const { data: childRows } = await supabase
        .from('children')
        .select('id, display_name, created_at')
        .in('family_id', familyIds)
        .order('created_at', { ascending: false });

      setChildren((childRows ?? []) as ChildRow[]);
    };

    load();
  }, [state.error]);

  const loginBase = useMemo(() => (origin ? `${origin}/kids/login` : '/kids/login'), [origin]);

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">子どもプロフィール作成</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      <form action={formAction} className="rounded-xl bg-white p-4 shadow">
        <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
          表示名
        </label>
        <input
          id="displayName"
          name="displayName"
          className="mb-3 w-full rounded border p-2"
          placeholder="例: たろう"
          required
        />

        <label htmlFor="birthYear" className="mb-2 block text-sm font-medium">
          生年（任意）
        </label>
        <input
          id="birthYear"
          name="birthYear"
          type="number"
          className="mb-3 w-full rounded border p-2"
          placeholder="2018"
        />

        <label htmlFor="pin" className="mb-2 block text-sm font-medium">
          4桁PIN（子どもログイン用）
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          className="mb-4 w-full rounded border p-2"
          placeholder="例: 1234"
          required
        />

        {state.error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? '追加中…' : '子どもを追加'}
        </button>
      </form>

      <section className="mt-6 rounded-xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">子どもログイン用リンク（PINのみ入力）</h2>
        <p className="mt-1 text-sm text-slate-600">QRコードやURLを子どもの端末に渡すと、子どもID入力なしでPINだけでログインできます。</p>

        {children.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">まだ子どもプロフィールがありません。</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {children.map((child) => {
              const loginUrl = `${loginBase}?childId=${encodeURIComponent(child.id)}`;
              const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(loginUrl)}&size=180&margin=2&ecLevel=M`;

              return (
                <li key={child.id} className="rounded border p-3">
                  <p className="font-medium">{child.display_name}</p>
                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    <div>
                      <img src={qrUrl} alt={`${child.display_name} ログインQR`} className="h-28 w-28 rounded border bg-white p-1" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs text-slate-600">
                      <p className="mb-1">ログインURL</p>
                      <p className="break-all rounded bg-slate-50 p-2">{loginUrl}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
