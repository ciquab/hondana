import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '../pin';

describe('hashPin / verifyPin', () => {
  it('ハッシュ化した PIN を正しく検証できる', () => {
    const hash = hashPin('1234');
    expect(verifyPin('1234', hash)).toBe(true);
  });

  it('誤った PIN は検証に失敗する', () => {
    const hash = hashPin('1234');
    expect(verifyPin('9999', hash)).toBe(false);
  });

  it('同じ PIN でも毎回異なるハッシュを生成する（salt）', () => {
    const hash1 = hashPin('0000');
    const hash2 = hashPin('0000');
    expect(hash1).not.toBe(hash2);
  });

  it('ハッシュは salt:hash 形式を持つ', () => {
    const hash = hashPin('5678');
    const parts = hash.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('不正なハッシュ形式は false を返す', () => {
    expect(verifyPin('1234', 'invalid-hash')).toBe(false);
    expect(verifyPin('1234', '')).toBe(false);
  });
});
