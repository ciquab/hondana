import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KidRecordForm } from '@/components/kid-record-form';
import { getKidSessionChildId } from '@/lib/kids/session';

export default async function KidsNewRecordPage() {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href="/kids/home" className="mb-3 inline-block text-sm text-blue-600 underline">
        こどもホームへ戻る
      </Link>
      <h1 className="mb-4 text-2xl font-bold">どくしょきろく</h1>
      <KidRecordForm />
    </main>
  );
}
