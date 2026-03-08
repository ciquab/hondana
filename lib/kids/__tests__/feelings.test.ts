import { describe, it, expect } from 'vitest';
import { genreDisplayName, GENRE_LABELS, CHILD_GENRES } from '../feelings';

describe('genreDisplayName', () => {
  it('returns emoji + label for each genre', () => {
    expect(genreDisplayName('story')).toBe('📖 物語・小説');
    expect(genreDisplayName('zukan')).toBe('🔬 図鑑・科学');
    expect(genreDisplayName('manga')).toBe('🎭 マンガ');
    expect(genreDisplayName('picture_book')).toBe('🖼️ 絵本・詩');
    expect(genreDisplayName('other')).toBe('📚 その他');
  });
});

describe('GENRE_LABELS', () => {
  it('has an entry for every CHILD_GENRES value', () => {
    for (const genre of CHILD_GENRES) {
      expect(GENRE_LABELS[genre]).toBeDefined();
      expect(GENRE_LABELS[genre].emoji).toBeTruthy();
      expect(GENRE_LABELS[genre].label).toBeTruthy();
    }
  });
});
