import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function getFamiliesForCurrentUser() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data } = await supabase
    .from('family_members')
    .select('role, families(id, name)')
    .eq('user_id', user.id);

  return data ?? [];
}

export async function getChildrenForCurrentUser() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return [];

  const { data: members } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id);

  const familyIds = members?.map((row) => row.family_id) ?? [];
  if (familyIds.length === 0) return [];

  const { data } = await supabase
    .from('children')
    .select('id, display_name, birth_year, family_id, created_at')
    .in('family_id', familyIds)
    .order('created_at', { ascending: false });

  return data ?? [];
}
