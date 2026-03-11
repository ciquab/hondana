import { requireKidContext } from '@/lib/kids/client';
import { getAgeModeFromProfile, type AgeModeOverride } from '@/lib/kids/age-mode';
import { AgeModeProvider } from '@/lib/kids/age-mode-context';

type KidProfileRow = {
  birth_year: number | null;
  age_mode_override: AgeModeOverride | null;
};

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  const { childId, supabase } = await requireKidContext();
  const { data } = await supabase.rpc('get_kid_child_profile', { target_child_id: childId });
  const profile = (data?.[0] ?? null) as KidProfileRow | null;

  const mode = getAgeModeFromProfile({
    birthYear: profile?.birth_year ?? null,
    ageModeOverride: profile?.age_mode_override ?? 'auto'
  });

  return (
    <AgeModeProvider mode={mode}>
      <div style={{ backgroundColor: '#FFFBF0', minHeight: '100vh' }}>{children}</div>
    </AgeModeProvider>
  );
}
