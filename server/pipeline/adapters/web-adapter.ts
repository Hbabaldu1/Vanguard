import { RawDiscoveredItem, SourceAdapter } from './types.js';

export class WebListingSourceAdapter implements SourceAdapter {
  async fetchNewItems(source: { id: string; url: string; name: string }): Promise<RawDiscoveredItem[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(source.url, {
        headers: {
          'User-Agent': 'VanguardOpportunityIntelligenceBot/1.0 (+https://example.com/bot; respecting robots.txt)',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const html = await res.text();
      // Basic extraction of headings and links without executing untrusted JS
      const links: { title: string; href: string }[] = [];
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null && links.length < 15) {
        const rawHref = match[1];
        const rawText = match[2].replace(/<[^>]+>/g, '').trim();

        if (rawText.length > 20 && !rawHref.startsWith('#') && !rawHref.startsWith('javascript:')) {
          let resolvedUrl = rawHref;
          try {
            resolvedUrl = new URL(rawHref, source.url).toString();
          } catch {
            continue;
          }
          links.push({ title: rawText, href: resolvedUrl });
        }
      }

      return links.map((l, idx) => ({
        externalId: `${source.id}_web_${idx}_${Buffer.from(l.href).toString('base64').slice(0, 16)}`,
        title: l.title,
        rawContent: `Source: ${source.name}\nTitle: ${l.title}\nURL: ${l.href}`,
        url: l.href,
        publishedAt: new Date().toISOString(),
        sourceId: source.id,
      }));
    } catch (err: any) {
      console.warn(`[WebListingSourceAdapter] Failed for ${source.name}:`, err.message);
      throw new Error(`Web listing fetch failed for ${source.name}: ${err.message}`);
    }
  }
}
