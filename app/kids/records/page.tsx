import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireKidContext } from '@/lib/kids/client';
import { KidsBookshelf } from '@/components/kids-bookshelf';
import { ageText } from '@/lib/kids/age-text';
import {
  getAgeModeFromProfile,
  type AgeModeOverride
} from '@/lib/kids/age-mode';

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

  const child = (childRows?.[0] ?? null) as {
    display_name: string;
    birth_year: number | null;
    age_mode_override: AgeModeOverride | null;
  } | null;

  if (!child) redirect('/kids/login');

  const ageMode = getAgeModeFromProfile({
    birthYear: child.birth_year,
    ageModeOverride: child.age_mode_override ?? 'auto'
  });
  const records = (recordRows ?? []) as BookRow[];

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link
        href="/kids/home"
        className="mb-3 inline-block text-sm text-blue-600 underline"
      >
        {ageText(ageMode, {
          junior: 'ホームへ',
          standard: '子どもホームへ戻る'
        })}
      </Link>

      <KidsBookshelf records={records} childName={child.display_name} />

      {/* FAB: 本を登録する */}
      <Link
        href="/kids/records/new"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl text-white shadow-lg transition hover:bg-orange-600 active:scale-95"
        aria-label={ageText(ageMode, {
          junior: 'きろくする',
          standard: '記録をつける'
        })}
      >
        ＋
      </Link>
    </main>
  );
}
