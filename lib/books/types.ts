/** Common book search result shared across all book API providers */
export type BookResultSource = 'google_books' | 'openbd' | 'ndl' | 'catalog';

export type BookSearchResult = {
  title: string;
  author: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  sources: BookResultSource[];
};
