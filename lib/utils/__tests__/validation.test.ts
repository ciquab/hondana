import { describe, it, expect } from 'vitest';
import { isUuid } from '../validation';

describe('isUuid', () => {
  it('有効な UUID v4 を受け入れる', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('無効な UUID を拒否する', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
  });

  it('大文字小文字を問わず受け入れる', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});
