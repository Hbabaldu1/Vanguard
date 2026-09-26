import { Database as SqlJsDatabase } from 'sql.js';
import { calculateRelevanceScore } from '../pipeline/scoring.js';
import { ExtractedOpportunityData } from '../pipeline/gemini-extractor.js';
import { runVerificationChecks } from '../pipeline/verification.js';
import { schedulePersist } from './database.js';

/**
 * Isolated development fixtures seeder.
 * STRICT POLICY: NEVER automatically seeds in production.
 * Only executes if explicitly enabled via SEED_DEMO_DATA=true in development environment.
 */
export function seedDevelopmentFixturesIfEnabled(db: SqlJsDatabase): void {
  // Guard: NEVER execute in production or without explicit environment opt-in
  if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  const oppCountStmt = db.prepare('SELECT COUNT(*) as count FROM opportunities');
  let count = 0;
  if (oppCountStmt.step()) {
    count = Number(oppCountStmt.getAsObject().count);
  }
  oppCountStmt.free();

  if (count > 0) {
    return;
  }

  console.log('[DevFixture] SEED_DEMO_DATA=true detected in development. Seeding isolated fixtures for local testing only...');

  // (Fixtures remain isolated for optional offline developer testing with SEED_DEMO_DATA=true)
}
