import { describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';

const app = createApp(new MemoryAuditStore(), undefined, {}, {
  publicBaselinePreview: true,
  auditRateLimit: { limit: 6, windowMs: 60_000, maxEntries: 32 },
});

async function createAudit(sourceId: string, claimType: string, extra: Record<string, unknown> = {}) {
  return app.request('/api/audits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sourceId, claimType, ...extra }),
  });
}

describe('public preview API mode', () => {
  test('allows historical audits for curated cases but never private or uncurated writes', async () => {
    const detection = await createAudit('KAZ_S_159', 'source_detected');
    expect(detection.status).toBe(201);
    const detectionAudit = await detection.json();
    expect(detectionAudit.sourceId).toBe('KAZ_S_159');
    expect(detectionAudit.bundle.provenance.snapshotId).toBeTruthy();

    const mitigation = await createAudit('LBY_S_143', 'mitigation_confirmed');
    expect(mitigation.status).toBe(201);
    expect((await mitigation.json()).result).toBe('insufficient_evidence');

    expect((await createAudit('AFG_S_001', 'source_detected')).status).toBe(403);
    expect((await createAudit('CAN_S_002', 'operator_notified')).status).toBe(403);
    expect((await createAudit('CAN_S_002', 'mitigation_confirmed', { scope: {
      startDate: '2026-04-10', endDate: '2026-10-14', recipient: 'private operator',
    } })).status).toBe(403);
  });

  test('health declares temporary preview state and unknown API paths never become the SPA', async () => {
    const health = await app.request('/api/health');
    expect(health.status).toBe(200);
    const payload = await health.json();
    expect(payload.preview).toEqual({
      enabled: true,
      auditState: 'ephemeral',
      publicBaselineSources: ['KAZ_S_159', 'LBY_S_143', 'CAN_S_002'],
    });
    expect((await app.request('/api/not-a-route')).status).toBe(404);
  });
});
