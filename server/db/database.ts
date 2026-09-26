import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'opportunities.db');

let dbInstance: SqlJsDatabase | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing DB, creating fresh DB:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  runMigrations(dbInstance);
  seedInitialConfiguration(dbInstance);
  persistDatabase();

  return dbInstance;
}

export function persistDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error persisting SQLite database to disk:', err);
  }
}

export function schedulePersist(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    persistDatabase();
    saveDebounceTimer = null;
  }, 1000);
}

function runMigrations(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      region TEXT NOT NULL,
      fetch_interval_minutes INTEGER DEFAULT 15,
      enabled INTEGER DEFAULT 1,
      reliability_score INTEGER DEFAULT 80,
      last_polled_at TEXT,
      last_success_at TEXT,
      last_error TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      last_http_status INTEGER,
      last_latency_ms INTEGER,
      is_healthy INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discovery_runs (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      status TEXT NOT NULL,
      items_found INTEGER DEFAULT 0,
      items_new INTEGER DEFAULT 0,
      items_duplicate INTEGER DEFAULT 0,
      items_rejected INTEGER DEFAULT 0,
      items_queued INTEGER DEFAULT 0,
      items_published INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS discovered_items (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      raw_url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      raw_title TEXT NOT NULL,
      raw_content TEXT NOT NULL,
      raw_pub_date TEXT,
      content_hash TEXT NOT NULL UNIQUE,
      discovered_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      discovered_item_id TEXT,
      source_id TEXT NOT NULL,
      source_domain TEXT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      opportunity_type TEXT NOT NULL,
      organizer TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      application_url TEXT NOT NULL,
      geographic_eligibility TEXT NOT NULL,
      region_tag TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      benefits_description TEXT NOT NULL,
      award_amount_text TEXT,
      deadline_at TEXT,
      deadline_tz TEXT,
      is_deadline_estimated INTEGER DEFAULT 0,
      requirements_list_json TEXT NOT NULL,
      application_steps_json TEXT NOT NULL,
      why_it_matters TEXT NOT NULL,
      unconfirmed_info_notes TEXT,
      relevance_score INTEGER DEFAULT 0,
      score_breakdown_json TEXT NOT NULL,
      verification_status TEXT DEFAULT 'unverified',
      publication_status TEXT DEFAULT 'draft',
      lifecycle_status TEXT DEFAULT 'discovered',
      extraction_confidence REAL DEFAULT 0,
      source_published_at TEXT,
      discovered_at TEXT,
      published_at TEXT,
      last_verified_at TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_checks (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      check_type TEXT NOT NULL,
      passed INTEGER NOT NULL,
      confidence_score REAL NOT NULL,
      evidence_snippet TEXT,
      checked_at TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS review_queue (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publication_destinations (
      id TEXT PRIMARY KEY,
      channel_type TEXT NOT NULL,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publication_attempts (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      destination_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      response_data TEXT,
      error_message TEXT,
      attempted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      user_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(opportunity_id, user_identifier)
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(publication_status, deadline_at);
    CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(opportunity_type);
    CREATE INDEX IF NOT EXISTS idx_opportunities_region ON opportunities(region_tag);
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_discovered_items_hash ON discovered_items(content_hash);
  `);
}

/**
 * Removes all demo, test, or placeholder opportunities and fake history from database.
 * Preserves database schema, app configuration, and legitimate source definitions.
 */
export function purgeTestData(db: SqlJsDatabase): void {
  // Purge any seed/demo opportunities
  db.run(`
    DELETE FROM opportunities WHERE 
      discovered_item_id IS NULL OR 
      id LIKE 'opp_tef_%' OR 
      id LIKE 'opp_afdb_%' OR 
      id LIKE 'opp_3mtt_%' OR 
      id LIKE 'opp_google_%' OR 
      id LIKE 'opp_wellcome_%' OR 
      id LIKE 'opp_yc_%' OR 
      id LIKE 'opp_au_%' OR 
      id LIKE 'test_%';
  `);

  // Clean orphan verification checks, review queue, bookmarks, and publication attempts
  db.run(`
    DELETE FROM verification_checks WHERE opportunity_id NOT IN (SELECT id FROM opportunities);
  `);
  db.run(`
    DELETE FROM review_queue WHERE opportunity_id NOT IN (SELECT id FROM opportunities);
  `);
  db.run(`
    DELETE FROM bookmarks WHERE opportunity_id NOT IN (SELECT id FROM opportunities);
  `);
  db.run(`
    DELETE FROM publication_attempts WHERE opportunity_id NOT IN (SELECT id FROM opportunities);
  `);

  // If in production environment or clean pass requested, purge any leftover test runs
  if (process.env.NODE_ENV === 'production') {
    db.run(`DELETE FROM discovery_runs WHERE status = 'running';`);
  }
}

function seedInitialConfiguration(db: SqlJsDatabase): void {
  // System quality settings configuration (NOT opportunity data)
  const res = db.exec("SELECT COUNT(*) as count FROM system_settings WHERE key = 'quality_settings'");
  const hasSettings = res.length > 0 && res[0].values.length > 0 && (res[0].values[0][0] as number) > 0;

  const now = new Date().toISOString();

  if (!hasSettings) {
    const defaultQualitySettings = {
      publishingMode: 'auto', // Auto mode for verified items meeting threshold
      emergencyPause: false,
      discoveryIntervalMinutes: 15,
      minimumScoreToPublish: 70,
      nigeriaPriorityBoost: 10,
      requireOfficialUrl: true,
      autoArchiveExpired: true,
    };

    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value_json, updated_at) VALUES (?, ?, ?)`,
      ['quality_settings', JSON.stringify(defaultQualitySettings), now]
    );

    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value_json, updated_at) VALUES (?, ?, ?)`,
      ['scheduler_state', JSON.stringify({
        isRunning: true,
        isPaused: false,
        intervalMinutes: 15,
        lastRunAt: null,
        nextRunAt: null,
        totalRunsCompleted: 0
      }), now]
    );
  }

  // Legitimate real production sources (NOT opportunities, but source endpoints)
  const sourceRes = db.exec("SELECT COUNT(*) FROM sources");
  const sourceCount = sourceRes.length > 0 && sourceRes[0].values.length > 0 ? (sourceRes[0].values[0][0] as number) : 0;

  if (sourceCount === 0) {
    const initialSources = [
      {
        id: 'src_afdb_procurement',
        name: 'African Union Commission Procurement & Youth Grants',
        slug: 'african-union-commission',
        url: 'https://au.int/en/rss.xml',
        type: 'rss',
        category: 'funding_call',
        region: 'pan_africa',
        fetch_interval_minutes: 15,
        enabled: 1,
        reliability_score: 98,
        created_at: now
      },
      {
        id: 'src_opportunity_desk',
        name: 'Opportunity Desk African & Global Fellowships',
        slug: 'opportunity-desk',
        url: 'https://opportunitydesk.org/feed/',
        type: 'rss',
        category: 'fellowship',
        region: 'pan_africa',
        fetch_interval_minutes: 15,
        enabled: 1,
        reliability_score: 92,
        created_at: now
      },
      {
        id: 'src_tony_elumelu',
        name: 'Tony Elumelu Foundation Entrepreneurship Hub',
        slug: 'tef-hub',
        url: 'https://www.tonyelumelufoundation.org/feed',
        type: 'rss',
        category: 'grant',
        region: 'pan_africa',
        fetch_interval_minutes: 20,
        enabled: 1,
        reliability_score: 95,
        created_at: now
      },
      {
        id: 'src_grants_gov_global',
        name: 'Opportunities for Africans (OFA) Fellowships & Grants',
        slug: 'opportunities-for-africans',
        url: 'https://www.opportunitiesforafricans.com/feed/',
        type: 'rss',
        category: 'grant',
        region: 'pan_africa',
        fetch_interval_minutes: 30,
        enabled: 1,
        reliability_score: 96,
        created_at: now
      },
      {
        id: 'src_yc_startup',
        name: 'Y Combinator Founder Directory & Funding News',
        slug: 'yc-startup',
        url: 'https://www.ycombinator.com/blog/feed/',
        type: 'rss',
        category: 'accelerator',
        region: 'global',
        fetch_interval_minutes: 30,
        enabled: 1,
        reliability_score: 94,
        created_at: now
      },
      {
        id: 'src_google_startups_africa',
        name: 'Google for Startups Africa & Global Programs',
        slug: 'google-startups-africa',
        url: 'https://blog.google/company-news/outreach-and-initiatives/entrepreneurs/rss/',
        type: 'rss',
        category: 'technology_program',
        region: 'pan_africa',
        fetch_interval_minutes: 20,
        enabled: 1,
        reliability_score: 95,
        created_at: now
      }
    ];

    for (const src of initialSources) {
      db.run(
        `INSERT INTO sources (id, name, slug, url, type, category, region, fetch_interval_minutes, enabled, reliability_score, consecutive_failures, is_healthy, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
        [src.id, src.name, src.slug, src.url, src.type, src.category, src.region, src.fetch_interval_minutes, src.enabled, src.reliability_score, src.created_at]
      );
    }
  }

  // Publication destinations configuration
  const destRes = db.exec("SELECT COUNT(*) FROM publication_destinations");
  const destCount = destRes.length > 0 && destRes[0].values.length > 0 ? (destRes[0].values[0][0] as number) : 0;
  if (destCount === 0) {
    db.run(
      `INSERT INTO publication_destinations (id, channel_type, name, config_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['dest_web', 'web', 'Public Web Intelligence Portal', JSON.stringify({ autoPublish: true }), 1, now]
    );
    db.run(
      `INSERT INTO publication_destinations (id, channel_type, name, config_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['dest_telegram', 'telegram', 'Telegram Channel Alerts', JSON.stringify({ channelId: '', configured: false, note: 'Requires TELEGRAM_BOT_TOKEN' }), 0, now]
    );
    db.run(
      `INSERT INTO publication_destinations (id, channel_type, name, config_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['dest_newsletter', 'newsletter', 'Weekly Intelligence Digest', JSON.stringify({ provider: 'smtp', configured: false, note: 'Requires EMAIL_SMTP_URL' }), 0, now]
    );
  }
}
