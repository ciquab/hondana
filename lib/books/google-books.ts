/**
 * Google Books API client
 * https://developers.google.com/books/docs/v1/using
 */

import type { BookSearchResult } from './types';
import { withCache } from './cache';
import { env } from '@/lib/env';
import { bookSearchDebug } from './debug';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// ISBN results are stable; cache for 30 minutes.
const ISBN_TTL = 30 * 60 * 1000;
// Title search results may vary slightly; cache for 5 minutes.
const TITLE_TTL = 5 * 60 * 1000;

function apiKeyParam(useKey: boolean): string {
  if (!useKey || !env.GOOGLE_BOOKS_API_KEY) return '';
  return `&key=${env.GOOGLE_BOOKS_API_KEY}`;
}

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

function mapVolume(vol: VolumeInfo): BookSearchResult {
  return {
    title: vol.title ?? '',
    author: vol.authors?.join(', ') ?? null,
    isbn13: extractIsbn13(vol.industryIdentifiers),
    coverUrl: extractCoverUrl(vol.imageLinks),
    description: vol.description ?? null,
    publisher: vol.publisher ?? null,
    publishedDate: vol.publishedDate ?? null,
    pageCount: vol.pageCount ?? null,
    sources: ['google_books'],
  };
}

async function fetchWithQuotaFallback(urlWithKey: string): Promise<Response> {
  const withKey = await fetch(urlWithKey);
  if (withKey.status !== 429 || !env.GOOGLE_BOOKS_API_KEY) return withKey;

  const urlWithoutKey = urlWithKey.replace(/&key=[^&]+/, '');
  bookSearchDebug('google-retry-without-key', { fromStatus: withKey.status });
  return fetch(urlWithoutKey);
}

/** Search by ISBN (13-digit) */
export async function searchByIsbn(isbn: string): Promise<BookSearchResult | null> {
  return withCache(`gbooks:isbn:${isbn}`, ISBN_TTL, async () => {
    const url = `${BASE_URL}?q=isbn:${isbn}&maxResults=1${apiKeyParam(true)}`;
    const res = await fetchWithQuotaFallback(url);

    if (!res.ok) {
      console.error('Google Books API error (ISBN):', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data: GoogleBooksResponse = await res.json();
    if (!data.items || data.items.length === 0) return null;

    return mapVolume(data.items[0].volumeInfo);
  });
}

/** Search by title keyword */
export async function searchByTitle(query: string, maxResults = 10): Promise<BookSearchResult[]> {
  return withCache(`gbooks:title:${query}:${maxResults}`, TITLE_TTL, async () => {
    try {
      const encoded = encodeURIComponent(query);

      const strictUrl = `${BASE_URL}?q=intitle:${encoded}&langRestrict=ja&maxResults=${maxResults}&printType=books${apiKeyParam(true)}`;
      const strictRes = await fetchWithQuotaFallback(strictUrl);

      if (!strictRes.ok) {
        const body = await strictRes.text().catch(() => '');
        bookSearchDebug('google-strict-http-error', {
          query,
          maxResults,
          status: strictRes.status,
          body: body.slice(0, 200),
        });
        if (strictRes.status !== 429) {
          console.error('Google Books API error (title):', strictRes.status, body);
        }
        return [];
      }

      const strictData: GoogleBooksResponse = await strictRes.json();
      const strictCount = strictData.items?.length ?? 0;
      bookSearchDebug('google-strict', { query, maxResults, status: strictRes.status, itemCount: strictCount });
      if (strictData.items?.length) {
        return strictData.items.map((item) => mapVolume(item.volumeInfo));
      }

      // Fallback: broader query without intitle/lang restriction to avoid missing valid hits.
      const fallbackUrl = `${BASE_URL}?q=${encoded}&maxResults=${maxResults}&printType=books${apiKeyParam(true)}`;
      const fallbackRes = await fetchWithQuotaFallback(fallbackUrl);

      if (!fallbackRes.ok) {
        const body = await fallbackRes.text().catch(() => '');
        bookSearchDebug('google-fallback-http-error', {
          query,
          maxResults,
          status: fallbackRes.status,
          body: body.slice(0, 200),
        });
        if (fallbackRes.status !== 429) {
          console.error('Google Books API error (title fallback):', fallbackRes.status, body);
        }
        return [];
      }

      const fallbackData: GoogleBooksResponse = await fallbackRes.json();
      const fallbackCount = fallbackData.items?.length ?? 0;
      bookSearchDebug('google-fallback', { query, maxResults, status: fallbackRes.status, itemCount: fallbackCount });
      if (!fallbackData.items) return [];

      return fallbackData.items.map((item) => mapVolume(item.volumeInfo));
    } catch (error) {
      bookSearchDebug('google-exception', {
        query,
        maxResults,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  });
}
