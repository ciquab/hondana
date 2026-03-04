import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getChildrenForCurrentUser } from '@/lib/db/family';
import { KidsLoginForm } from '@/components/kids-login-form';

export default async function KidsLoginPage() {
  const children = await getChildrenForCurrentUser();

  if (children.length === 0) {
    redirect('/settings/children');
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <Link className="mb-3 inline-block text-sm text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>
      <h1 className="mb-4 text-2xl font-bold">こどもログイン</h1>
      <KidsLoginForm childOptions={children.map((child) => ({ id: child.id, display_name: child.display_name }))} />
    </main>
  );
}
