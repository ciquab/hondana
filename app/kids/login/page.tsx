import { KidsLoginForm } from '@/components/kids-login-form';
import { canUseKidSession } from '@/lib/kids/session';
import { canCreateAdminClient } from '@/lib/supabase/admin';
import { canCreateKidClient } from '@/lib/supabase/child';

export default async function KidsLoginPage({
  searchParams
}: {
  searchParams: Promise<{ childId?: string }>;
}) {
  const kidModeReady =
    canCreateAdminClient() && canUseKidSession() && canCreateKidClient();
  const params = await searchParams;
  const childIdFromLink = String(params.childId ?? '').trim();

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-2 text-2xl font-bold">こどもログイン</h1>
      <p className="mb-4 text-sm text-slate-600">
        おうちのひとから うけとった URL からひらいたときは、4けたPINだけで
        ログインできます。URLがないときは、ログインIDとPINをいれてね。
      </p>
      {!kidModeReady ? (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          こどももーどの せっていが たりません（SUPABASE_SERVICE_ROLE_KEY /
          KID_SESSION_SECRET / SUPABASE_JWT_SECRET）。
        </p>
      ) : null}
      <KidsLoginForm
        disabled={!kidModeReady}
        childIdFromLink={childIdFromLink}
      />
    </main>
  );
}
