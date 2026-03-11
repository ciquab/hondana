import type { AgeMode } from '@/lib/kids/age-mode';

export function ageText<T>(
  mode: AgeMode,
  texts: {
    junior: T;
    standard: T;
  }
): T {
  return mode === 'junior' ? texts.junior : texts.standard;
}
