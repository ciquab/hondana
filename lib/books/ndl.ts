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

  // Extract each <item> block (there may be attributes on item in some responses)
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[1];

    const title = extractTag(item, 'title');
    if (!title) continue;

    const author = extractTag(item, 'author') ?? extractTag(item, 'dc:creator');
    const publisher = extractTag(item, 'dc:publisher');
    const isbn = extractIsbn(item);

    results.push({
      title,
      author,
      isbn13: isbn,
      coverUrl: isbn ? `https://cover.openbd.jp/${isbn}.jpg` : null,
      description: extractTag(item, 'description') ?? null,
      publisher,
      publishedDate: extractTag(item, 'dc:date') ?? null,
      pageCount: null,
    });
  }

  return results;
}

function extractTag(xml: string, tag: string): string | null {
  const escapedTag = escapeTagName(tag);
  const match = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i').exec(xml);
  if (!match?.[1]) return null;

  const text = stripXmlTags(decodeXmlEntities(match[1])).trim();
  return text || null;
}

function escapeTagName(tag: string): string {
  // keep namespace separators such as dc:creator
  return tag.replace(':', '\\:');
}

function stripXmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractIsbn(item: string): string | null {
  // Prefer dcndl:ISBN, but also accept other identifier forms and normalize hyphens/spaces.
  const identifiers = item.match(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/gi) ?? [];

  for (const identifierTag of identifiers) {
    const normalized = decodeXmlEntities(stripXmlTags(identifierTag)).replace(/[\s-]/g, '');
    const isbn13 = normalized.match(/(?:^|\D)(97[89]\d{10})(?:\D|$)/)?.[1];
    if (isbn13) return isbn13;
  }

  return null;
}
