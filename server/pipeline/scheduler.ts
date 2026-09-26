import crypto from 'node:crypto';
import { Database as SqlJsDatabase } from 'sql.js';
import { RssSourceAdapter } from './adapters/rss-adapter.js';
import { ApiSourceAdapter } from './adapters/api-adapter.js';
import { WebListingSourceAdapter } from './adapters/web-adapter.js';
import { RawDiscoveredItem } from './adapters/types.js';
import { computeFingerprint, isItemDuplicate, normalizeUrl } from './deduplication.js';
import { extractOpportunityWithGemini } from './gemini-extractor.js';
import { runVerificationChecks } from './verification.js';
import { calculateRelevanceScore } from './scoring.js';
import { evaluateAndPublish, getQualitySettings, logAuditEvent } from './publisher.js';
import { Opportunity, SchedulerHealth, Source } from '../../src/types/opportunity.js';
import { schedulePersist } from '../db/database.js';

let schedulerIntervalTimer: NodeJS.Timeout | null = null;
let isRunInProgress = false;

const rssAdapter = new RssSourceAdapter();
const apiAdapter = new ApiSourceAdapter();
const webAdapter = new WebListingSourceAdapter();

export function getSchedulerState(db: SqlJsDatabase): SchedulerHealth {
  const stmt = db.prepare("SELECT value_json FROM system_settings WHERE key = 'scheduler_state'");
  let state = {
    isRunning: true,
    isPaused: false,
    intervalMinutes: 15,
    lastRunAt: null as string | null,
    nextRunAt: null as string | null,
    totalRunsCompleted: 0,
    activeSourcesCount: 0,
    unhealthySourcesCount: 0,
    lastRunStats: undefined as any,
  };

  if (stmt.step()) {
    try {
      state = { ...state, ...JSON.parse(String(stmt.getAsObject().value_json)) };
    } catch {
      // ignore
    }
  }
  stmt.free();

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM sources WHERE enabled = 1');
  if (countStmt.step()) {
    state.activeSourcesCount = Number(countStmt.getAsObject().count);
  }
  countStmt.free();

  const unhealthyStmt = db.prepare('SELECT COUNT(*) as count FROM sources WHERE enabled = 1 AND (is_healthy = 0 OR consecutive_failures >= 3)');
  if (unhealthyStmt.step()) {
    state.unhealthySourcesCount = Number(unhealthyStmt.getAsObject().count);
  }
  unhealthyStmt.free();

  return state;
}

export function saveSchedulerState(db: SqlJsDatabase, state: Partial<SchedulerHealth>): void {
  const current = getSchedulerState(db);
  const updated = { ...current, ...state };
  const now = new Date().toISOString();
  db.run(
    `INSERT OR REPLACE INTO system_settings (key, value_json, updated_at) VALUES (?, ?, ?)`,
    ['scheduler_state', JSON.stringify(updated), now]
  );
  schedulePersist();
}

export function initScheduler(db: SqlJsDatabase): void {
  if (schedulerIntervalTimer) {
    clearInterval(schedulerIntervalTimer);
  }

  console.log('[Scheduler] Initializing persistent backend opportunity discovery scheduler...');

  const state = getSchedulerState(db);
  if (!state.nextRunAt) {
    state.nextRunAt = new Date(Date.now() + 60 * 1000).toISOString(); // Run shortly after startup
    saveSchedulerState(db, state);
  }

  // Persistent 30-second watchdog checking if a run is due
  schedulerIntervalTimer = setInterval(async () => {
    try {
      const currentState = getSchedulerState(db);
      if (currentState.isPaused || isRunInProgress) {
        return;
      }

      const nextRunTime = currentState.nextRunAt ? new Date(currentState.nextRunAt).getTime() : 0;
      if (Date.now() >= nextRunTime) {
        console.log('[Scheduler] Scheduled discovery interval elapsed. Triggering discovery cycle...');
        await runDiscoveryCycle(db);
      }
    } catch (err: any) {
      console.error('[Scheduler] Error in persistent scheduler watchdog tick:', err.message);
    }
  }, 30 * 1000);
}

