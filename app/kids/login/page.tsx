import Link from 'next/link';
import { KidsLoginForm } from '@/components/kids-login-form';
import { getChildrenForCurrentUser } from '@/lib/db/family';

export default async function KidsLoginPage() {
  const children = await getChildrenForCurrentUser();

  return (
    <main className="mx-auto max-w-md p-4">
      <Link className="mb-3 inline-block text-sm text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>
      <h1 className="mb-2 text-2xl font-bold">こどもログイン</h1>
      <p className="mb-4 text-sm text-slate-600">子どもIDと4桁PINでログインできます。</p>
      <KidsLoginForm childOptions={children.map((child) => ({ id: child.id, display_name: child.display_name }))} />
    </main>
  );
}
