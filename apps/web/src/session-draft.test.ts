import { expect, test } from 'bun:test';
import { readSessionDraft, writeSessionDraft, clearSessionDraft, humanDraftSchema, caseDraftSchema, appendAssessmentRequest } from './session-draft';
import { CaseWorkDraft } from '@methane/shared';
function storageFixture(): Storage { const map = new Map<string, string>(); return { get length() { return map.size; }, key: i => [...map.keys()][i] || null, getItem: k => map.get(k) ?? null, setItem: (k,v) => { map.set(k,v); }, removeItem: k => { map.delete(k); }, clear: () => map.clear() }; }
const human = { claimText: 'Incomplete claim', rationale: '', result: 'insufficient_evidence', evidence: [{ id: 'ref1', sourceId: 's1', kind: 'notification', title: '', reference: 'unfinished URL' }], nextEvidenceRequest: 'Find receipt' };
test('session draft recovers incomplete metadata and excludes credentials and confirmation', () => {
  const storage = storageFixture();
  expect(writeSessionDraft('human', 'context-a', humanDraftSchema, { ...human, token: 'SECRET', inspected: true, sourceInspected: true }, storage)).toBe(true);
  expect(readSessionDraft('human', 'context-a', humanDraftSchema, storage)).toEqual(human);
  expect(storage.getItem(storage.key(0)!)).not.toContain('SECRET');
  expect(storage.getItem(storage.key(0)!)).not.toContain('Inspected');
  expect(readSessionDraft('human', 'context-b', humanDraftSchema, storage)).toBeNull();
  clearSessionDraft('human', 'context-a', storage);
  expect(readSessionDraft('human', 'context-a', humanDraftSchema, storage)).toBeNull();
});
test('case draft retains the revision it was edited against and handles blocked storage', () => {
  const storage = storageFixture();
  const value = { draft: { status: 'investigate', question: '', notes: 'Unfinished', evidenceRequest: '', nextAction: '', claimType: 'source_detected' }, baseRevision: 4 };
  expect(writeSessionDraft('case', 'case-one', caseDraftSchema, value, storage)).toBe(true);
  expect(readSessionDraft('case', 'case-one', caseDraftSchema, storage)).toEqual(value);
  storage.setItem = () => { throw new Error('blocked'); };
  expect(writeSessionDraft('case', 'case-one', caseDraftSchema, value, storage)).toBe(false);
});
test('follow-up transfer preserves triage, existing request and audit lineage', () => {
  const draft = CaseWorkDraft.parse({ status: 'deferred', question: '', notes: '', evidenceRequest: 'Existing request', nextAction: '', claimType: 'operator_notified' });
  const audit = { auditId: 'audit-one', bundleHash: `0x${'a'.repeat(64)}`, sourceId: 's1', claimType: 'operator_notified', synthetic: false, bundle: { humanAssessment: { nextEvidenceRequest: 'Obtain dated receipt' } } } as any;
  const result = appendAssessmentRequest(draft, audit);
  expect(result).toMatchObject({ status: 'deferred', evidenceRequest: 'Existing request\n\nObtain dated receipt', assessmentLink: { auditId: 'audit-one', bundleHash: audit.bundleHash } });
  expect(appendAssessmentRequest(result!, audit)).toEqual(result);
  expect(appendAssessmentRequest({ ...draft, evidenceRequest: 'x'.repeat(1000) }, audit)).toBeNull();
});

test('follow-up transfer rejects another source, mode or dataset snapshot', () => {
  const draft = CaseWorkDraft.parse({ status: 'investigate', question: '', notes: '', evidenceRequest: '', nextAction: '', claimType: 'source_detected' });
  const context = { sourceId: 's1', synthetic: false, datasetSnapshotId: 'snapshot-a', archiveSha256: 'a'.repeat(64) };
  const audit = { auditId: 'a1', bundleHash: `0x${'a'.repeat(64)}`, sourceId: 's1', claimType: 'source_detected', synthetic: false, bundle: { provenance: { snapshotId: 'snapshot-b', archiveSha256: 'a'.repeat(64) }, humanAssessment: { nextEvidenceRequest: 'Request the dated record' } } } as any;
  expect(appendAssessmentRequest(draft, audit, context)).toBeNull();
  audit.bundle.provenance.snapshotId = 'snapshot-a';
  expect(appendAssessmentRequest(draft, audit, context)).not.toBeNull();
  audit.sourceId = 's2'; expect(appendAssessmentRequest(draft, audit, context)).toBeNull();
  audit.sourceId = 's1'; audit.synthetic = true; expect(appendAssessmentRequest(draft, audit, context)).toBeNull();
});

test('recovery metadata refuses embedded URL credentials', () => {
  const storage = storageFixture();
  expect(writeSessionDraft('human', 'private-link', humanDraftSchema, { ...human, evidence: [{ ...human.evidence[0], reference: 'https://user:password@example.org/receipt' }] }, storage)).toBe(false);
  expect(storage.length).toBe(0);
});
