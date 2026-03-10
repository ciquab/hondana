import { AppTopNav } from '@/components/app-top-nav';
import { redirect } from 'next/navigation';
import { KidRecordForm } from '@/components/kid-record-form';
import { getKidSessionChildId } from '@/lib/kids/session';

export default async function KidsNewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; author?: string; isbn?: string }>;
}) {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const params = await searchParams;

  return (
    <main className="mx-auto max-w-xl p-4">
      <AppTopNav
        title="どくしょきろく"
        backHref="/kids/home"
        backLabel="ホーム"
      />
      <KidRecordForm
        initialTitle={params.title}
        initialAuthor={params.author}
        initialIsbn={params.isbn}
      />
    </main>
  );
}
