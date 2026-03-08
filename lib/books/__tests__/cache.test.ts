import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withCache } from '../cache';

describe('withCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('初回は fn を呼び出す', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await withCache('key1', 1000, fn);
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('TTL 内は fn を再呼び出しせずキャッシュを返す', async () => {
    const fn = vi.fn().mockResolvedValue('cached');
    await withCache('key2', 5000, fn);
    await withCache('key2', 5000, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('TTL 切れ後は fn を再呼び出しする', async () => {
    const fn = vi.fn().mockResolvedValue('fresh');
    await withCache('key3', 1000, fn);
    vi.advanceTimersByTime(2000);
    await withCache('key3', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('null 結果はキャッシュしない', async () => {
    const fn = vi.fn().mockResolvedValue(null);
    await withCache('key4', 5000, fn);
    await withCache('key4', 5000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('空配列はキャッシュしない', async () => {
    const fn = vi.fn().mockResolvedValue([]);
    await withCache('key5', 5000, fn);
    await withCache('key5', 5000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
