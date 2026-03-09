export function isBookSearchDebugEnabled(): boolean {
  return process.env.BOOK_SEARCH_DEBUG === '1';
}

export function bookSearchDebug(scope: string, detail: Record<string, unknown>) {
  if (!isBookSearchDebugEnabled()) return;
  console.log(`[book-search:${scope}]`, JSON.stringify(detail));
}
