import { RawDiscoveredItem, SourceAdapter } from './types.js';

export class ApiSourceAdapter implements SourceAdapter {
  async fetchNewItems(source: { id: string; url: string; name: string }): Promise<RawDiscoveredItem[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(source.url, {
        headers: {
          'User-Agent': 'VanguardOpportunityIntelligenceBot/1.0 (+https://example.com/bot; respecting robots.txt)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data || json.items || json.opportunities || [];
      const items: RawDiscoveredItem[] = [];

      for (const item of list.slice(0, 15)) {
        const title = item.title || item.name || item.headline;
        const link = item.url || item.link || item.canonical_url;
        if (!title || !link) continue;

        const rawContent = item.description || item.summary || item.details || JSON.stringify(item);

        items.push({
          externalId: item.id ? String(item.id) : link,
          title: String(title).trim(),
          rawContent: String(rawContent).slice(0, 6000),
          url: String(link).trim(),
          publishedAt: item.published_at || item.created_at || null,
          sourceId: source.id,
        });
      }

      return items;
    } catch (err: any) {
      console.warn(`[ApiSourceAdapter] Failed to fetch API for source ${source.name}:`, err.message);
      throw new Error(`API fetch failed for ${source.name}: ${err.message}`);
    }
  }
}
