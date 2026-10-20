import { expect, test } from 'bun:test';
import { SharedCaseWork } from '@methane/shared';
import { buildEvidenceOverlapReport, verifyEvidenceOverlapReport } from '@methane/shared/evidence-overlap';
const work = (id: string, update: any = {}) => SharedCaseWork.parse({ workId: id, revision: 1, context: { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO' }, status: 'investigate', question: '', notes: '', evidenceRequest: '', nextAction: '', claimType: 'mitigation_confirmed', ownerId: 'DEMO-reviewer', updatedBy: 'DEMO-reviewer', createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z', scope: { startDate: '2026-07-01', endDate: '2026-07-31' }, ...update });
const responses = (sha256 = 'a'.repeat(64)) => [{ type: 'issued', requestId: 'DEMO-request', requirement: 'DEMO evidence requirement', acceptanceCriteria: 'DEMO source and period', recipientRole: 'operator', dueDate: '2026-10-25' }, { type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response', reference: 'https://example.org/DEMO.pdf', locator: 'DEMO page 1', sha256, rights: 'owned', reportedDate: { precision: 'month', value: '2026-07' } }];
test('overlap report replays deterministically regardless of work ordering', async () => {
  const a = work('DEMO-a'), b = work('DEMO-b');
  const report = await buildEvidenceOverlapReport(a, [a,b]);
  expect(await buildEvidenceOverlapReport(a, [b,a])).toEqual(report);
  expect(await verifyEvidenceOverlapReport(report, report.digest)).toBe(true);
  expect(report.candidates[0].reasons).toEqual(['same_source_overlapping_period']);
});
test('different source, claim, nonoverlapping scope or unknown scope is not a duplicate-action inference', async () => {
  const a = work('DEMO-a');
  for (const changed of [{ context: { ...a.context, sourceId: 'DEMO_OTHER' } }, { claimType: 'source_detected' }, { scope: undefined }, { scope: { startDate: '2026-08-01', endDate: '2026-08-31' } }]) {
    expect((await buildEvidenceOverlapReport(a, [a,work('DEMO-b', changed)])).candidates).toHaveLength(0);
  }
});
test('same report across sources is flagged only as reused evidence and no private notes or URL is included', async () => {
  const a = work('DEMO-a', { requestEvents: responses() }), b = work('DEMO-b', { context: { ...a.context, sourceId: 'DEMO_OTHER' }, notes: 'PRIVATE-test', requestEvents: responses() });
  const report = await buildEvidenceOverlapReport(a, [a,b]);
  expect(report.candidates[0].reasons).toEqual(['shared_document_bytes','shared_reference_pointer']);
  expect(report.duplicateMitigationEstablished).toBe(false);
  expect(JSON.stringify(report)).not.toContain('PRIVATE-test'); expect(JSON.stringify(report)).not.toContain('https://');
});
test('rejected responses remain visible as recorded reused material without becoming accepted evidence', async () => {
  const events = [...responses(), { type: 'response_reviewed', requestId: 'DEMO-request', responseId: 'DEMO-response', decision: 'rejected', rationale: 'DEMO wrong date or facility' }];
  const a = work('DEMO-a', { requestEvents: events }), b = work('DEMO-b', { requestEvents: responses() });
  expect((await buildEvidenceOverlapReport(a, [a,b])).candidates[0].reasons).toContain('shared_document_bytes');
});
test('different snapshot, archive and synthetic boundary are excluded', async () => {
  const a = work('DEMO-a');
  for (const context of [{ ...a.context, datasetSnapshotId: 'DEMO-next' }, { ...a.context, archiveSha256: 'b'.repeat(64) }, { ...a.context, synthetic: false, archiveSha256: 'b'.repeat(64) }]) {
    const report = await buildEvidenceOverlapReport(a,[a,work('DEMO-b',{context})]); expect(report.input).toHaveLength(1);
  }
});
test('duplicate identities, stale target and more than 500 works are rejected', async () => {
  const a = work('DEMO-a');
  await expect(buildEvidenceOverlapReport(a,[a,a])).rejects.toThrow();
  await expect(buildEvidenceOverlapReport(a,[work('DEMO-a',{revision:2})])).rejects.toThrow();
  await expect(buildEvidenceOverlapReport(a,Array(501).fill(a))).rejects.toThrow();
});
test('altered report, rehashed content and added fields fail against trusted digest', async () => {
  const a = work('DEMO-a'), b = work('DEMO-b'), report = await buildEvidenceOverlapReport(a,[a,b]);
  expect(await verifyEvidenceOverlapReport({...report,candidates:[]},report.digest)).toBe(false);
  expect(await verifyEvidenceOverlapReport({...report, duplicateMitigationEstablished:true},report.digest)).toBe(false);
  expect(await verifyEvidenceOverlapReport({...report, physicalTruth:true},report.digest)).toBe(false);
  const changed = await buildEvidenceOverlapReport(a,[a,work('DEMO-b',{revision:2})]);
  expect(await verifyEvidenceOverlapReport(changed,report.digest)).toBe(false);
});
test('500-work bounded comparison does not materialize every pair', async () => {
  const works = Array.from({length:500},(_,i)=>work(`DEMO-${i}`));
  const report = await buildEvidenceOverlapReport(works[0],works);
  expect(report.candidates).toHaveLength(499); expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThan(1_048_576);
});
