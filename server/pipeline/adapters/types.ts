export interface RawDiscoveredItem {
  externalId: string;
  title: string;
  rawContent: string;
  url: string;
  publishedAt: string | null;
  sourceId: string;
}

export interface SourceAdapter {
  fetchNewItems(source: { id: string; url: string; name: string }): Promise<RawDiscoveredItem[]>;
}
