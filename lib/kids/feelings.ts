export const CHILD_STAMPS = ['great', 'fun', 'ok', 'hard'] as const;

export const CHILD_GENRES = ['story', 'zukan', 'manga', 'picture_book', 'other'] as const;

export type ChildGenre = (typeof CHILD_GENRES)[number];

export const GENRE_LABELS: Record<ChildGenre, { emoji: string; label: string }> = {
  story:        { emoji: '📖', label: '物語・小説' },
  zukan:        { emoji: '🔬', label: '図鑑・科学' },
  manga:        { emoji: '🎭', label: 'マンガ' },
  picture_book: { emoji: '🖼️', label: '絵本・詩' },
  other:        { emoji: '📚', label: 'その他' },
};

export function genreDisplayName(genre: ChildGenre): string {
  const { emoji, label } = GENRE_LABELS[genre];
  return `${emoji} ${label}`;
}

export const CHILD_FEELINGS = [
  'ドキドキ',
  '笑った',
  'びっくり',
  'かなしかった',
  'ためになった',
  'わくわく',
  'こわかった',
  'やさしいきもち',
  'なみだがでた',
  'ふしぎだった',
  'しゅうちゅうした',
  'もう一回よみたい'
] as const;
