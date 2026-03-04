'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createFamily, createInvite, revokeInvite, type ActionResult } from '@/app/actions/family';
import { createClient } from '@/lib/supabase/client';

type ActiveInvite = {
  id: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
};

function KidLoginCard({ familyId }: { familyId: string }) {
  const kidLoginUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/kids/login?familyId=${familyId}`;
    return `${window.location.origin}/kids/login?familyId=${familyId}`;
  }, [familyId]);

  const qrUrl = useMemo(
    () =>
      `https://quickchart.io/qr?text=${encodeURIComponent(kidLoginUrl)}&size=220&margin=2&ecLevel=M`,
    [kidLoginUrl]
  );

  return (
    <div className="rounded border bg-white p-3">
      <div className="mt-2 flex justify-center">
        <img src={qrUrl} alt="こどもログインQRコード" className="h-40 w-40 rounded border bg-white p-2" />
      </div>
      <p className="mt-2 break-all rounded bg-slate-50 p-2 text-xs text-slate-600">{kidLoginUrl}</p>
    </div>
  );
}

function InviteCard({ code }: { code: string }) {
  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/invite?code=${encodeURIComponent(code)}`;
    return `${window.location.origin}/invite?code=${encodeURIComponent(code)}`;
  }, [code]);

  const qrUrl = useMemo(
    () =>
      `https://quickchart.io/qr?text=${encodeURIComponent(inviteUrl)}&size=220&margin=2&ecLevel=M`,
    [inviteUrl]
  );

  return (
    <div className="rounded border bg-blue-50 p-3">
      <p className="mb-1 text-sm text-slate-600">招待コード:</p>
      <p className="text-center font-mono text-2xl font-bold tracking-widest text-blue-700">{code}</p>
      <p className="mt-2 text-xs text-slate-500">QRを読み取るか、コードを入力して参加できます。</p>
      <div className="mt-2 flex justify-center">
        <img src={qrUrl} alt="招待QRコード" className="h-40 w-40 rounded border bg-white p-2" />
      </div>
      <p className="mt-2 break-all rounded bg-white p-2 text-xs text-slate-600">{inviteUrl}</p>
    </div>
  );
}

export default function FamilySettingsPage() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [activeInvites, setActiveInvites] = useState<ActiveInvite[]>([]);

  const [familyState, familyAction, familyPending] = useActionState<ActionResult, FormData>(
    createFamily,
    {}
  );
  const [inviteState, inviteAction, invitePending] = useActionState<ActionResult, FormData>(
    createInvite,
    {}
  );
  const [revokeState, revokeAction, revokePending] = useActionState<ActionResult, FormData>(
    revokeInvite,
    {}
  );

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: fm } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .limit(1);

      const rows = fm ?? [];
      setHasFamily(rows.length > 0);
      if (rows.length === 0) return;

      const fid = rows[0].family_id as string;
      setFamilyId(fid);

      const { data: inviteRows } = await supabase.rpc('get_active_family_invites', {
        target_family_id: fid
      });

      setActiveInvites((inviteRows ?? []) as ActiveInvite[]);
    };

    load();
  }, [inviteState.inviteCode, revokeState.ok]);

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
        <section className="mb-6 rounded-xl bg-emerald-50 p-4 shadow">
          <h2 className="mb-2 text-lg font-semibold">こどもログインURL</h2>
          <p className="mb-3 text-sm text-slate-600">
            子どもの端末でこのURLを開くか、QRコードを読み取ると、親のログインなしでこどもモードにアクセスできます。
          </p>
          <KidLoginCard familyId={familyId} />
        </section>
      )}

      {familyId && (
        <section className="space-y-4 rounded-xl bg-white p-4 shadow">
          <h2 className="text-lg font-semibold">パートナーを招待</h2>
          <p className="text-sm text-slate-600">
            招待コードを発行して、もう一人の保護者をこの家族に追加できます。コードの有効期限は48時間です。
          </p>

          <form action={inviteAction}>
            <input type="hidden" name="familyId" value={familyId} />

            {inviteState.error && (
              <p className="mb-3 text-sm text-red-600" role="alert">
                {inviteState.error}
              </p>
            )}

            <button
              className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
              type="submit"
              disabled={invitePending}
            >
              {invitePending ? '発行中…' : '招待コードを発行'}
            </button>
          </form>

          {inviteState.inviteCode && <InviteCard code={inviteState.inviteCode} />}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">有効な招待コード</h3>
            {revokeState.error && <p className="mb-2 text-sm text-red-600">{revokeState.error}</p>}
            {revokeState.ok && <p className="mb-2 text-sm text-green-700">{revokeState.ok}</p>}

            {activeInvites.length === 0 ? (
              <p className="text-sm text-slate-500">現在有効な招待コードはありません。</p>
            ) : (
              <ul className="space-y-2">
                {activeInvites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="font-mono font-semibold tracking-widest">{invite.invite_code}</p>
                      <p className="text-xs text-slate-500">
                        期限: {new Date(invite.expires_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <form action={revokeAction}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="rounded bg-slate-700 px-3 py-1 text-xs text-white disabled:opacity-50"
                        disabled={revokePending}
                      >
                        無効化
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
