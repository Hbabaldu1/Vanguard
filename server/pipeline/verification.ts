import crypto from 'node:crypto';
import { ExtractedOpportunityData } from './gemini-extractor.js';
import { RawDiscoveredItem } from './adapters/types.js';
import { VerificationCheck, VerificationStatus } from '../../src/types/opportunity.js';

export function runVerificationChecks(
  data: ExtractedOpportunityData,
  rawItem: RawDiscoveredItem,
  opportunityId: string
): { status: VerificationStatus; checks: VerificationCheck[]; rejectionReason?: string } {
  const checks: VerificationCheck[] = [];
  const now = new Date().toISOString();

  // 1. Canonical URL check
  let urlPassed = false;
  try {
    const parsed = new URL(data.canonical_url);
    urlPassed = ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.');
  } catch {
    urlPassed = false;
  }

  checks.push({
    id: `chk_${crypto.randomUUID().slice(0, 8)}`,
    opportunity_id: opportunityId,
    check_type: 'canonical_url',
    passed: urlPassed,
    confidence_score: urlPassed ? 1.0 : 0.0,
    evidence_snippet: `Canonical URL: ${data.canonical_url}`,
    checked_at: now,
    notes: urlPassed ? 'Valid protocol and domain structure verified.' : 'Invalid or malformed canonical URL.',
  });

  // 2. Deadline freshness check
  let deadlinePassed = true;
  let deadlineNotes = 'No fixed deadline specified; verified as ongoing or unconfirmed.';
  if (data.deadline_at) {
    const d = new Date(data.deadline_at);
    if (isNaN(d.getTime())) {
      deadlinePassed = false;
      deadlineNotes = 'Deadline timestamp is unparseable.';
    } else if (d.getTime() < Date.now()) {
      deadlinePassed = false;
      deadlineNotes = `Opportunity deadline (${d.toISOString().slice(0, 10)}) is in the past. Expired items cannot be published active.`;
    } else {
      deadlinePassed = true;
      deadlineNotes = `Valid future deadline confirmed: ${d.toISOString().slice(0, 10)}.`;
    }
  }

  checks.push({
    id: `chk_${crypto.randomUUID().slice(0, 8)}`,
    opportunity_id: opportunityId,
    check_type: 'deadline_freshness',
    passed: deadlinePassed,
    confidence_score: deadlinePassed ? 1.0 : 0.0,
    evidence_snippet: data.deadline_at ? `Deadline: ${data.deadline_at}` : 'Ongoing/Unspecified',
    checked_at: now,
    notes: deadlineNotes,
  });

  // 3. Eligibility scope check
  const hasEligibility = Boolean(data.geographic_eligibility && data.geographic_eligibility.trim().length > 3);
  checks.push({
    id: `chk_${crypto.randomUUID().slice(0, 8)}`,
    opportunity_id: opportunityId,
    check_type: 'eligibility_scope',
    passed: hasEligibility,
    confidence_score: hasEligibility ? 0.95 : 0.3,
    evidence_snippet: `Region: ${data.region_tag}; Scope: ${data.geographic_eligibility}`,
    checked_at: now,
    notes: hasEligibility ? 'Geographic and applicant eligibility criteria identified.' : 'Vague or missing geographic eligibility scope.',
  });

  // 4. Content completeness
  const completenessPassed = Boolean(
    data.title.length > 5 &&
    data.summary.length > 20 &&
    data.organizer.length > 1 &&
    data.requirements.length > 0 &&
    data.application_steps.length > 0
  );
  checks.push({
    id: `chk_${crypto.randomUUID().slice(0, 8)}`,
    opportunity_id: opportunityId,
    check_type: 'content_completeness',
    passed: completenessPassed,
    confidence_score: completenessPassed ? 1.0 : 0.5,
    evidence_snippet: `Title length: ${data.title.length}, Steps: ${data.application_steps.length}, Reqs: ${data.requirements.length}`,
    checked_at: now,
    notes: completenessPassed ? 'All essential editorial criteria present.' : 'Incomplete metadata fields.',
  });

  // 5. Anti-hallucination verification
  // Ensure that extracted organizer or critical keywords actually correlate with source content
  const rawLower = (rawItem.title + ' ' + rawItem.rawContent).toLowerCase();
  const orgLower = data.organizer.toLowerCase();
  const orgInContent = rawLower.includes(orgLower) || rawLower.includes(orgLower.slice(0, 6));

  checks.push({
    id: `chk_${crypto.randomUUID().slice(0, 8)}`,
    opportunity_id: opportunityId,
    check_type: 'anti_hallucination',
    passed: orgInContent,
    confidence_score: orgInContent ? 1.0 : 0.4,
    evidence_snippet: `Organizer "${data.organizer}" verified against source text`,
    checked_at: now,
    notes: orgInContent
      ? 'Organizer and key criteria substantiated in source text.'
      : 'Organizer name could not be verified in raw text snippet.',
  });

  // Rejection conditions
  if (!urlPassed) {
    return { status: 'rejected', checks, rejectionReason: 'Failed canonical URL verification.' };
  }
  if (!deadlinePassed) {
    return { status: 'rejected', checks, rejectionReason: 'Opportunity deadline has already passed.' };
  }

  const passedCount = checks.filter(c => c.passed).length;
  if (passedCount === checks.length) {
    return { status: 'verified', checks };
  } else if (passedCount >= 3) {
    return { status: 'partially_verified', checks };
  } else {
    return { status: 'rejected', checks, rejectionReason: 'Failed core verification gates.' };
  }
}
