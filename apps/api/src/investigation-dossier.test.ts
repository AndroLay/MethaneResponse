import { beforeAll, expect, test } from 'bun:test';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import { appendPlanDecision } from '@methane/shared/plan-journal';
import { buildInvestigationDossier, investigationDigest, investigationReviewSignal, verifyInvestigationDossier, type InvestigationDossier } from '@methane/shared/investigation-dossier';
import { createHash } from 'node:crypto';

let dossier: InvestigationDossier;
beforeAll(async () => {
  const context = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64) };
  const report = await buildInvestigationPortfolio({ dataset: { datasetSnapshotId: 'DEMO', archiveSha256: context.archiveSha256, inputFileSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 1, archiveStartDate: '2026-01-01', archiveEndDate: '2026-01-02' }, parameters: { capacity: 1, maxPerCountry: 1, recurrenceWeight: 50, countries: [], sectors: [] }, candidates: [{ sourceId: context.sourceId, country: 'DEMO', sector: 'DEMO', observationCount: 1, distinctDates: 1, missingFluxCount: 0, medianFluxKgHr: 10, medianUncertaintyKgHr: 2, lastObserved: '2026-01-02' }] });
  const journal = await appendPlanDecision(null, 'DEMO-plan', report, { strategy: 'weighted', decision: 'accept', rationale: 'DEMO software acceptance of this proposed allocation.' }, 0, null, 'DEMO-reviewer');
  dossier = await buildInvestigationDossier(context, 'DEMO-work', [{ context, workId: 'DEMO-work', revision: 1, ownerId: 'DEMO-reviewer', updatedBy: 'DEMO-reviewer', createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-01-03T00:00:00.000Z', status: 'investigate', claimType: 'source_detected', question: 'DEMO investigation', notes: 'DEMO original notes', evidenceRequest: '', nextAction: '', planLink: { planId: journal.planId, revision: 1, revisionHash: journal.revisions[0].hash, reportDigest: report.digest, strategy: 'weighted' } }], { plans: [journal], transitions: [], assessments: [] });
});
async function rehash(value: InvestigationDossier) { const { digest: _, ...payload } = value; value.digest = await investigationDigest(payload); return value; }

test('dossier commitment detects edits and rehashing against a separately trusted head', async () => {
  expect(await verifyInvestigationDossier(dossier, dossier.digest)).toBe(true);
  const edited = structuredClone(dossier); edited.history[0].notes = 'DEMO silently edited';
  expect(await verifyInvestigationDossier(edited, dossier.digest)).toBe(false);
  await rehash(edited); expect(await verifyInvestigationDossier(edited, dossier.digest)).toBe(false);
  const padded = structuredClone(dossier); padded.history[0].question = ' ' + padded.history[0].question + ' ';
  expect(await verifyInvestigationDossier(padded, dossier.digest)).toBe(false);
});
test('rehashed exports still fail if plan membership, revision links or work history do not match', async () => {
  for (const mutation of [
    (v: InvestigationDossier) => { v.history[0].planLink!.revisionHash = '0x'+'f'.repeat(64); },
    (v: InvestigationDossier) => { v.history[0].revision = 2; },
    (v: InvestigationDossier) => { v.history[0].workId = 'DEMO-other'; },
    (v: InvestigationDossier) => { v.context.sourceId = 'DEMO-other'; v.history[0].context.sourceId = 'DEMO-other'; },
    (v: InvestigationDossier) => { v.plans = []; },
    (v: InvestigationDossier) => { v.plans.push(v.plans[0]); },
  ]) { const value = structuredClone(dossier); mutation(value); await rehash(value); expect(await verifyInvestigationDossier(value, value.digest)).toBe(false); }
});
test('a later plan decision is retained without rewriting the historically accepted link', async () => {
  const value = structuredClone(dossier), plan = value.plans[0];
  value.plans[0] = await appendPlanDecision(plan, plan.planId, plan.reports[0], { strategy: 'weighted', decision: 'reject', rationale: 'DEMO later rejection pending further evidence.' }, 1, plan.revisions[0].hash, 'DEMO-reviewer');
  await rehash(value); expect(await verifyInvestigationDossier(value, value.digest)).toBe(true);
  expect(value.history[0].planLink!.revision).toBe(1); expect(value.plans[0].revisions[1].decision).toBe('reject');
});
test('dossier cannot assert a physical outcome or chain receipt', async () => {
  for (const field of ['physicalOutcomeEstablished','chainAnchored'] as const) {
    const value = structuredClone(dossier); (value as any)[field] = true; await rehash(value);
    expect(await verifyInvestigationDossier(value, value.digest)).toBe(false);
  }
});
test('assessment validation rejects incomplete and mismatched bundle versions even after rehash', async () => {
  const base = { schemaVersion: 2, auditId: 'DEMO-audit', caseId: 'DEMO-case', revision: 1, generatedAt: '2026-01-03T00:00:00.000Z', sourceId: 'DEMO_SOURCE', synthetic: true,
    claimType: 'source_detected', result: 'insufficient_evidence', reason: 'DEMO no eligible reference.', citedEvidence: [], externalEvidence: [], limitations: ['DEMO software fixture'] };
  const attach = async (bundle: Record<string, unknown>) => {
    const value = structuredClone(dossier), bundleHash = await investigationDigest(bundle);
    value.assessments = [{ bundleHash, bundle }]; value.history[0].assessmentLink = { auditId: 'DEMO-audit', bundleHash };
    return rehash(value);
  };
  const legacy = await attach(base); expect(await verifyInvestigationDossier(legacy, legacy.digest)).toBe(true);
  for (const field of ['result','reason','citedEvidence','externalEvidence','caseId','revision','generatedAt','limitations']) {
    const incomplete: Record<string,unknown> = { ...base }; delete incomplete[field];
    const value = await attach(incomplete); expect(await verifyInvestigationDossier(value, value.digest)).toBe(false);
  }
  for (const mutation of [{ result: 'confirmed_repair' }, { citedEvidence: [42] }, { revision: 0 }, { schemaVersion: 3 }, { schemaVersion: 4 }, { intelligence: { kind: 'llm_document_assessment' } }]) {
    const value = await attach({ ...base, ...mutation }); expect(await verifyInvestigationDossier(value, value.digest)).toBe(false);
  }
  const scope = { startDate: '2026-01-01', endDate: '2026-01-02' };
  const citation = { id: 'DEMO-observation', kind: 'detection', reference: 'https://example.org/DEMO', date: '2026-01-02', title: 'DEMO observation', synthetic: true };
  for (const mutation of [{ date: '2026-02-01' }, { date: undefined }, { reference: '' }, { observationId: 'DEMO-other' }]) {
    const value = await attach({ ...base, scope: { ...scope, observationId: 'DEMO-observation' }, result: 'supported', citedEvidence: [{ ...citation, ...mutation }] });
    value.history[0].scope = { ...scope, observationId: 'DEMO-observation' }; await rehash(value);
    expect(await verifyInvestigationDossier(value, value.digest)).toBe(false);
  }
});
test('review signals inspect both sides of corrected dates and preserve observation-ID scope', () => {
  const work = { context: { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO' }, scope: { startDate: '2026-01-03', endDate: '2026-01-05' } };
  const transition = { sourceChanges: [], observationChanges: [
    { id: 'DEMO-enters', before: { sourceId: 'DEMO_SOURCE', date: '2026-01-02' }, after: { sourceId: 'DEMO_SOURCE', date: '2026-01-04' } },
    { id: 'DEMO-leaves', before: { sourceId: 'DEMO_SOURCE', date: '2026-01-03' }, after: { sourceId: 'DEMO_SOURCE', date: '2026-01-06' } },
    { id: 'DEMO-outside', before: null, after: { sourceId: 'DEMO_SOURCE', date: '2026-02-01' } },
    { id: 'DEMO-other', before: null, after: { sourceId: 'DEMO_OTHER', date: '2026-01-04' } },
  ] } as any;
  expect(investigationReviewSignal(work, transition).observationIds).toEqual(['DEMO-enters','DEMO-leaves']);
  expect(investigationReviewSignal({ ...work, scope: { ...work.scope, observationId: 'DEMO-leaves' } }, transition).observationIds).toEqual(['DEMO-leaves']);
  expect(investigationReviewSignal({ ...work, scope: { startDate: '2026-03-01', endDate: '2026-03-02' } }, transition).state).toBe('no_compared_changes');
});
test('human and model assessments retain their kinds, eligible references and quotation commitments', async () => {
  const scope = { startDate: '2026-01-01', endDate: '2026-01-02' }, quote = 'DEMO exact software quotation only.', quoteSha256 = createHash('sha256').update(quote).digest('hex');
  const reference = { id: 'DEMO-ref', sourceId: 'DEMO_SOURCE', kind: 'detection', title: 'DEMO reference', reference: 'https://example.org/DEMO', locator: 'DEMO row 1', date: '2026-01-02' };
  const base = { auditId: 'DEMO-assessment', caseId: 'DEMO-case', revision: 1, generatedAt: '2026-01-03T00:00:00.000Z', sourceId: 'DEMO_SOURCE', synthetic: true, scope,
    claimType: 'source_detected', result: 'supported', reason: 'DEMO reference coverage fixture.', externalEvidence: [], limitations: ['DEMO only'] };
  const human = { ...base, schemaVersion: 4, citedEvidence: [{ ...reference, claimType: 'source_detected', synthetic: true }], humanAssessment: {
    kind: 'human_evidence_assessment', reviewerId: 'DEMO-reviewer', reviewedAt: base.generatedAt, sourceInspected: true, claimText: 'DEMO declared source observation.', publication: 'private',
    submittedEvidence: [reference], baseline: { result: 'supported', reason: 'DEMO reference present', evidenceIds: [reference.id] },
  } };
  const model = { ...base, schemaVersion: 3, citedEvidence: [{ id: `DEMO-doc:0:${quoteSha256.slice(0,12)}`, title: 'DEMO excerpt', kind: 'document_excerpt', reference: 'https://example.org/DEMO', synthetic: true }], intelligence: {
    kind: 'llm_document_assessment', modelVersion: 'DEMO-model', promptVersion: 'DEMO-prompt', reviewStatus: 'unreviewed', generatedFromUserExcerpts: true,
    documentDigests: [{ id: 'DEMO-doc', title: 'DEMO document', sha256: 'a'.repeat(64) }], quotations: [{ documentId: 'DEMO-doc', quote, quoteSha256 }], limitations: ['DEMO not a live provider'],
  } };
  const verify = async (bundle: Record<string,unknown>) => {
    const value = structuredClone(dossier), bundleHash = await investigationDigest(bundle); value.history[0].scope = scope;
    value.history[0].assessmentLink = { auditId: base.auditId, bundleHash }; value.assessments = [{ bundleHash, bundle }]; await rehash(value);
    return verifyInvestigationDossier(value, value.digest);
  };
  expect(await verify(human)).toBe(true); expect(await verify(model)).toBe(true);
  const humanDate = structuredClone(human); humanDate.humanAssessment.submittedEvidence[0].date = '2026-02-01'; humanDate.citedEvidence[0].date = '2026-02-01';
  expect(await verify(humanDate)).toBe(false);
  const modelQuote = structuredClone(model); modelQuote.intelligence.quotations[0].quote = 'DEMO edited quotation.'; expect(await verify(modelQuote)).toBe(false);
  const wrongDocument = structuredClone(model); wrongDocument.intelligence.quotations[0].documentId = 'DEMO-absent'; expect(await verify(wrongDocument)).toBe(false);
  const noReview = structuredClone(model); noReview.intelligence.reviewStatus = 'approved'; expect(await verify(noReview)).toBe(false);
});
