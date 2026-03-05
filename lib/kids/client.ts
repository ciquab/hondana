import { redirect } from 'next/navigation';
import { getKidSession } from '@/lib/kids/session';
import { canCreateKidClient, createChildSessionClient } from '@/lib/supabase/child';

export async function requireKidContext() {
  const session = await getKidSession();
  if (!session) redirect('/kids/login');
  if (!canCreateKidClient()) {
    throw new Error('Kid supabase client requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET');
  }

  return {
    childId: session.childId,
    familyId: session.familyId,
    supabase: createChildSessionClient({ childId: session.childId, familyId: session.familyId })
  };
}
