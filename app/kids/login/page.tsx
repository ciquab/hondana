import Link from 'next/link';
<<<<<<< Updated upstream
=======
import { createServiceClient } from '@/lib/supabase/service';
>>>>>>> Stashed changes
import { KidsLoginForm } from '@/components/kids-login-form';
import { getChildrenForCurrentUser } from '@/lib/db/family';
import { canCreateAdminClient } from '@/lib/supabase/admin';

<<<<<<< Updated upstream
export default async function KidsLoginPage() {
  const children = await getChildrenForCurrentUser();
  const kidModeReady = canCreateAdminClient();

  return (
    <main className="mx-auto max-w-md p-4">
      <Link className="mb-3 inline-block text-sm text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>
      <h1 className="mb-2 text-2xl font-bold">こどもログイン</h1>
      <p className="mb-4 text-sm text-slate-600">子どもIDと4桁PINでログインできます。</p>
      {!kidModeReady ? (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          こどもモードのサーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。
        </p>
      ) : null}
      <KidsLoginForm
        childOptions={children.map((child) => ({ id: child.id, display_name: child.display_name }))}
        disabled={!kidModeReady}
      />
=======
type Props = {
  searchParams: Promise<{ familyId?: string }>;
};

export default async function KidsLoginPage({ searchParams }: Props) {
  const { familyId } = await searchParams;

  if (!familyId) {
    return (
      <main className="mx-auto max-w-md p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold">こどもログイン</h1>
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="mb-3 text-slate-700">
            保護者の方から<strong>こどもログインURL</strong>を受け取ってアクセスしてください。
          </p>
          <p className="text-sm text-slate-500">
            保護者の方は「家族設定」ページでURLを確認できます。
          </p>
        </div>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 underline">
          保護者ログインはこちら
        </Link>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: children } = await supabase
    .from('children')
    .select('id, display_name')
    .eq('family_id', familyId)
    .order('created_at');

  if (!children || children.length === 0) {
    return (
      <main className="mx-auto max-w-md p-4 text-center">
        <h1 className="mb-4 text-2xl font-bold">こどもログイン</h1>
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-red-600">URLが正しくないか、子どもが登録されていません。</p>
        </div>
        <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 underline">
          保護者ログインはこちら
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">こどもログイン</h1>
      <KidsLoginForm
        familyId={familyId}
        childOptions={children.map((c) => ({ id: c.id, display_name: c.display_name }))}
      />
      <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 underline">
        保護者ログインはこちら
      </Link>
>>>>>>> Stashed changes
    </main>
  );
}
