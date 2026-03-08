import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openBdLookup } from '../openbd';

vi.mock('../cache', () => ({
  withCache: async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
}));

describe('openBdLookup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await openBdLookup('9784003101018');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

    const result = await openBdLookup('9784003101018');
    expect(result).toBeNull();
  });

  it('returns null when item is null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [null],
    } as Response);

    const result = await openBdLookup('9784003101018');
    expect(result).toBeNull();
  });

  it('parses a valid OpenBD response', async () => {
    const response = [
      {
        summary: {
          isbn: '9784003101018',
          title: '吾輩は猫である',
          author: '夏目漱石',
          cover: 'https://cover.openbd.jp/9784003101018.jpg',
          publisher: '岩波書店',
          pubdate: '20050101',
        },
        onix: {
          DescriptiveDetail: {
            Extent: [{ ExtentValue: '320' }],
          },
          CollateralDetail: {
            TextContent: [{ Text: '猫の視点から人間を風刺' }],
          },
        },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response);

    const result = await openBdLookup('9784003101018');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('吾輩は猫である');
    expect(result!.author).toBe('夏目漱石');
    expect(result!.isbn13).toBe('9784003101018');
    expect(result!.pageCount).toBe(320);
    expect(result!.description).toBe('猫の視点から人間を風刺');
    expect(result!.publisher).toBe('岩波書店');
  });

  it('handles missing onix fields', async () => {
    const response = [
      {
        summary: {
          isbn: '9784003101018',
          title: 'Basic Book',
        },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => response,
    } as Response);

    const result = await openBdLookup('9784003101018');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Basic Book');
    expect(result!.pageCount).toBeNull();
    expect(result!.description).toBeNull();
  });
});
