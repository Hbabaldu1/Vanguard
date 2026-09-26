import { ExtractedOpportunityData } from './gemini-extractor.js';
import { ScoreBreakdown, Source } from '../../src/types/opportunity.js';

export function calculateRelevanceScore(
  data: ExtractedOpportunityData,
  source?: Source | { reliability_score?: number }
): { score: number; breakdown: ScoreBreakdown; statusLabel: string } {
  const notes: string[] = [];

  // 1. Source Authority (0 - 20)
  const sourceRel = source?.reliability_score ?? 80;
  const sourceAuthority = Math.round((sourceRel / 100) * 20);
  notes.push(`Source authority rating: ${sourceAuthority}/20 based on verified provider trust`);

  // 2. Eligibility Match (0 - 25)
  let eligibilityMatch = 15;
  if (data.region_tag === 'nigeria') {
    eligibilityMatch = 25;
    notes.push('Direct Nigeria geographic eligibility match (+25 pts)');
  } else if (data.region_tag === 'pan_africa' || data.region_tag === 'sub_saharan_africa') {
    eligibilityMatch = 22;
    notes.push('Pan-African / Regional geographic match (+22 pts)');
  } else if (data.region_tag === 'global') {
    eligibilityMatch = 18;
    notes.push('Global open opportunity (+18 pts)');
  } else {
    notes.push('General international eligibility (+15 pts)');
  }

  // 3. Deadline Validity (0 - 20)
  let deadlineValidity = 10;
  if (data.deadline_at) {
    const deadlineTime = new Date(data.deadline_at).getTime();
    const now = Date.now();
    const diffDays = (deadlineTime - now) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      deadlineValidity = 0;
      notes.push('Deadline has expired (0/20)');
    } else if (diffDays >= 14) {
      deadlineValidity = 20;
      notes.push(`Healthy deadline window: ${Math.round(diffDays)} days remaining (+20 pts)`);
    } else if (diffDays >= 3) {
      deadlineValidity = 15;
      notes.push(`Expiring soon: ${Math.round(diffDays)} days remaining (+15 pts)`);
    } else {
      deadlineValidity = 8;
      notes.push('Urgent deadline (< 3 days remaining)');
    }
  } else {
    notes.push('Deadline unconfirmed in source announcement (baseline +10 pts)');
  }

  // 4. Opportunity Value & Benefits (0 - 20)
  let opportunityValue = 12;
  if (data.award_amount_text && data.award_amount_text.length > 2) {
    opportunityValue = 20;
    notes.push(`Confirmed tangible financial award specified: ${data.award_amount_text} (+20 pts)`);
  } else if (['grant', 'accelerator', 'fellowship', 'funding_call'].includes(data.opportunity_type)) {
    opportunityValue = 16;
    notes.push(`High-impact program category: ${data.opportunity_type} (+16 pts)`);
  } else {
    notes.push(`Standard program benefits (+12 pts)`);
  }

  // 5. Content Completeness (0 - 15)
  let completeness = 0;
  if (data.organizer && data.organizer !== 'Unknown') completeness += 3;
  if (data.canonical_url && data.canonical_url.startsWith('http')) completeness += 3;
  if (data.application_url && data.application_url.startsWith('http')) completeness += 3;
  if (data.requirements && data.requirements.length > 0) completeness += 3;
  if (data.application_steps && data.application_steps.length > 0) completeness += 3;
  notes.push(`Data completeness: ${completeness}/15 fields verified`);

  const total = Math.min(100, Math.max(0, sourceAuthority + eligibilityMatch + deadlineValidity + opportunityValue + completeness));

  let statusLabel = 'Needs review';
  if (total >= 75 && deadlineValidity > 0) {
    statusLabel = 'Eligibility confirmed';
  } else if (total >= 60) {
    statusLabel = 'Partially verified';
  }

  return {
    score: total,
    breakdown: {
      sourceAuthority,
      eligibilityMatch,
      deadlineValidity,
      opportunityValue,
      completeness,
      total,
      notes,
    },
    statusLabel,
  };
}
