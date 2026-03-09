export const CHILD_STAMPS = ['great', 'fun', 'ok', 'hard'] as const;

export const CHILD_GENRES = [
  'story',
  'zukan',
  'manga',
  'picture_book',
  'other'
] as const;

export type ChildGenre = (typeof CHILD_GENRES)[number];

export const GENRE_LABELS: Record<
  ChildGenre,
  { emoji: string; label: string }
> = {
  story: { emoji: '📖', label: 'ものがたり・しょうせつ' },
  zukan: { emoji: '🔬', label: 'ずかん・かがく' },
  manga: { emoji: '🎭', label: 'まんが' },
  picture_book: { emoji: '🖼️', label: 'えほん・し' },
  other: { emoji: '📚', label: 'そのほか' }
};

export function genreDisplayName(genre: ChildGenre): string {
  const { emoji, label } = GENRE_LABELS[genre];
  return `${emoji} ${label}`;
}

export const CHILD_FEELINGS = [
  'ドキドキ',
  'わらった',
  'びっくり',
  'かなしかった',
  'ためになった',
  'わくわく',
  'こわかった',
  'やさしいきもち',
  'なみだがでた',
  'ふしぎだった',
  'しゅうちゅうした',
  'もういっかいよみたい'
] as const;
