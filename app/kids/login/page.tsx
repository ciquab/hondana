import Link from 'next/link';
import { KidsLoginForm } from '@/components/kids-login-form';
import { createServiceClient } from '@/lib/supabase/service';

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
          <p className="text-sm text-slate-500">保護者の方は「家族設定」ページでURLを確認できます。</p>
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
    </main>
  );
}
