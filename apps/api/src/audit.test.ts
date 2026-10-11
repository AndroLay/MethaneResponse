import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { DEMO_SOURCES } from '@methane/shared';
import { assess } from './audit';
import { app, createApp } from './app';
import { canonicalJson } from './canonical';
import { MemoryAuditStore } from './store';

describe('conservative evidence baseline', () => {
  test('notification is not repair confirmation', () => {
    expect(assess(DEMO_SOURCES[0], 'mitigation_confirmed').result).toBe('insufficient_evidence');
    expect(assess(DEMO_SOURCES[0], 'operator_notified').result).toBe('supported');
  });
  test('synthetic explicit contrary record can yield contradiction', () => {
    expect(assess(DEMO_SOURCES[1], 'operator_notified').result).toBe('contradicted');
  });
  test('synthetic confirmation must be typed confirmation', () => {
    expect(assess(DEMO_SOURCES[1], 'mitigation_confirmed').result).toBe('supported');
  });
  test('no evidence means unknown not false', () => {
    const empty = { ...DEMO_SOURCES[0], evidence: [] };
    expect(assess(empty, 'source_detected').result).toBe('insufficient_evidence');
  });
});

describe('API contract', () => {
  test('health endpoint checks both durable storage status and pinned casebook availability', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const health = await res.json();
    expect(health.status).toBe('ok');
    expect(health.casebookReady).toBe(true);
    expect(health.storage.backend).toBe('memory');
  });

  test('serves the pinned non-synthetic MARS casebook separately from demo fixtures', async () => {
    const res = await app.request('/api/cases');
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.synthetic).toBe(false);
    expect(payload.cases.map((item: { sourceId: string }) => item.sourceId)).toEqual(['KAZ_S_159', 'LBY_S_143', 'ARG_S_055']);
    expect(payload.provenance.archiveSha256).toBe('b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742');
  });

  test('audits observed MARS detections with plume-level citations', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }) });
    expect(res.status).toBe(201);
    const audit = await res.json();
    expect(audit.result).toBe('supported');
    expect(audit.synthetic).toBe(false);
    expect(audit.bundle.citedEvidence.map((item: { id: string }) => item.id)).toContain('7529d451-018f-4da3-9114-59b76c3a3bcd');
    expect(audit.bundle.provenance.archiveSha256).toBe('b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742');
  });

  test('does not infer mitigation from notification, feedback, or a linked report title', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed' }) });
    expect(res.status).toBe(201);
    const audit = await res.json();
    expect(audit.result).toBe('insufficient_evidence');
    expect(audit.bundle.citedEvidence).toEqual([]);
    expect(audit.bundle.externalEvidence[0].contentIncluded).toBe(false);
    expect(audit.bundle.limitations).toContain('Linked report content is not included or independently reviewed.');
  });

  test('treats source-level notification as distinct from undated plume observations', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'operator_notified' }) });
    expect(res.status).toBe(201);
    const audit = await res.json();
    expect(audit.result).toBe('supported');
    expect(audit.bundle.citedEvidence).toHaveLength(1);
    expect(audit.bundle.citedEvidence[0].id).toBe('KAZ_S_159:notification-status');
    expect(audit.bundle.citedEvidence[0].date).toBeUndefined();
  });

  test('rejects malformed inputs', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'magic' }) });
    expect(res.status).toBe(400);
  });
  test('reports a casebook outage instead of disguising it as an unknown real source', async () => {
    const unavailable = async () => { throw new Error('casebook unavailable'); };
    const unavailableApp = createApp(new MemoryAuditStore(), {
      load: unavailable,
      list: unavailable,
      find: unavailable,
    });
    const response = await unavailableApp.request('/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('casebook is unavailable');
    const health = await unavailableApp.request('/api/health');
    expect(health.status).toBe(503);
    expect((await health.json()).casebookReady).toBe(false);
  });
  test('creates an explicitly unanchored synthetic audit', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'mitigation_confirmed' }) });
    expect(res.status).toBe(201);
    const result = await res.json();
    expect(result.result).toBe('insufficient_evidence');
    expect(result.synthetic).toBe(true);
    expect(result.anchored).toBe(false);
    expect(result.bundleHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect('0x' + createHash('sha256').update(canonicalJson(result.bundle)).digest('hex')).toBe(result.bundleHash);
  });

  test('lists immutable audit revisions for a source claim', async () => {
    const created = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'source_detected' }) });
    const audit = await created.json();
    const res = await app.request('/api/audits?sourceId=DEMO-001&claimType=source_detected');
    expect(res.status).toBe(200);
    const history = await res.json();
    expect(history.audits.some((item: { auditId: string }) => item.auditId === audit.auditId)).toBe(true);
    expect(audit.revision).toBe(1);
    expect(audit.bundle.revision).toBe(1);
  });
  test('anchoring requires a secret even when no chain configured', async () => {
    const res = await app.request('/api/audits/unknown/anchor', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

