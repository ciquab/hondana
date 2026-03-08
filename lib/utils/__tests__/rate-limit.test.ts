import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('制限内のリクエストは許可する', () => {
    const result = checkRateLimit('test:user1', { limit: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('制限に達したリクエストは拒否する', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:user2', { limit: 3, windowMs: 60000 });
    }
    const result = checkRateLimit('test:user2', { limit: 3, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('ウィンドウリセット後はカウントをリセットする', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:user3', { limit: 3, windowMs: 1000 });
    }
    vi.advanceTimersByTime(2000);
    const result = checkRateLimit('test:user3', { limit: 3, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('異なるキーは独立してカウントする', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:userA', { limit: 3, windowMs: 60000 });
    }
    const result = checkRateLimit('test:userB', { limit: 3, windowMs: 60000 });
    expect(result.allowed).toBe(true);
  });
});
