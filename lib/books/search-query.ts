/**
 * Builds robust title query variants for Japanese text so searches can match
 * hiragana/katakana notation differences.
 */

function toKatakana(input: string): string {
  return input.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

export function buildTitleQueryVariants(rawQuery: string): string[] {
  const query = rawQuery.trim();
  if (!query) return [];

  const normalized = query.normalize('NFKC');
  const hasHiragana = /[ぁ-ゖ]/.test(normalized);
  const hasKatakana = /[ァ-ヶ]/.test(normalized);

  const variants = [normalized];

  // Keep variants conservative to avoid recall-heavy noisy matches from NDL.
  // If input is mainly hiragana, katakana variant helps; if input is katakana,
  // prefer original only to reduce unrelated results from overly-broad expansions.
  if (hasHiragana && !hasKatakana) {
    variants.push(toKatakana(normalized));
  }

  return variants.filter((value, index, self) => value.length > 0 && self.indexOf(value) === index);
}
