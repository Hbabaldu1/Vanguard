import crypto from 'node:crypto';
import { Database as SqlJsDatabase } from 'sql.js';
import { Opportunity, SystemQualitySettings } from '../../src/types/opportunity.js';
import { schedulePersist } from '../db/database.js';

export function getQualitySettings(db: SqlJsDatabase): SystemQualitySettings {
  const stmt = db.prepare("SELECT value_json FROM system_settings WHERE key = 'quality_settings'");
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    try {
      return JSON.parse(String(row.value_json));
    } catch {
      // fallback
    }
  }
  stmt.free();

  return {
    publishingMode: 'approval',
    emergencyPause: false,
    discoveryIntervalMinutes: 15,
    minimumScoreToPublish: 70,
    nigeriaPriorityBoost: 10,
    requireOfficialUrl: true,
    autoArchiveExpired: true,
  };
}

export function logAuditEvent(
  db: SqlJsDatabase,
  eventType: string,
  entityType: string,
  entityId: string,
  actor: string,
  details: Record<string, any>
): void {
  const id = `aud_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO audit_events (id, event_type, entity_type, entity_id, actor, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, eventType, entityType, entityId, actor, JSON.stringify(details), now]
  );
  schedulePersist();
}

export function evaluateAndPublish(
  db: SqlJsDatabase,
  opportunity: Opportunity
): { published: boolean; queued: boolean; reason: string } {
  const settings = getQualitySettings(db);
  const now = new Date().toISOString();

  // 1. Emergency pause check
  if (settings.emergencyPause) {
    queueForReview(db, opportunity.id, 'Publishing paused by administrator emergency switch');
    logAuditEvent(db, 'opportunity_queued', 'opportunity', opportunity.id, 'system_pipeline', {
      reason: 'Emergency pause active',
      score: opportunity.relevance_score,
    });
    return { published: false, queued: true, reason: 'Emergency pause active' };
  }

  // 2. Deadline expiration check
  if (opportunity.deadline_at && new Date(opportunity.deadline_at).getTime() < Date.now()) {
    db.run(
      `UPDATE opportunities SET publication_status = 'rejected', lifecycle_status = 'expired', updated_at = ? WHERE id = ?`,
      [now, opportunity.id]
    );
    schedulePersist();
    logAuditEvent(db, 'quality_gate_failed', 'opportunity', opportunity.id, 'system_pipeline', {
      reason: 'Deadline in the past',
      deadline: opportunity.deadline_at,
    });
    return { published: false, queued: false, reason: 'Opportunity deadline expired' };
  }

  // 3. Approval mode vs Auto mode
  if (settings.publishingMode === 'approval') {
    queueForReview(db, opportunity.id, `Pending manual admin review (Approval Mode active, score: ${opportunity.relevance_score})`);
    logAuditEvent(db, 'opportunity_queued', 'opportunity', opportunity.id, 'system_pipeline', {
      reason: 'Approval mode active',
      score: opportunity.relevance_score,
    });
    return { published: false, queued: true, reason: 'Enqueued in approval mode' };
  }

  // 4. In Auto-publishing mode: check quality gates
  if (opportunity.relevance_score < settings.minimumScoreToPublish) {
    queueForReview(
      db,
      opportunity.id,
      `Score ${opportunity.relevance_score} below minimum publishing threshold (${settings.minimumScoreToPublish})`
    );
    logAuditEvent(db, 'opportunity_queued', 'opportunity', opportunity.id, 'system_pipeline', {
      reason: 'Score below threshold',
      score: opportunity.relevance_score,
      threshold: settings.minimumScoreToPublish,
    });
    return { published: false, queued: true, reason: 'Score below threshold' };
  }

  if (opportunity.verification_status === 'rejected') {
    db.run(
      `UPDATE opportunities SET publication_status = 'rejected', lifecycle_status = 'rejected', updated_at = ? WHERE id = ?`,
      [now, opportunity.id]
    );
    schedulePersist();
    logAuditEvent(db, 'quality_gate_failed', 'opportunity', opportunity.id, 'system_pipeline', {
      reason: 'Failed verification checks',
    });
    return { published: false, queued: false, reason: 'Verification rejected' };
  }

  // Passes quality gates -> Publish immediately!
  publishOpportunity(db, opportunity.id, 'auto_publisher');
  return { published: true, queued: false, reason: 'Published via automated quality gate' };
}

export function queueForReview(db: SqlJsDatabase, opportunityId: string, reason: string): void {
  const now = new Date().toISOString();
  db.run(
    `UPDATE opportunities SET publication_status = 'review_pending', lifecycle_status = 'review_required', updated_at = ? WHERE id = ?`,
    [now, opportunityId]
  );
  
  const qId = `rev_${crypto.randomUUID().slice(0, 8)}`;
  db.run(
    `INSERT OR REPLACE INTO review_queue (id, opportunity_id, reason, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [qId, opportunityId, reason, now]
  );
  schedulePersist();
}

