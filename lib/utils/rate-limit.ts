type WindowEntry = {
  count: number;
  windowStart: number;
};

const store = new Map<string, WindowEntry>();

/**
 * スライディングウィンドウ方式のシンプルなレート制限。
 * サーバープロセス内でインメモリ管理するため単一インスタンス前提。
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
