/**
 * Simple in-memory TTL cache for external book API responses.
 * Prevents duplicate API calls for identical queries within the TTL window,
 * reducing the chance of hitting rate limits (e.g. Google Books 429).
 *
 * Empty results (null / []) are intentionally NOT cached so that a transient
 * 429-induced empty response doesn't suppress real results on the next attempt.
 */

type CacheEntry<T> = { data: T; expires: number };

const store = new Map<string, CacheEntry<unknown>>();

export function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);

  return fn().then((data) => {
    const isEmpty = data === null || (Array.isArray(data) && data.length === 0);
    if (!isEmpty) {
      store.set(key, { data, expires: Date.now() + ttlMs });
    }
    return data;
  });
}
