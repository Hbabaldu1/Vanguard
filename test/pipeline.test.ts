import assert from 'node:assert/strict';
import { normalizeUrl, computeFingerprint } from '../server/pipeline/deduplication.js';
import { calculateRelevanceScore } from '../server/pipeline/scoring.js';
import { runVerificationChecks } from '../server/pipeline/verification.js';
import { ExtractedOpportunityData } from '../server/pipeline/gemini-extractor.js';

console.log('=== RUNNING VANGUARD OPPORTUNITY INTELLIGENCE PIPELINE TESTS ===\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. URL Normalization Tests
test('URL Normalization strips tracking parameters and trailing slashes', () => {
  const dirty = 'https://Example.ORG/grants/apply/?utm_source=twitter&utm_medium=social&fbclid=12345#overview';
  const clean = normalizeUrl(dirty);
  assert.equal(clean, 'https://example.org/grants/apply');
});

test('URL Normalization handles clean URLs without modification', () => {
  const url = 'https://tonyelumelufoundation.org/apply';
  assert.equal(normalizeUrl(url), 'https://tonyelumelufoundation.org/apply');
});

// 2. SHA-256 Deduplication Tests
test('Fingerprint matches for identical canonical target despite tracking variations', () => {
  const url1 = 'https://afdb.org/opp?utm_source=linkedin';
  const url2 = 'https://afdb.org/opp/';
  const fp1 = computeFingerprint(url1, 'AgriPitch 2026', 'AfDB');
  const fp2 = computeFingerprint(url2, 'agripitch 2026', 'afdb');
  assert.equal(fp1, fp2);
});

test('Fingerprint distinguishes different opportunities with different titles', () => {
  const fp1 = computeFingerprint('https://afdb.org/opp', 'AgriPitch 2026', 'AfDB');
  const fp2 = computeFingerprint('https://afdb.org/opp', 'Renewable Energy Mini-Grids Tender', 'AfDB');
  assert.notEqual(fp1, fp2);
});

// 3. Relevance Scoring Tests
test('Scoring awards high eligibility points to Nigeria and Pan-Africa opportunities', () => {
  const sampleData: ExtractedOpportunityData = {
    title: 'Nigeria Tech Seed Grant',
    summary: 'A direct grant for Nigerian tech founders building software.',
    opportunity_type: 'grant',
    organizer: 'NITDA',
    canonical_url: 'https://nitda.gov.ng/grant',
    application_url: 'https://nitda.gov.ng/apply',
    geographic_eligibility: 'Nigeria',
    region_tag: 'nigeria',
    target_audience: 'Nigerian builders',
    benefits_description: '₦10,000,000 cash grant and mentorship',
    award_amount_text: '₦10,000,000',
    deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    deadline_tz: 'WAT',
    is_deadline_estimated: false,
    requirements: ['Nigerian citizen', 'Registered CAC business'],
    application_steps: ['Submit deck', 'Pitch to panel'],
    why_it_matters: 'Provides non-dilutive capital directly in local currency.',
    unconfirmed_info_notes: null,
    confidence_score: 95,
  };

  const result = calculateRelevanceScore(sampleData, { reliability_score: 90 });
  assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
  assert.equal(result.breakdown.eligibilityMatch, 25, 'Nigeria should receive 25 eligibility points');
  assert.equal(result.breakdown.deadlineValidity, 20, 'Future deadline should receive 20 deadline points');
  assert.equal(result.statusLabel, 'Eligibility confirmed');
});

// 4. Deadline Handling & Anti-Fabrication Tests
test('Expired deadline is detected and rejected from active publication', () => {
  const expiredData: ExtractedOpportunityData = {
    title: 'Past Grant Call 2024',
    summary: 'An old grant call from last year.',
    opportunity_type: 'grant',
    organizer: 'Old Foundation',
    canonical_url: 'https://example.com/past-grant',
    application_url: 'https://example.com/apply',
    geographic_eligibility: 'Global',
    region_tag: 'global',
    target_audience: 'Founders',
    benefits_description: '$10,000',
    award_amount_text: '$10,000',
    deadline_at: '2024-01-01T00:00:00Z', // Past deadline
    deadline_tz: 'UTC',
    is_deadline_estimated: false,
    requirements: ['Eligibility 1'],
    application_steps: ['Step 1'],
    why_it_matters: 'Historic grant.',
    unconfirmed_info_notes: null,
    confidence_score: 90,
  };

  const rawItem = {
    externalId: 'ext_past_1',
    title: 'Past Grant Call 2024',
    rawContent: 'Old text',
    url: 'https://example.com/past-grant',
    publishedAt: '2024-01-01T00:00:00Z',
    sourceId: 'src_test',
  };

  const verification = runVerificationChecks(expiredData, rawItem, 'test_opp_expired');
  assert.equal(verification.status, 'rejected');
  assert.ok(verification.rejectionReason?.includes('deadline has already passed'));
});

test('Missing deadline is safely marked without fabricating future dates', () => {
  const unconfirmedDeadlineData: ExtractedOpportunityData = {
    title: 'Rolling Venture Fellowship',
    summary: 'An ongoing fellowship program with rolling admissions.',
    opportunity_type: 'fellowship',
    organizer: 'Venture Hub',
    canonical_url: 'https://example.com/fellowship',
    application_url: 'https://example.com/apply',
    geographic_eligibility: 'Pan-Africa',
    region_tag: 'pan_africa',
    target_audience: 'Innovators',
    benefits_description: 'Mentorship and office space',
    award_amount_text: null, // No fabricated money
    deadline_at: null,       // No fabricated date
    deadline_tz: null,
    is_deadline_estimated: false,
    requirements: ['African resident'],
    application_steps: ['Submit online'],
    why_it_matters: 'Continuous rolling support.',
    unconfirmed_info_notes: 'Deadline not confirmed in source announcement',
    confidence_score: 80,
  };

  const rawItem = {
    externalId: 'ext_rolling_1',
    title: 'Rolling Venture Fellowship',
    rawContent: 'Venture Hub announces open admissions for African innovators.',
    url: 'https://example.com/fellowship',
    publishedAt: null,
    sourceId: 'src_test',
  };

  const verification = runVerificationChecks(unconfirmedDeadlineData, rawItem, 'test_opp_rolling');
  assert.ok(verification.status === 'verified' || verification.status === 'partially_verified');
  const deadlineCheck = verification.checks.find(c => c.check_type === 'deadline_freshness');
  assert.ok(deadlineCheck?.passed, 'Ongoing/unspecified deadlines pass without error');
  assert.equal(unconfirmedDeadlineData.deadline_at, null);
});

// 5. Verification Schema Rejections
test('Malformed URL fails canonical verification', () => {
  const badUrlData: ExtractedOpportunityData = {
    title: 'Suspicious Scheme',
    summary: 'A program with invalid link.',
    opportunity_type: 'grant',
    organizer: 'Unknown Corp',
    canonical_url: 'not-a-valid-url',
    application_url: 'javascript:void(0)',
    geographic_eligibility: 'Global',
    region_tag: 'global',
    target_audience: 'Everyone',
    benefits_description: 'Free money',
    award_amount_text: null,
    deadline_at: null,
    deadline_tz: null,
    is_deadline_estimated: false,
    requirements: [],
    application_steps: [],
    why_it_matters: 'None',
    unconfirmed_info_notes: null,
    confidence_score: 20,
  };

  const rawItem = {
    externalId: 'ext_bad_1',
    title: 'Suspicious Scheme',
    rawContent: 'Click here now',
    url: 'not-a-valid-url',
    publishedAt: null,
    sourceId: 'src_test',
  };

  const verification = runVerificationChecks(badUrlData, rawItem, 'test_opp_bad');
  assert.equal(verification.status, 'rejected');
  assert.ok(verification.rejectionReason?.includes('canonical URL'));
});

console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
if (passedTests === totalTests) {
  console.log('ALL PIPELINE UNIT TESTS PASSED SUCCESSFULLY! ✓');
} else {
  console.error('SOME UNIT TESTS FAILED!');
  process.exit(1);
}
