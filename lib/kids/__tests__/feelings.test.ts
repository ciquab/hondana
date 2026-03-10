import { describe, it, expect } from 'vitest';
import { genreDisplayName, GENRE_LABELS, CHILD_GENRES } from '../feelings';

describe('genreDisplayName', () => {
  it('returns emoji + label for each genre', () => {
    expect(genreDisplayName('story')).toBe('📖 ものがたり・しょうせつ');
    expect(genreDisplayName('zukan')).toBe('🔬 ずかん・かがく');
    expect(genreDisplayName('manga')).toBe('🎭 まんが');
    expect(genreDisplayName('picture_book')).toBe('🖼️ えほん・し');
    expect(genreDisplayName('other')).toBe('📚 そのほか');
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
