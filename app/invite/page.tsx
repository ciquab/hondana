import Link from 'next/link';
import { InviteAcceptForm } from '@/components/invite-accept-form';

export default async function InvitePage({
  searchParams
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const defaultCode = (params.code ?? '').toUpperCase();

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">家族に参加</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      <p className="mb-4 text-sm text-slate-600">
        パートナーから受け取った招待コードを入力して、家族に参加できます。QRリンクから開いた場合は自動入力されます。
      </p>

      <InviteAcceptForm defaultCode={defaultCode} />
    </main>
  );
}
