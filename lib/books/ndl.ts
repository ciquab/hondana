/**
 * National Diet Library (NDL) Search API client - free, no key required
 * https://ndlsearch.ndl.go.jp/help/api
 * Returns OpenSearch RSS/XML; we parse it to extract book info.
 */

import type { GoogleBookResult } from './google-books';

/** Search NDL by title keyword */
export async function ndlSearchByTitle(query: string, maxResults = 10): Promise<GoogleBookResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://ndlsearch.ndl.go.jp/api/opensearch?title=${encoded}&cnt=${maxResults}&mediatype=1`,
      { cache: 'no-store' }
    );

    if (!res.ok) return [];

    const xml = await res.text();
    return parseNdlXml(xml);
  } catch {
    return [];
  }
}

function parseNdlXml(xml: string): GoogleBookResult[] {
  const results: GoogleBookResult[] = [];

  // Extract each <item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[1];

    const title = extractTag(item, 'title') ?? '';
    const author = extractTag(item, 'author') ?? extractDcTag(item, 'dc:creator');
    const publisher = extractDcTag(item, 'dc:publisher');
    const isbn = extractIsbn(item);

    if (!title) continue;

    results.push({
      title,
      author,
      isbn13: isbn,
      coverUrl: isbn ? `https://cover.openbd.jp/${isbn}.jpg` : null,
      description: extractTag(item, 'description') ?? null,
      publisher,
      publishedDate: extractDcTag(item, 'dc:date') ?? null,
      pageCount: null,
    });
  }

  return results;
}

function extractTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`).exec(xml);
  return match?.[1]?.trim() ?? null;
}

function extractDcTag(xml: string, tag: string): string | null {
  // dc: tags like <dc:creator>
  const escaped = tag.replace(':', '\\:');
  const match = new RegExp(`<${escaped}[^>]*>([^<]+)</${escaped}>`).exec(xml);
  return match?.[1]?.trim() ?? null;
}

function extractIsbn(item: string): string | null {
  // ISBN appears in <dc:identifier xsi:type="dcndl:ISBN">
  const match = /ISBN[^>]*>(\d{13})/i.exec(item);
  return match?.[1] ?? null;
}
