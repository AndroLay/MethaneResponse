import { expect, test } from 'bun:test';
import { DEMO_SOURCES, HumanAssessmentInput } from '@methane/shared';
import { createHumanAssessment } from '../../api/src/human-assessment';
import { fetchLatestHumanAssessment } from './human-history';

const scope = { startDate: '2026-08-01', endDate: '2026-08-31' };
const input = HumanAssessmentInput.parse({ sourceId: 'DEMO-001', claimType: 'source_detected', datasetSnapshotId: 'DEMO', scope,
  claimText: 'DEMO private claim for history recovery.', rationale: 'DEMO missing independently inspected evidence.', result: 'insufficient_evidence', evidence: [], sourceInspected: true });
const context = { sourceId: input.sourceId, claimType: input.claimType, scope, synthetic: true };
const fixture = (revision: number, customScope = scope) => createHumanAssessment({ ...input, scope: customScope }, { source: DEMO_SOURCES[0], caseId: 'DEMO-history', metadata: {} }, 'DEMO-reviewer', revision);

test('latest human loader traverses pages, checks scope and digest, and keeps credential out of URL', async () => {
  const latest = fixture(3); const unrelated = fixture(9, { ...scope, startDate: '2026-08-02' });
  const calls: string[] = [];
  const fetcher: typeof fetch = (async (url, options) => {
    calls.push(String(url)); expect(options?.cache).toBe('no-store');
    expect(new Headers(options?.headers).get('authorization')).toBe('Bearer DEMO-private-token');
    return Response.json(calls.length === 1 ? { audits: [unrelated, fixture(1)], nextCursor: 'page2' } : { audits: [latest], nextCursor: null });
  }) as typeof fetch;
  expect((await fetchLatestHumanAssessment('', context, 'DEMO-private-token', undefined, fetcher))?.auditId).toBe(latest.auditId);
  expect(calls).toHaveLength(2); expect(calls.join()).not.toContain('DEMO-private-token');
  const tampered = structuredClone(latest); tampered.reason = 'Changed after hashing';
  await expect(fetchLatestHumanAssessment('', context, 'DEMO', undefined, (async () => Response.json({ audits: [tampered], nextCursor: null })) as typeof fetch)).rejects.toThrow('integrity');
});

test('latest human loader fails closed on denied access and looping pagination, or returns no match', async () => {
  await expect(fetchLatestHumanAssessment('', context, 'DEMO', undefined, (async () => new Response('', { status: 401 })) as typeof fetch)).rejects.toThrow('private history');
  await expect(fetchLatestHumanAssessment('', context, 'DEMO', undefined, (async () => Response.json({ audits: [], nextCursor: 'same' })) as typeof fetch)).rejects.toThrow('pagination');
  expect(await fetchLatestHumanAssessment('', context, 'DEMO', undefined, (async () => Response.json({ audits: [], nextCursor: null })) as typeof fetch)).toBeNull();
});
