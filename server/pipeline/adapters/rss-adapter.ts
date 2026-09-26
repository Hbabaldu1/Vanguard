import Parser from 'rss-parser';
import { RawDiscoveredItem, SourceAdapter } from './types.js';

export class RssSourceAdapter implements SourceAdapter {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  async fetchNewItems(source: { id: string; url: string; name: string }): Promise<RawDiscoveredItem[]> {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 VanguardBot/1.0',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText || 'Error'})`);
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const rawText = await response.text();
      const trimmed = rawText.trim();

      // Guard: Detect if an endpoint returned an HTML error/portal page rather than XML
      const isHtml =
        trimmed.startsWith('<!DOCTYPE html') ||
        trimmed.startsWith('<html') ||
        (contentType.includes('text/html') && !trimmed.includes('<rss') && !trimmed.includes('<feed') && !trimmed.includes('<?xml'));

      if (isHtml) {
        throw new Error(`Received HTML document instead of XML/RSS feed (feed endpoint may have been moved or redirected to a web portal)`);
      }

      // XML sanitization:
      // 1. Strip XML comments which can contain malformed hyphens (e.g. <!-- -- -->) crashing SAX
      // 2. Fix unescaped ampersands: & not followed by a valid entity or character code
      // 3. Strip invalid control characters that violate XML 1.0 specifications
      const sanitizedXml = trimmed
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[a-fA-F0-9]+);)/g, '&amp;')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      const feed = await this.parser.parseString(sanitizedXml);
      const items: RawDiscoveredItem[] = [];

      for (const entry of (feed.items || []).slice(0, 15)) {
        const title = entry.title?.trim();
        const link = entry.link?.trim() || entry.guid?.trim();
        if (!title || !link) continue;

        // Strip heavy HTML markup to leave informative text
        const rawContent = (entry.content || entry.contentSnippet || entry.summary || entry['content:encoded'] || title)
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        items.push({
          externalId: entry.guid || link,
          title,
          rawContent: rawContent.slice(0, 6000), // Cap reasonable payload for AI extraction
          url: link,
          publishedAt: entry.isoDate || entry.pubDate || null,
          sourceId: source.id,
        });
      }

      return items;
    } catch (err: any) {
      console.warn(`[RssSourceAdapter] Failed to fetch feed for source ${source.name} (${source.url}):`, err.message);
      throw new Error(`RSS fetch failed for ${source.name}: ${err.message}`);
    }
  }
}