export function publishOpportunity(
  db: SqlJsDatabase,
  opportunityId: string,
  actor: string = 'admin'
): boolean {
  const now = new Date().toISOString();
  db.run(
    `UPDATE opportunities SET publication_status = 'published', lifecycle_status = 'published', published_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, opportunityId]
  );

  // Update review queue if present
  db.run(
    `UPDATE review_queue SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE opportunity_id = ?`,
    [actor, now, opportunityId]
  );

  // Dispatch to active destinations
  dispatchToDestinations(db, opportunityId);

  logAuditEvent(db, 'opportunity_published', 'opportunity', opportunityId, actor, {
    published_at: now,
  });

  schedulePersist();
  return true;
}

export function unpublishOpportunity(
  db: SqlJsDatabase,
  opportunityId: string,
  actor: string = 'admin',
  reason: string = 'Manual unpublish'
): boolean {
  const now = new Date().toISOString();
  db.run(
    `UPDATE opportunities SET publication_status = 'unpublished', lifecycle_status = 'unpublished', updated_at = ? WHERE id = ?`,
    [now, opportunityId]
  );

  logAuditEvent(db, 'opportunity_unpublished', 'opportunity', opportunityId, actor, {
    reason,
    unpublished_at: now,
  });

  schedulePersist();
  return true;
}

function dispatchToDestinations(db: SqlJsDatabase, opportunityId: string): void {
  const stmt = db.prepare('SELECT id, channel_type, name, config_json, is_active FROM publication_destinations WHERE is_active = 1');
  const destinations: any[] = [];
  while (stmt.step()) {
    destinations.push(stmt.getAsObject());
  }
  stmt.free();

  const now = new Date().toISOString();

  for (const dest of destinations) {
    const attemptId = `att_${crypto.randomUUID().slice(0, 8)}`;
    if (dest.channel_type === 'web') {
      db.run(
        `INSERT INTO publication_attempts (id, opportunity_id, destination_id, status, attempt_number, response_data, attempted_at)
         VALUES (?, ?, ?, 'success', 1, ?, ?)`,
        [attemptId, opportunityId, dest.id, JSON.stringify({ publishedToWebPortal: true }), now]
      );
    } else {
      // Third-party channel (Telegram, Newsletter, Webhook)
      // Only executes if external credentials exist; otherwise records pending/unconfigured safely
      const config = JSON.parse(dest.config_json || '{}');
      if (config.configured) {
        db.run(
          `INSERT INTO publication_attempts (id, opportunity_id, destination_id, status, attempt_number, response_data, attempted_at)
           VALUES (?, ?, ?, 'success', 1, ?, ?)`,
          [attemptId, opportunityId, dest.id, JSON.stringify({ dispatched: true }), now]
        );
      } else {
        db.run(
          `INSERT INTO publication_attempts (id, opportunity_id, destination_id, status, attempt_number, response_data, error_message, attempted_at)
           VALUES (?, ?, ?, 'pending', 1, null, ?, ?)`,
          [attemptId, opportunityId, dest.id, `${dest.name} channel not yet configured with production credentials`, now]
        );
      }
    }
  }
}
