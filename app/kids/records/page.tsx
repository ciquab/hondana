import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { KidsBookshelf } from '@/components/kids-bookshelf';
import { ageText } from '@/lib/kids/age-text';
import { resolveKidAgeMode } from '@/lib/kids/age-mode-server';

type BookRow = {
  id: string;
  created_at: string;
  title: string | null;
  cover_url: string | null;
  genre: string | null;
  stamp: string | null;
};

export default async function KidsRecordsPage() {
  const { childId, supabase } = await requireKidContext();
  const [{ data: childRows }, { data: recordRows }] = await Promise.all([
    supabase.rpc('get_kid_child_profile', { target_child_id: childId }),
    supabase.rpc('get_kid_recent_records', {
      target_child_id: childId,
      max_rows: 120
    })
  ]);

  const child = childRows?.[0];

  if (!child) redirect('/kids/login');

  const ageMode = await resolveKidAgeMode(supabase, childId);
  const records = (recordRows ?? []) as BookRow[];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link
        href="/kids/home"
        className="mb-3 inline-block text-sm text-blue-600 underline"
      >
        {ageText(ageMode, { junior: 'ほーむへ', standard: 'こどもホームへもどる' })}
      </Link>

      <KidsBookshelf records={records} childName={child.display_name} />
    </main>
  );
}
