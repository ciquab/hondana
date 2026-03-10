import { describe, it, expect } from 'vitest';
import { buildTitleQueryVariants } from '../search-query';

describe('buildTitleQueryVariants', () => {
  it('returns empty array for empty/whitespace input', () => {
    expect(buildTitleQueryVariants('')).toEqual([]);
    expect(buildTitleQueryVariants('   ')).toEqual([]);
  });

  it('returns single variant for ASCII-only input', () => {
    const result = buildTitleQueryVariants('Harry Potter');
    expect(result).toEqual(['Harry Potter']);
  });

  it('generates hiragana and katakana variants for mixed input', () => {
    const result = buildTitleQueryVariants('ねこ');
    expect(result).toContain('ねこ'); // original hiragana
    expect(result).toContain('ネコ'); // katakana variant
    expect(result.length).toBe(2); // deduped: hiragana original + katakana
  });

  it('keeps katakana input conservative (no hiragana expansion)', () => {
    const result = buildTitleQueryVariants('ドラえもん');
    expect(result).toEqual(['ドラえもん']);
  });

  it('deduplicates identical variants', () => {
    // Pure ASCII produces same string for all conversions
    const result = buildTitleQueryVariants('test');
    expect(result).toEqual(['test']);
  });

  it('normalizes NFKC (e.g. fullwidth to halfwidth)', () => {
    const result = buildTitleQueryVariants('Ｈｅｌｌｏ');
    expect(result[0]).toBe('Hello');
  });

  it('trims whitespace', () => {
    const result = buildTitleQueryVariants('  ねこ  ');
    expect(result).toContain('ねこ');
    expect(result).toContain('ネコ');
  });
});
