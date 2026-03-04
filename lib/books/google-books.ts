/**
 * Google Books API client
 * https://developers.google.com/books/docs/v1/using
 */

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function apiKeyParam(): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  return key ? `&key=${key}` : '';
}

export type GoogleBookResult = {
  title: string;
  author: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
};

type VolumeInfo = {
  title?: string;
  authors?: string[];
  description?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  industryIdentifiers?: { type: string; identifier: string }[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
};

type GoogleBooksResponse = {
  totalItems: number;
  items?: { volumeInfo: VolumeInfo }[];
};

function extractIsbn13(identifiers?: { type: string; identifier: string }[]): string | null {
  if (!identifiers) return null;
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  return isbn13?.identifier ?? null;
}

function extractCoverUrl(imageLinks?: { thumbnail?: string; smallThumbnail?: string }): string | null {
  if (!imageLinks) return null;
  // Use thumbnail and upgrade to HTTPS
  const url = imageLinks.thumbnail ?? imageLinks.smallThumbnail ?? null;
  return url?.replace('http://', 'https://') ?? null;
}

function mapVolume(vol: VolumeInfo): GoogleBookResult {
  return {
    title: vol.title ?? '',
    author: vol.authors?.join(', ') ?? null,
    isbn13: extractIsbn13(vol.industryIdentifiers),
    coverUrl: extractCoverUrl(vol.imageLinks),
    description: vol.description ?? null,
    publisher: vol.publisher ?? null,
    publishedDate: vol.publishedDate ?? null,
    pageCount: vol.pageCount ?? null,
  };
}

/** Search by ISBN (13-digit) */
export async function searchByIsbn(isbn: string): Promise<GoogleBookResult | null> {
  const res = await fetch(`${BASE_URL}?q=isbn:${isbn}&maxResults=1${apiKeyParam()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('Google Books API error (ISBN):', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data: GoogleBooksResponse = await res.json();
  if (!data.items || data.items.length === 0) return null;

  return mapVolume(data.items[0].volumeInfo);
}

/** Search by title keyword */
export async function searchByTitle(query: string, maxResults = 10): Promise<GoogleBookResult[]> {
  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `${BASE_URL}?q=intitle:${encoded}&langRestrict=ja&maxResults=${maxResults}&printType=books${apiKeyParam()}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    // Silently return empty on rate-limit (429) – NDL is the primary source
    if (res.status !== 429) {
      console.error('Google Books API error (title):', res.status, await res.text().catch(() => ''));
    }
    return [];
  }

  const data: GoogleBooksResponse = await res.json();
  if (!data.items) return [];

  return data.items.map((item) => mapVolume(item.volumeInfo));
}
