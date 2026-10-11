import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { DEMO_SOURCES } from '@methane/shared';
import { assess } from './audit';
import { app } from './app';

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
  test('rejects malformed inputs', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'magic' }) });
    expect(res.status).toBe(400);
  });
  test('creates an explicitly unanchored synthetic audit', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'mitigation_confirmed' }) });
    expect(res.status).toBe(201);
    const result = await res.json();
    expect(result.result).toBe('insufficient_evidence');
    expect(result.synthetic).toBe(true);
    expect(result.anchored).toBe(false);
    expect(result.bundleHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect('0x' + createHash('sha256').update(JSON.stringify(result.bundle)).digest('hex')).toBe(result.bundleHash);
  });
  test('anchoring requires a secret even when no chain configured', async () => {
    const res = await app.request('/api/audits/unknown/anchor', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

