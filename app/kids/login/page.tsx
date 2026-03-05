import { KidsLoginForm } from '@/components/kids-login-form';
import { canUseKidSession } from '@/lib/kids/session';

export default async function KidsLoginPage({
  searchParams
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const kidModeReady = canUseKidSession();
  const params = await searchParams;
  const childIdFromLink = String(params.childId ?? '').trim();

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-2 text-2xl font-bold">こどもログイン</h1>
      <p className="mb-4 text-sm text-slate-600">
        保護者から受け取ったURLから開いた場合は、4桁PINだけでログインできます。
      </p>
      {!kidModeReady ? (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          こどもモードのサーバー設定が不足しています（KID_SESSION_SECRET）。
        </p>
      ) : null}
      <KidsLoginForm disabled={!kidModeReady} childIdFromLink={childIdFromLink} />
    </main>
  );
}