export async function runDiscoveryCycle(
  db: SqlJsDatabase,
  targetSourceId?: string
): Promise<{ runId: string; stats: any }> {
  if (isRunInProgress) {
    console.log('[Scheduler] Discovery cycle already in progress, skipping overlapping run.');
    return { runId: 'in_progress', stats: null };
  }

  isRunInProgress = true;
  const runId = `run_${crypto.randomUUID().slice(0, 10)}`;
  const startTime = new Date().toISOString();

  // Create discovery_run record
  db.run(
    `INSERT INTO discovery_runs (id, source_id, status, started_at) VALUES (?, ?, 'running', ?)`,
    [runId, targetSourceId || null, startTime]
  );
  schedulePersist();

  logAuditEvent(db, 'discovery_started', 'run', runId, 'scheduler', {
    targetSourceId: targetSourceId || 'all_active_sources',
    startedAt: startTime,
  });

  let itemsFound = 0;
  let itemsNew = 0;
  let itemsDuplicate = 0;
  let itemsRejected = 0;
  let itemsQueued = 0;
  let itemsPublished = 0;

  try {
    let sourceQuery = 'SELECT * FROM sources WHERE enabled = 1';
    let queryParams: any[] = [];
    if (targetSourceId) {
      sourceQuery = 'SELECT * FROM sources WHERE id = ?';
      queryParams = [targetSourceId];
    }

    const stmt = db.prepare(sourceQuery);
    if (queryParams.length) stmt.bind(queryParams);

    const sources: Source[] = [];
    while (stmt.step()) {
      sources.push(stmt.getAsObject() as any);
    }
    stmt.free();

    for (const source of sources) {
      // Respectful rate limiting: if unhealthy and failed recently, back off unless targetted
      const consecutiveFails = source.consecutive_failures || 0;
      if (!targetSourceId && consecutiveFails >= 5 && source.last_polled_at) {
        const lastPolled = new Date(source.last_polled_at).getTime();
        // Wait at least 60 minutes before retrying heavily failing sources
        if (Date.now() - lastPolled < 60 * 60 * 1000) {
          console.log(`[Scheduler] Backing off unhealthy source: ${source.name} (${consecutiveFails} consecutive failures)`);
          continue;
        }
      }

      console.log(`[Scheduler] Checking source: ${source.name} (${source.url})`);
      const pollTime = new Date().toISOString();
      db.run('UPDATE sources SET last_polled_at = ? WHERE id = ?', [pollTime, source.id]);

      let rawItems: RawDiscoveredItem[] = [];
      const fetchStart = Date.now();

      try {
        if (source.type === 'rss') {
          rawItems = await rssAdapter.fetchNewItems(source);
        } else if (source.type === 'api') {
          rawItems = await apiAdapter.fetchNewItems(source);
        } else {
          rawItems = await webAdapter.fetchNewItems(source);
        }

        const latency = Date.now() - fetchStart;
        db.run(
          `UPDATE sources SET 
            last_success_at = ?, 
            last_error = null, 
            consecutive_failures = 0, 
            is_healthy = 1,
            last_latency_ms = ?,
            last_http_status = 200
           WHERE id = ?`,
          [pollTime, latency, source.id]
        );
      } catch (srcErr: any) {
        const latency = Date.now() - fetchStart;
        const newFailures = (source.consecutive_failures || 0) + 1;
        const isHealthy = newFailures >= 5 ? 0 : 1;

        console.warn(`[Scheduler] Source failure isolated for ${source.name} (${newFailures} failures):`, srcErr.message);
        db.run(
          `UPDATE sources SET 
            last_error = ?, 
            consecutive_failures = ?, 
            is_healthy = ?, 
            last_latency_ms = ?,
            last_http_status = 500
           WHERE id = ?`,
          [srcErr.message, newFailures, isHealthy, latency, source.id]
        );
        continue;
      }

      itemsFound += rawItems.length;

      for (const rawItem of rawItems) {
        const contentHash = computeFingerprint(rawItem.url, rawItem.title);
        const dupCheck = isItemDuplicate(db, contentHash, rawItem.url);

        if (dupCheck.isDuplicate) {
          itemsDuplicate++;
          logAuditEvent(db, 'item_deduplicated', 'item', rawItem.externalId, 'scheduler', {
            source: source.name,
            reason: dupCheck.reason,
            url: rawItem.url,
          });
          continue;
        }

        itemsNew++;
        const itemId = `item_${crypto.randomUUID().slice(0, 10)}`;
        const discoveredAt = new Date().toISOString();

        db.run(
          `INSERT INTO discovered_items (id, run_id, source_id, external_id, raw_url, canonical_url, raw_title, raw_content, raw_pub_date, content_hash, discovered_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            itemId,
            runId,
            source.id,
            rawItem.externalId,
            rawItem.url,
            normalizeUrl(rawItem.url),
            rawItem.title,
            rawItem.rawContent,
            rawItem.publishedAt,
            contentHash,
            discoveredAt,
          ]
        );

        // AI Extraction
        const extracted = await extractOpportunityWithGemini(rawItem);
        logAuditEvent(db, 'ai_extraction_completed', 'opportunity', itemId, 'gemini-3.8-flash', {
          title: extracted.title,
          type: extracted.opportunity_type,
          confidence: extracted.confidence_score,
        });

        // Verification checks
        const oppId = `opp_${crypto.randomUUID().slice(0, 10)}`;
        const verification = runVerificationChecks(extracted, rawItem, oppId);

        for (const check of verification.checks) {
          db.run(
            `INSERT INTO verification_checks (id, opportunity_id, check_type, passed, confidence_score, evidence_snippet, checked_at, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              check.id,
              check.opportunity_id,
              check.check_type,
              check.passed ? 1 : 0,
              check.confidence_score,
              check.evidence_snippet,
              check.checked_at,
              check.notes,
            ]
          );
        }

        if (verification.status === 'rejected') {
          itemsRejected++;
          logAuditEvent(db, 'verification_flagged', 'opportunity', oppId, 'verifier', {
            reason: verification.rejectionReason,
            checksFailed: verification.checks.filter(c => !c.passed).map(c => c.check_type),
          });
          continue;
        }

        // Scoring
        const scoring = calculateRelevanceScore(extracted, source);

        const slug = `${extracted.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 45)}-${crypto.randomUUID().slice(0, 6)}`;
        const oppNow = new Date().toISOString();
        let sourceDomain = 'unknown';
        try {
          sourceDomain = new URL(rawItem.url).hostname;
        } catch {
          // ignore
        }

        const oppRecord: Opportunity = {
          id: oppId,
          discovered_item_id: itemId,
          source_id: source.id,
          source_name: source.name,
          source_domain: sourceDomain,
          title: extracted.title,
          slug,
          summary: extracted.summary,
          opportunity_type: extracted.opportunity_type,
          organizer: extracted.organizer,
          canonical_url: extracted.canonical_url,
          application_url: extracted.application_url,
          geographic_eligibility: extracted.geographic_eligibility,
          region_tag: extracted.region_tag,
          target_audience: extracted.target_audience,
          benefits_description: extracted.benefits_description,
          award_amount_text: extracted.award_amount_text,
          deadline_at: extracted.deadline_at,
          deadline_tz: extracted.deadline_tz,
          is_deadline_estimated: extracted.is_deadline_estimated,
          requirements: extracted.requirements,
          application_steps: extracted.application_steps,
          why_it_matters: extracted.why_it_matters,
          unconfirmed_info_notes: extracted.unconfirmed_info_notes,
          relevance_score: scoring.score,
          score_breakdown: scoring.breakdown,
          verification_status: verification.status,
          publication_status: 'draft',
          lifecycle_status: 'verifying',
          extraction_confidence: extracted.confidence_score,
          source_published_at: rawItem.publishedAt,
          published_at: null,
          discovered_at: discoveredAt,
          last_verified_at: oppNow,
          expires_at: extracted.deadline_at,
          created_at: oppNow,
          updated_at: oppNow,
        };

        db.run(
          `INSERT INTO opportunities (
            id, discovered_item_id, source_id, source_domain, title, slug, summary, opportunity_type, organizer,
            canonical_url, application_url, geographic_eligibility, region_tag, target_audience,
            benefits_description, award_amount_text, deadline_at, deadline_tz, is_deadline_estimated,
            requirements_list_json, application_steps_json, why_it_matters, unconfirmed_info_notes,
            relevance_score, score_breakdown_json, verification_status, publication_status,
            lifecycle_status, extraction_confidence, source_published_at, discovered_at,
            published_at, last_verified_at, expires_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            oppRecord.id,
            oppRecord.discovered_item_id,
            oppRecord.source_id,
            oppRecord.source_domain,
            oppRecord.title,
            oppRecord.slug,
            oppRecord.summary,
            oppRecord.opportunity_type,
            oppRecord.organizer,
            oppRecord.canonical_url,
            oppRecord.application_url,
            oppRecord.geographic_eligibility,
            oppRecord.region_tag,
            oppRecord.target_audience,
            oppRecord.benefits_description,
            oppRecord.award_amount_text,
            oppRecord.deadline_at,
            oppRecord.deadline_tz,
            oppRecord.is_deadline_estimated ? 1 : 0,
            JSON.stringify(oppRecord.requirements),
            JSON.stringify(oppRecord.application_steps),
            oppRecord.why_it_matters,
            oppRecord.unconfirmed_info_notes,
            oppRecord.relevance_score,
            JSON.stringify(oppRecord.score_breakdown),
            oppRecord.verification_status,
            oppRecord.publication_status,
            oppRecord.lifecycle_status || null,
            oppRecord.extraction_confidence,
            oppRecord.source_published_at,
            oppRecord.discovered_at,
            oppRecord.published_at,
            oppRecord.last_verified_at,
            oppRecord.expires_at,
            oppRecord.created_at,
            oppRecord.updated_at,
          ]
        );

        // Quality gate & Publishing decision
        const pubResult = evaluateAndPublish(db, oppRecord);
        if (pubResult.published) {
          itemsPublished++;
        } else if (pubResult.queued) {
          itemsQueued++;
        }
      }
    }

    const completedAt = new Date().toISOString();
    db.run(
      `UPDATE discovery_runs SET
        status = 'completed',
        items_found = ?,
        items_new = ?,
        items_duplicate = ?,
        items_rejected = ?,
        items_queued = ?,
        items_published = ?,
        completed_at = ?
       WHERE id = ?`,
      [itemsFound, itemsNew, itemsDuplicate, itemsRejected, itemsQueued, itemsPublished, completedAt, runId]
    );

    const qSettings = getQualitySettings(db);
    const intervalMinutes = qSettings.discoveryIntervalMinutes || 15;
    const nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

    const currentState = getSchedulerState(db);
    saveSchedulerState(db, {
      lastRunAt: completedAt,
      nextRunAt: nextRun,
      totalRunsCompleted: (currentState.totalRunsCompleted || 0) + 1,
      lastRunStats: {
        itemsFound,
        itemsPublished,
        itemsQueued,
      },
    });

    logAuditEvent(db, 'discovery_completed', 'run', runId, 'scheduler', {
      itemsFound,
      itemsNew,
      itemsDuplicate,
      itemsPublished,
      itemsQueued,
      completedAt,
    });

    schedulePersist();

    return {
      runId,
      stats: {
        itemsFound,
        itemsNew,
        itemsDuplicate,
        itemsRejected,
        itemsQueued,
        itemsPublished,
      },
    };
  } catch (runErr: any) {
    console.error('[Scheduler] Fatal error in discovery cycle:', runErr.message);
    db.run(
      `UPDATE discovery_runs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
      [runErr.message, new Date().toISOString(), runId]
    );
    schedulePersist();
    throw runErr;
  } finally {
    isRunInProgress = false;
  }
}
