export type OpportunityType =
  | 'grant'
  | 'scholarship'
  | 'fellowship'
  | 'startup_competition'
  | 'incubator'
  | 'accelerator'
  | 'funding_call'
  | 'research_opportunity'
  | 'job'
  | 'internship'
  | 'contract_tender'
  | 'business_partnership'
  | 'technology_program';

export type GeographicRegion =
  | 'nigeria'
  | 'sub_saharan_africa'
  | 'pan_africa'
  | 'global'
  | 'other';

export type VerificationStatus =
  | 'unverified'
  | 'verifying'
  | 'partially_verified'
  | 'verified'
  | 'rejected';

export type PublicationStatus =
  | 'draft'
  | 'discovered'
  | 'extracted'
  | 'verifying'
  | 'review_required'
  | 'review_pending'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'expired'
  | 'unpublished';

export type SourceType = 'rss' | 'api' | 'webpage';

export interface Source {
  id: string;
  name: string;
  slug: string;
  url: string;
  type: SourceType;
  category: OpportunityType;
  region: GeographicRegion;
  fetch_interval_minutes: number;
  enabled: boolean;
  reliability_score: number; // 0 - 100
  last_polled_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  last_http_status: number | null;
  last_latency_ms: number | null;
  is_healthy: boolean;
  created_at: string;
}

export interface DiscoveredItem {
  id: string;
  run_id: string;
  source_id: string;
  external_id: string;
  raw_url: string;
  canonical_url: string;
  raw_title: string;
  raw_content: string;
  raw_pub_date: string | null;
  content_hash: string;
  discovered_at: string;
  status: 'pending' | 'processed' | 'duplicate' | 'rejected';
}

export interface ScoreBreakdown {
  sourceAuthority: number;    // max 20
  eligibilityMatch: number;   // max 25
  deadlineValidity: number;   // max 20
  opportunityValue: number;   // max 20
  completeness: number;       // max 15
  total: number;              // 0 - 100
  notes: string[];
}

export interface Opportunity {
  id: string;
  discovered_item_id: string | null;
  source_id: string;
  source_name: string;
  source_domain: string;
  title: string;
  slug: string;
  summary: string;
  opportunity_type: OpportunityType;
  organizer: string;
  canonical_url: string;
  application_url: string;
  geographic_eligibility: string;
  region_tag: GeographicRegion;
  target_audience: string;
  benefits_description: string;
  award_amount_text: string | null;
  deadline_at: string | null;
  deadline_tz: string | null;
  is_deadline_estimated: boolean;
  requirements: string[];
  application_steps: string[];
  why_it_matters: string;
  unconfirmed_info_notes: string | null;
  relevance_score: number;
  score_breakdown: ScoreBreakdown;
  verification_status: VerificationStatus;
  publication_status: PublicationStatus;
  lifecycle_status?: PublicationStatus;
  extraction_confidence: number;
  source_published_at: string | null;
  published_at: string | null;
  discovered_at: string;
  last_verified_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationCheck {
  id: string;
  opportunity_id: string;
  check_type: 'canonical_url' | 'deadline_freshness' | 'eligibility_scope' | 'content_completeness' | 'anti_hallucination';
  passed: boolean;
  confidence_score: number;
  evidence_snippet: string;
  checked_at: string;
  notes: string;
}

export interface ReviewQueueItem {
  id: string;
  opportunity_id: string;
  opportunity?: Opportunity;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface DiscoveryRun {
  id: string;
  source_id: string | null;
  source_name?: string;
  status: 'running' | 'completed' | 'failed';
  items_found: number;
  items_new: number;
  items_duplicate: number;
  items_rejected: number;
  items_queued: number;
  items_published: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface AuditEvent {
  id: string;
  event_type:
    | 'discovery_started'
    | 'discovery_completed'
    | 'item_discovered'
    | 'item_deduplicated'
    | 'ai_extraction_completed'
    | 'ai_extraction_failed'
    | 'verification_passed'
    | 'verification_flagged'
    | 'quality_gate_passed'
    | 'quality_gate_failed'
    | 'opportunity_published'
    | 'opportunity_queued'
    | 'opportunity_unpublished'
    | 'scheduler_interval_changed'
    | 'emergency_pause_toggled';
  entity_type: 'source' | 'run' | 'item' | 'opportunity' | 'system';
  entity_id: string;
  actor: string;
  details: Record<string, any>;
  created_at: string;
}

export interface PublicationDestination {
  id: string;
  channel_type: 'web' | 'telegram' | 'newsletter' | 'webhook';
  name: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface PublicationAttempt {
  id: string;
  opportunity_id: string;
  destination_id: string;
  status: 'pending' | 'success' | 'failed';
  attempt_number: number;
  response_data: string | null;
  error_message: string | null;
  attempted_at: string;
}

export interface SystemQualitySettings {
  publishingMode: 'approval' | 'auto';
  emergencyPause: boolean;
  discoveryIntervalMinutes: 10 | 15 | 20 | 30;
  minimumScoreToPublish: number; // e.g. 70
  nigeriaPriorityBoost: number;  // score points
  requireOfficialUrl: boolean;
  autoArchiveExpired: boolean;
}

export interface SchedulerHealth {
  isRunning: boolean;
  isPaused: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRunsCompleted: number;
  activeSourcesCount: number;
  unhealthySourcesCount?: number;
  lastRunStats?: {
    itemsFound: number;
    itemsPublished: number;
    itemsQueued: number;
  };
}

export interface AdSensePublicConfig {
  enabled: boolean;
  clientId: string | null;
  slots: {
    feed: string | null;
    detail: string | null;
    sidebar: string | null;
  };
}
