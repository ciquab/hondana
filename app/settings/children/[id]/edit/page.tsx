import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { EditChildForm } from '@/app/settings/children/[id]/edit/edit-child-form';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditChildPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!member?.family_id) redirect('/settings/family');

  const { data: child } = await supabase
    .from('children')
    .select('id, display_name, birth_year, age_mode_override')
    .eq('id', id)
    .eq('family_id', member.family_id)
    .maybeSingle();

  if (!child) notFound();

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">子どもプロフィール編集</h1>
      <Link
        className="mb-4 inline-block text-blue-600 underline"
        href="/settings/family"
      >
        家族設定へ戻る
      </Link>

      <EditChildForm
        child={{
          id: child.id,
          displayName: child.display_name,
          birthYear: child.birth_year,
          ageModeOverride:
            child.age_mode_override === 'junior' ||
            child.age_mode_override === 'standard'
              ? child.age_mode_override
              : 'auto'
        }}
      />
    </main>
  );
}
