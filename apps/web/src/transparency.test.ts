import { expect, test } from 'bun:test';
import { transparencySummaryPayload, type AuditResult } from '@methane/shared';
import { verifyTransparencyRecord, makeTransparencyRecord, fetchTransparencyRecord } from './transparency';

const fixture = () => ({
  auditId: '00000000-0000-4000-8000-000000000001', revision: 1, sourceId: 'DEMO-001', claimType: 'operator_notified', result: 'supported', generatedAt: '2026-10-17T00:00:00Z', synthetic: true, evidenceIds: ['DEMO-ref'], bundleHash: `0x${'a'.repeat(64)}`,
  bundle: { schemaVersion: 4, scope: { startDate: '2026-09-01', endDate: '2026-09-30', recipient: 'PRIVATE recipient' }, reason: 'PRIVATE rationale',
    humanAssessment: { claimText: 'PRIVATE claim', reviewerId: 'PRIVATE reviewer', submittedEvidence: [{ reference: 'https://example.org/PRIVATE', title: 'PRIVATE title' }],
      trust: { reviewer: { status: 'unverified', assessedAt: '2026-10-17T00:00:00Z', organization: 'PRIVATE organization' }, conflictDeclaration: 'not_declared', referenceChecks: [], publicSummaryConsent: true } },
  },
}) as unknown as AuditResult;

test('public projection is closed, consent-gated and contains no private free text', async () => {
  const audit = fixture();
  const payload = transparencySummaryPayload(audit)!;
  expect(payload).not.toBeNull();
  expect(JSON.stringify(payload)).not.toContain('PRIVATE');
  expect(payload.reviewerStatus).toBe('unverified');
  const record = await makeTransparencyRecord(audit);
  expect(await verifyTransparencyRecord(record)).toBe('valid');
  expect(await verifyTransparencyRecord({ ...record, summary: { ...record!.summary, result: 'contradicted' } })).toBe('invalid');
  expect(await verifyTransparencyRecord({ ...record, privateNotes: 'PRIVATE' })).toBe('invalid');
  expect(await verifyTransparencyRecord({ ...record, summary: { ...record!.summary, reviewerId: 'PRIVATE' } })).toBe('invalid');
  audit.bundle.humanAssessment!.trust!.publicSummaryConsent = false;
  expect(transparencySummaryPayload(audit)).toBeNull();
  expect(await makeTransparencyRecord(audit)).toBeNull();
});

test('offline checksum stays valid for historical bytes while current publication needs a live check', async () => {
  const record = await makeTransparencyRecord(fixture());
  const publication = { version: 2, status: 'withdrawn', reason: 'consent_withdrawn', changedAt: '2026-10-18T00:00:00Z',
    history: [{ version: 1, status: 'published', reason: 'publication_consent', changedAt: '2026-10-17T00:00:00Z' },
      { version: 2, status: 'withdrawn', reason: 'consent_withdrawn', changedAt: '2026-10-18T00:00:00Z' }] };
  expect(await verifyTransparencyRecord({ ...record, publication })).toBe('valid');
  expect(await verifyTransparencyRecord({ ...record, publication: { ...publication, actorId: 'PRIVATE' } })).toBe('invalid');
  expect(await verifyTransparencyRecord({ ...record, publication: { ...publication, internalNotes: 'PRIVATE' } })).toBe('invalid');
});

test('live summary checks reject unavailable, mismatched, tampered or status-less records', async () => {
  const record = await makeTransparencyRecord(fixture());
  const id = record!.summary.auditId;
  const original = globalThis.fetch;
  const publication = { version: 1, status: 'published', reason: 'publication_consent', changedAt: '2026-10-17T00:00:00Z',
    history: [{ version: 1, status: 'published', reason: 'publication_consent', changedAt: '2026-10-17T00:00:00Z' }] };
  try {
    globalThis.fetch = (async (url, options) => {
      expect(String(url)).toBe(`http://localhost/api/transparency/${id}`);
      expect(options?.cache).toBe('no-store');
      return Response.json({ ...record, publication });
    }) as typeof fetch;
    expect((await fetchTransparencyRecord('http://localhost', id)).publication!.status).toBe('published');
    for (const value of [record, { ...record, summary: { ...record!.summary, result: 'contradicted' }, publication }]) {
      globalThis.fetch = (async () => Response.json(value)) as typeof fetch;
      await expect(fetchTransparencyRecord('', id)).rejects.toThrow();
    }
    globalThis.fetch = (async () => Response.json({ ...record, publication })) as typeof fetch;
    await expect(fetchTransparencyRecord('', '00000000-0000-4000-8000-000000000002')).rejects.toThrow();
    globalThis.fetch = (async () => new Response('{}', { status: 503 })) as typeof fetch;
    await expect(fetchTransparencyRecord('', id)).rejects.toThrow();
  } finally { globalThis.fetch = original; }
});
