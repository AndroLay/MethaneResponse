import { expect, test } from 'bun:test';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from '../../api/src/audit';
import { compareAuditRevisions } from './audit-comparison';

function pair() {
  const source = structuredClone(DEMO_SOURCES[0]!);
  return [createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' }), createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' })] as const;
}

test('compares saved decision fields and added, removed, and changed citations without mutating revisions', () => {
  const [before, after] = pair();
  before.bundle.citedEvidence = [
    { id: 'old', kind: 'detection', title: 'Old', reference: 'https://example.org/old', synthetic: true },
    { id: 'same', kind: 'detection', title: 'Before', reference: 'https://example.org/same', synthetic: true },
  ];
  after.bundle.citedEvidence = [
    { id: 'new', kind: 'detection', title: 'New', reference: 'https://example.org/new', synthetic: true },
    { id: 'same', kind: 'detection', title: 'After', reference: 'https://example.org/same', synthetic: true },
  ];
  after.reason = 'Updated reasoning'; after.result = 'insufficient_evidence';
  after.bundle.reason = after.reason; after.bundle.result = after.result;
  const frozen = JSON.stringify([before, after]);
  const result = compareAuditRevisions(before, after);
  expect(result.comparable).toBe(true);
  expect(result.added.map(item => item.id)).toEqual(['new']);
  expect(result.removed.map(item => item.id)).toEqual(['old']);
  expect(result.changed.map(item => item.id)).toEqual(['same']);
  expect(result.differences.map(item => item.field)).toEqual(['Assessment', 'Reason']);
  expect(JSON.stringify([before, after])).toBe(frozen);
});

test('refuses the same assessment, a different source, a different claim or mixed real/demo modes', () => {
  const [before, after] = pair();
  expect(compareAuditRevisions(before, before).comparable).toBe(false);
  expect(compareAuditRevisions(before, { ...after, sourceId: 'OTHER' }).comparable).toBe(false);
  expect(compareAuditRevisions(before, { ...after, claimType: 'operator_notified' }).comparable).toBe(false);
  expect(compareAuditRevisions(before, { ...after, synthetic: false }).comparable).toBe(false);
});

test('flags different snapshot bindings even if the snapshot label is unchanged', () => {
  const [before, after] = pair();
  const provenance = { provider: 'DEMO', dataset: 'DEMO', catalogUrl: 'https://example.org', downloadUrl: 'https://example.org/data', retrievedAt: '2026-01-01T00:00:00Z', archiveSha256: 'a'.repeat(64), snapshotId: 'same-label', license: 'DEMO', attribution: 'DEMO' };
  before.bundle.provenance = provenance;
  after.bundle.provenance = { ...provenance, archiveSha256: 'b'.repeat(64) };
  expect(compareAuditRevisions(before, after).snapshotChanged).toBe(true);
  expect(compareAuditRevisions(before, after).differences.some(item => item.field === 'Source archive hash')).toBe(true);
});

test('an identity or timestamp difference does not fabricate a decision change', () => {
  const [before, after] = pair();
  expect(compareAuditRevisions(before, after)).toMatchObject({ comparable: true, differences: [], added: [], removed: [], changed: [], recordedParent: false });
});

test('compares document inputs, exact claim scope, review parent and dataset byte binding', () => {
  const [before, after] = pair();
  const intelligence = {
    kind: 'llm_document_assessment' as const, modelVersion: 'DEMO', promptVersion: 'DEMO', reviewStatus: 'unreviewed' as const,
    generatedFromUserExcerpts: true as const, claimText: 'DEMO scope one', datasetInputSha256: 'a'.repeat(64),
    documentDigests: [{ id: 'doc', title: 'DEMO', sha256: 'c'.repeat(64) }], quotations: [], limitations: [],
  };
  before.bundle.intelligence = intelligence;
  after.bundle.intelligence = { ...intelligence, claimText: 'DEMO scope two', reviewStatus: 'approved', datasetInputSha256: 'b'.repeat(64), documentDigests: [{ id: 'doc', title: 'DEMO', sha256: 'd'.repeat(64) }], review: { reviewerId: 'DEMO-reviewer', reviewedAt: after.generatedAt, note: 'DEMO scope checked', parentBundleHash: before.bundleHash } };
  const comparison = compareAuditRevisions(before, after);
  expect(comparison.recordedParent).toBe(true);
  expect(comparison.snapshotChanged).toBe(true);
  expect(comparison.differences.map(item => item.field)).toContain('Dataset input hash');
  expect(comparison.differences.map(item => item.field)).toContain('Claim wording');
  expect(comparison.differences.map(item => item.field)).toContain('Document inputs');
});
