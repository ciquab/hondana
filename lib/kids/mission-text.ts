import type { AgeMode } from '@/lib/kids/age-mode';

export function formatMissionTitle(title: string, mode: AgeMode): string {
  if (mode !== 'standard') return title;

  return title
    .replaceAll('ものがたり', '物語')
    .replaceAll('さつ', '冊')
    .replaceAll('よもう', '読もう')
    .replaceAll('にち', '日');
}
