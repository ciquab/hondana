/**
 * Builds robust title query variants for Japanese text so searches can match
 * hiragana/katakana notation differences.
 */

function toKatakana(input: string): string {
  return input.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

function toHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function buildTitleQueryVariants(rawQuery: string): string[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const normalized = query.normalize('NFKC');
  const variants = [normalized, toKatakana(normalized), toHiragana(normalized)];

  return variants.filter((value, index, self) => value.length > 0 && self.indexOf(value) === index);
}
