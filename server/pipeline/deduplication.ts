import crypto from 'node:crypto';
import { Database as SqlJsDatabase } from 'sql.js';

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.hostname = url.hostname.toLowerCase();
    
    // Remove trailing slash from pathname if length > 1
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Strip tracking parameters
    const paramsToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('utm_') ||
        lower === 'fbclid' ||
        lower === 'gclid' ||
        lower === 'ref' ||
        lower === 'source' ||
        lower === '_ga'
      ) {
        paramsToDelete.push(key);
      }
    });

    paramsToDelete.forEach(p => url.searchParams.delete(p));
    url.hash = '';

    return url.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export function computeFingerprint(url: string, title: string, organizer?: string): string {
  const normUrl = normalizeUrl(url);
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const normOrg = (organizer || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const payload = `${normUrl}|${normTitle}|${normOrg}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function isItemDuplicate(
  db: SqlJsDatabase,
  contentHash: string,
  canonicalUrl: string
): { isDuplicate: boolean; matchedId?: string; reason?: string } {
  // Check hash match in discovered_items
  const hashStmt = db.prepare('SELECT id, external_id FROM discovered_items WHERE content_hash = ?');
  hashStmt.bind([contentHash]);
  if (hashStmt.step()) {
    const row = hashStmt.getAsObject();
    hashStmt.free();
    return { isDuplicate: true, matchedId: String(row.id), reason: 'Identical content fingerprint already processed' };
  }
  hashStmt.free();

  // Check normalized canonical URL match in opportunities
  const normUrl = normalizeUrl(canonicalUrl);
  const urlStmt = db.prepare('SELECT id, title FROM opportunities WHERE canonical_url = ? OR application_url = ?');
  urlStmt.bind([normUrl, normUrl]);
  if (urlStmt.step()) {
    const row = urlStmt.getAsObject();
    urlStmt.free();
    return { isDuplicate: true, matchedId: String(row.id), reason: `Canonical URL matches existing opportunity: ${row.title}` };
  }
  urlStmt.free();

  return { isDuplicate: false };
}
