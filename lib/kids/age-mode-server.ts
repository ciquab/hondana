import { getAgeModeFromProfile, type AgeMode, type AgeModeOverride } from '@/lib/kids/age-mode';

type KidProfileRow = {
  birth_year: number | null;
  age_mode_override: AgeModeOverride | null;
};

type KidProfileRpcClient = {
  rpc: (fn: 'get_kid_child_profile', args: { target_child_id: string }) => PromiseLike<{ data: unknown[] | null }>;
};

export async function resolveKidAgeMode(
  supabase: KidProfileRpcClient,
  childId: string
): Promise<AgeMode> {
  const { data } = await supabase.rpc('get_kid_child_profile', {
    target_child_id: childId
  });

  const profile = (data?.[0] ?? null) as KidProfileRow | null;

  return getAgeModeFromProfile({
    birthYear: profile?.birth_year ?? null,
    ageModeOverride: profile?.age_mode_override ?? 'auto'
  });
}
