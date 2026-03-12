export type AgeMode = 'junior' | 'standard';
export type AgeModeOverride = 'auto' | 'junior' | 'standard';

type AgeModeProfile = {
  birthYear: number | null;
  ageModeOverride: AgeModeOverride | null;
};

export function getAgeFromBirthYear(
  birthYear: number,
  now: Date = new Date()
): number | null {
  if (!Number.isInteger(birthYear)) return null;

  const currentYear = now.getFullYear();
  if (birthYear < 1900 || birthYear > currentYear) return null;

  return currentYear - birthYear;
}

export function getAgeModeFromProfile(
  profile: AgeModeProfile,
  now: Date = new Date()
): AgeMode {
  if (profile.ageModeOverride === 'junior' || profile.ageModeOverride === 'standard') {
    return profile.ageModeOverride;
  }

  if (profile.ageModeOverride === 'auto') {
    if (profile.birthYear === null) return 'standard';

    const age = getAgeFromBirthYear(profile.birthYear, now);
    if (age === null) return 'standard';
    // birth year only (month/day unknown) のため、9歳までは junior 扱いにして早すぎる standard 化を防ぐ
    return age <= 9 ? 'junior' : 'standard';
  }

  return 'standard';
}
