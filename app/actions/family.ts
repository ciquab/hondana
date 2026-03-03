'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createFamily(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name })
    .select('id')
    .single();

  if (familyError || !family) return;

  const { error: memberError } = await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: user.id,
    role: 'owner'
  });

  // NOTE: We intentionally keep this minimal for Day1.
  // If this insert fails after family creation, an orphan family row can remain.
  // Transactional handling / RPC-based atomic create will be addressed in a future PR.
  if (memberError) return;

  revalidatePath('/dashboard');
  redirect('/settings/children');
}

export async function createChild(formData: FormData) {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const birthYearRaw = String(formData.get('birthYear') ?? '').trim();

  if (!displayName) return;

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

  if (!member?.family_id) {
    redirect('/settings/family');
  }

  await supabase.from('children').insert({
    family_id: member.family_id,
    display_name: displayName,
    birth_year: birthYearRaw ? Number(birthYearRaw) : null
  });

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
