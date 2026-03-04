import { redirect } from 'next/navigation';
import { getKidSessionChildId } from '@/lib/kids/session';
import { createServiceClient } from '@/lib/supabase/service';

export type KidContext = {
  childId: string;
  familyId: string;
  displayName: string;
};

export async function getKidContext(): Promise<KidContext> {
  const childId = await getKidSessionChildId();
  if (!childId) redirect('/kids/login');

  const supabase = createServiceClient();
  const { data: child } = await supabase
    .from('children')
    .select('id, display_name, family_id')
    .eq('id', childId)
    .single();

  if (!child) redirect('/kids/login');

  return {
    childId: child.id,
    familyId: child.family_id,
    displayName: child.display_name
  };
}
