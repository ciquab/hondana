import { KidsLoginForm } from '@/components/kids-login-form';
import { canCreateAdminClient } from '@/lib/supabase/admin';

export default async function KidsLoginPage() {
  const kidModeReady = canCreateAdminClient();

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-2 text-2xl font-bold">こどもログイン</h1>
      <p className="mb-4 text-sm text-slate-600">子どもIDと4桁PINでログインできます。</p>
      {!kidModeReady ? (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          こどもモードのサーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。
        </p>
      ) : null}
      <KidsLoginForm disabled={!kidModeReady} />
    </main>
  );
}
