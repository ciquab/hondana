import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ndlSearchByTitle } from '../ndl';

// Clear cache between tests
vi.mock('../cache', () => ({
  withCache: async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
}));

describe('ndlSearchByTitle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await ndlSearchByTitle('test');
    expect(result).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const result = await ndlSearchByTitle('test');
    expect(result).toEqual([]);
  });

  it('parses a valid NDL XML response', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss>
      <channel>
        <item>
          <title>吾輩は猫である</title>
          <author>夏目漱石</author>
          <dc:publisher>岩波書店</dc:publisher>
          <dc:identifier>9784003101018</dc:identifier>
          <description>猫の視点から人間を描く</description>
          <dc:date>1905</dc:date>
        </item>
      </channel>
    </rss>`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => xml,
    } as Response);

    const result = await ndlSearchByTitle('吾輩は猫である');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('吾輩は猫である');
    expect(result[0].author).toBe('夏目漱石');
    expect(result[0].isbn13).toBe('9784003101018');
    expect(result[0].publisher).toBe('岩波書店');
    expect(result[0].description).toBe('猫の視点から人間を描く');
    expect(result[0].coverUrl).toBe('https://cover.openbd.jp/9784003101018.jpg');
  });

  it('skips items without title', async () => {
    const xml = `<rss><channel>
      <item><author>Someone</author></item>
    </channel></rss>`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => xml,
    } as Response);

    const result = await ndlSearchByTitle('test');
    expect(result).toEqual([]);
  });

  it('handles missing optional fields gracefully', async () => {
    const xml = `<rss><channel>
      <item><title>Simple Book</title></item>
    </channel></rss>`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => xml,
    } as Response);

    const result = await ndlSearchByTitle('test');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Simple Book');
    expect(result[0].author).toBeNull();
    expect(result[0].isbn13).toBeNull();
    expect(result[0].coverUrl).toBeNull();
  });
});
