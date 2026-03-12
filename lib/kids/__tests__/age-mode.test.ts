import { describe, expect, it } from 'vitest';
import { getAgeFromBirthYear, getAgeModeFromProfile } from '@/lib/kids/age-mode';

describe('getAgeFromBirthYear', () => {
  const now = new Date('2026-03-11T00:00:00Z');

  it('生年から年齢を計算する', () => {
    expect(getAgeFromBirthYear(2018, now)).toBe(8);
  });

  it('未来年は null を返す', () => {
    expect(getAgeFromBirthYear(2050, now)).toBeNull();
  });
});

describe('getAgeModeFromProfile', () => {
  const now = new Date('2026-03-11T00:00:00Z');

  it('override: junior を優先する', () => {
    expect(
      getAgeModeFromProfile({ birthYear: 2010, ageModeOverride: 'junior' }, now)
    ).toBe('junior');
  });

  it('override: standard を優先する', () => {
    expect(
      getAgeModeFromProfile({ birthYear: 2020, ageModeOverride: 'standard' }, now)
    ).toBe('standard');
  });

  it('auto で 9歳以下なら junior', () => {
    expect(
      getAgeModeFromProfile({ birthYear: 2018, ageModeOverride: 'auto' }, now)
    ).toBe('junior');
    expect(
      getAgeModeFromProfile({ birthYear: 2017, ageModeOverride: 'auto' }, now)
    ).toBe('junior');
  });

  it('auto で 10歳以上なら standard', () => {
    expect(
      getAgeModeFromProfile({ birthYear: 2016, ageModeOverride: 'auto' }, now)
    ).toBe('standard');
  });

  it('auto かつ生年未設定は standard', () => {
    expect(
      getAgeModeFromProfile({ birthYear: null, ageModeOverride: 'auto' }, now)
    ).toBe('standard');
  });
});
