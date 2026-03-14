import { notFound } from 'next/navigation';
import { AppTopNav } from '@/components/app-top-nav';
import { KidRecordForm } from '@/components/kid-record-form';
import { requireKidContext } from '@/lib/kids/client';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';
import { ageText } from '@/lib/kids/age-text';

type RecordRow = {
  id: string;
  status: string;
  memo: string | null;
  finished_on: string | null;
  genre: string | null;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  cover_url: string | null;
  stamp: string | null;
  feeling_tags: string[] | null;
};

export default async function KidsEditRecordPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  const { childId, supabase } = await requireKidContext();
  const ageMode = await resolveKidAgeMode(supabase, childId);

  const { data: rows } = await supabase.rpc('get_kid_record_detail', {
    target_child_id: childId,
    target_record_id: recordId,
  });

  const record = (rows as RecordRow[] | null)?.[0];
  if (!record) notFound();

  return (
    <main className="mx-auto max-w-xl p-4">
      <AppTopNav
        title={ageText(ageMode, {
          junior: 'きろくをへんしゅう',
          standard: '記録を編集',
        })}
        backHref={`/kids/records/${recordId}`}
        backLabel={ageText(ageMode, {
          junior: 'もどる',
          standard: '戻る',
        })}
      />
      <KidRecordForm
        recordId={recordId}
        initialTitle={record.title ?? ''}
        initialAuthor={record.author ?? ''}
        initialIsbn={record.isbn13 ?? ''}
        initialCoverUrl={record.cover_url ?? undefined}
        initialStamp={record.stamp ?? undefined}
        initialStatus={
          (record.status as 'finished' | 'reading' | 'read_aloud') ?? 'finished'
        }
        initialMemo={record.memo ?? undefined}
        initialFinishedOn={record.finished_on ?? undefined}
        initialGenre={record.genre ?? undefined}
        initialFeelingTags={record.feeling_tags ?? []}
      />
    </main>
  );
}
