import { expect, test } from 'bun:test';
import { AuditInput, DEMO_SOURCES, type Evidence } from '@methane/shared';
import { assess, createAudit } from './audit';
import { createApp } from './app';
import { getIntelligenceSnapshot } from './intelligence-data';
import { MemoryAuditStore } from './store';
import { resolveScopedSource } from './scoped-source';
import { findCaseBySourceId } from './casebook';

const scope = { startDate: '2026-09-01', endDate: '2026-09-30', observationId: 'DEMO-OBS-001', recipient: 'Facility operator' };
const notice = { id: 'notice', kind: 'notification', title: 'Notice receipt', reference: 'https://example.org/notice', date: '2026-09-04', synthetic: true, observationId: scope.observationId, recipient: scope.recipient } as Evidence;

test('scope validates real calendar dates and ordered bounds', () => {
  expect(AuditInput.safeParse({ sourceId: 'DEMO-001', claimType: 'source_detected', scope: { ...scope, startDate: '2026-02-30' } }).success).toBe(false);
  expect(AuditInput.safeParse({ sourceId: 'DEMO-001', claimType: 'source_detected', scope: { ...scope, startDate: '2026-10-01' } }).success).toBe(false);
});

test('scoped rules exclude undated, unrelated, wrong-recipient and out-of-period notices', () => {
  for (const override of [{ date: undefined }, { date: '2026-08-31' }, { observationId: 'another-event' }, { recipient: 'Other operator' }]) {
    expect(assess({ evidence: [{ ...notice, ...override }] }, 'operator_notified', scope).result).toBe('insufficient_evidence');
  }
  expect(assess({ evidence: [notice] }, 'operator_notified', scope).result).toBe('supported');
});

test('a contrary record for another or unknown recipient cannot contradict the named-recipient claim', () => {
  for (const recipient of ['Other operator', undefined]) {
    expect(assess({ evidence: [{ ...notice, kind: 'contradiction', claimType: 'operator_notified', recipient }] }, 'operator_notified', scope).result).toBe('insufficient_evidence');
  }
  expect(assess({ evidence: [{ ...notice, kind: 'contradiction', claimType: 'operator_notified' }] }, 'operator_notified', scope).result).toBe('contradicted');
});

test('scoped coverage excludes impossible calendar dates', () => {
  expect(assess({ evidence: [{ ...notice, date: '2026-02-30' }] }, 'operator_notified', { startDate: '2026-02-01', endDate: '2026-03-31', recipient: scope.recipient }).result).toBe('insufficient_evidence');
});

test('curated fallback keeps the same scoped persistence identity as the full snapshot', async () => {
  const input = { sourceId: 'KAZ_S_159', claimType: 'source_detected' as const, datasetSnapshotId: 'unep-mars-675417694883', scope: { startDate: '2024-06-01', endDate: '2024-12-31' } };
  const available = await resolveScopedSource(input, getIntelligenceSnapshot, findCaseBySourceId);
  const fallback = await resolveScopedSource(input, async () => { throw new Error('Unavailable'); }, findCaseBySourceId);
  expect(fallback.caseId).toBe(available.caseId);
});

test('mitigation coverage requires an action and dated follow-up reference inside the scope', () => {
  const evidence = { ...notice, kind: 'mitigation_confirmation', action: 'Valve replacement', followUpDate: '2026-09-10', followUpReference: 'https://example.org/follow-up' } as Evidence;
  expect(assess({ evidence: [evidence] }, 'mitigation_confirmed', scope).result).toBe('supported');
  for (const override of [{ action: undefined }, { followUpReference: undefined }, { followUpDate: '2026-09-03' }, { followUpDate: '2026-10-01' }]) {
    expect(assess({ evidence: [{ ...evidence, ...override }] }, 'mitigation_confirmed', scope).result).toBe('insufficient_evidence');
  }
});

test('scope is hashed while legacy assessments keep their prior shape', () => {
  const input = { sourceId: 'DEMO-001', claimType: 'source_detected' as const };
  expect(createAudit(DEMO_SOURCES[0], input).bundle).not.toHaveProperty('scope');
  expect(createAudit(DEMO_SOURCES[0], { ...input, scope }).bundle).toHaveProperty('scope', scope);
});

test('baseline can select an older pinned observation and keeps distinct scope histories', async () => {
  const snapshot = await getIntelligenceSnapshot();
  const row = snapshot.sources.find(item => item.observationIds.length >= 2)!;
  const date = row.observationTimestamps[0].slice(0, 10);
  const input = { sourceId: row.sourceId, claimType: 'source_detected', datasetSnapshotId: snapshot.datasetSnapshotId,
    scope: { startDate: date, endDate: date, observationId: row.observationIds[0] } };
  const api = createApp(new MemoryAuditStore());
  const post = (body: unknown) => api.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const response = await post(input);
  expect(response.status).toBe(201);
  const audit = await response.json();
  expect(audit.bundle.scope).toEqual(input.scope);
  expect(audit.evidenceIds).toEqual([row.observationIds[0]]);
  expect((await (await post(input)).json()).revision).toBe(2);
  const otherDate = row.observationTimestamps[1].slice(0, 10);
  const other = await (await post({ ...input, scope: { startDate: otherDate, endDate: otherDate, observationId: row.observationIds[1] } })).json();
  expect(other.revision).toBe(1);
  expect(other.caseId).not.toBe(audit.caseId);
  expect((await post({ ...input, scope: { ...input.scope, observationId: 'foreign-event' } })).status).toBe(422);
  expect((await post({ ...input, datasetSnapshotId: 'stale-snapshot' })).status).toBe(409);
});

test('a named-recipient scoped baseline does not expose user-entered scope through public history', async () => {
  const api = createApp(new MemoryAuditStore());
  const response = await api.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'operator_notified', scope: { startDate: '2024-06-01', endDate: '2024-12-31', recipient: 'PRIVATE recipient' } }) });
  expect(response.status).toBe(201);
  expect(response.headers.get('cache-control')).toContain('no-store');
  const audit = await response.json();
  expect((await api.request(`/api/audits/${audit.auditId}`)).status).toBe(404);
  expect((await (await api.request('/api/audits')).json()).audits).toHaveLength(0);
});
