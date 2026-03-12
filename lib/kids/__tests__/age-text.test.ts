import { describe, expect, it } from 'vitest';
import { ageText } from '@/lib/kids/age-text';

describe('ageText', () => {
  it('junior を返す', () => {
    expect(
      ageText('junior', {
        junior: 'さいきん よんだ ほん',
        standard: '最近読んだ本'
      })
    ).toBe('さいきん よんだ ほん');
  });

  it('standard を返す', () => {
    expect(
      ageText('standard', {
        junior: 'ぜんぶ みる',
        standard: 'すべて見る'
      })
    ).toBe('すべて見る');
  });
});
