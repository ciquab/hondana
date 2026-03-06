export const CHILD_STAMPS = ['great', 'fun', 'ok', 'hard'] as const;

export const CHILD_GENRES = ['story', 'zukan', 'manga', 'picture_book', 'other'] as const;

export const GENRE_LABELS: Record<(typeof CHILD_GENRES)[number], string> = {
  story:        '📖 物語・小説',
  zukan:        '🔬 図鑑・科学',
  manga:        '🎭 マンガ',
  picture_book: '🖼️ 絵本・詩',
  other:        '📚 その他',
};

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
