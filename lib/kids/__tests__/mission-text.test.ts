import { describe, expect, it } from 'vitest';
import { formatMissionTitle } from '@/lib/kids/mission-text';

describe('formatMissionTitle', () => {
  it('junior は元の文言を維持する', () => {
    expect(formatMissionTitle('ものがたりを3さつよもう', 'junior')).toBe(
      'ものがたりを3さつよもう'
    );
  });

  it('standard は主要語を漢字化する', () => {
    expect(formatMissionTitle('ものがたりを3さつよもう', 'standard')).toBe(
      '物語を3冊読もう'
    );
  });
});
