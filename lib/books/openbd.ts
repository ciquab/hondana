/**
 * OpenBD API client - free Japanese book metadata API (no key required)
 * https://openbd.jp/
 */

import type { GoogleBookResult } from './google-books';
import { withCache } from './cache';

const ISBN_TTL = 30 * 60 * 1000;

type OpenBDSummary = {
  isbn?: string;
  title?: string;
  author?: string;
  cover?: string;
  publisher?: string;
  pubdate?: string;
};

type OpenBDItem = {
  summary?: OpenBDSummary;
  onix?: {
    DescriptiveDetail?: {
      Extent?: { ExtentValue?: string }[];
    };
    CollateralDetail?: {
      TextContent?: { Text?: string }[];
    };
  };
} | null;

/** Look up a book by ISBN via OpenBD */
export async function openBdLookup(isbn: string): Promise<GoogleBookResult | null> {
  return withCache(`openbd:isbn:${isbn}`, ISBN_TTL, async () => {
    try {
      const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);

      if (!res.ok) return null;

      const data: OpenBDItem[] = await res.json();
      const item = data?.[0];
      if (!item?.summary) return null;

      const s = item.summary;

      // Extract description from onix CollateralDetail
      const description =
        item.onix?.CollateralDetail?.TextContent?.[0]?.Text ?? null;

      // Extract page count from onix Extent
      const pageCountStr = item.onix?.DescriptiveDetail?.Extent?.[0]?.ExtentValue;
      const pageCount = pageCountStr ? parseInt(pageCountStr, 10) || null : null;

      return {
        title: s.title ?? '',
        author: s.author ?? null,
        isbn13: s.isbn ?? isbn,
        coverUrl: s.cover || null,
        description,
        publisher: s.publisher ?? null,
        publishedDate: s.pubdate ?? null,
        pageCount,
      };
    } catch {
      return null;
    }
  });
}
