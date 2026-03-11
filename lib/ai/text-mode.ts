import type { AgeMode } from '@/lib/kids/age-mode';

export type TextMode = {
  ageMode: AgeMode;
  maxSentenceLength?: number;
  kanaPreferred?: boolean;
};

export function getDefaultTextMode(ageMode: AgeMode): TextMode {
  if (ageMode === 'junior') {
    return {
      ageMode,
      maxSentenceLength: 24,
      kanaPreferred: true
    };
  }

  return {
    ageMode,
    maxSentenceLength: 48,
    kanaPreferred: false
  };
}
