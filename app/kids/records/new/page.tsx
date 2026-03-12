import { AppTopNav } from '@/components/app-top-nav';
import { KidRecordForm } from '@/components/kid-record-form';
import { ageText } from '@/lib/kids/age-text';
import { requireKidContext } from '@/lib/kids/client';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

export default async function KidsNewRecordPage({
  searchParams
}: {
  searchParams: Promise<{ title?: string; author?: string; isbn?: string }>;
}) {
  const { childId, supabase } = await requireKidContext();
  const ageMode = await resolveKidAgeMode(supabase, childId);
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: 'きろく',
          standard: '読書記録'
        })}
        backHref="/kids/home"
        backLabel={ageText(ageMode, {
          junior: 'ホーム',
          standard: 'ホーム'
        })}
      />
      <KidRecordForm
        initialTitle={params.title}
        initialAuthor={params.author}
        initialIsbn={params.isbn}
      />
    </main>
  );
}
