import { expect, test } from 'bun:test';
import { createApp } from './app';
import { demoStore, demoPrepared, demoChain, demoReceipt } from './anchor-test-fixtures';
import { createAudit } from './audit';
import { DEMO_SOURCES } from '@methane/shared';

// Real durable file store with deterministic DEMO network outcomes.

const admin = 'admin-'.padEnd(48, 'x');
const receipt = demoReceipt;
const zeroReceipt = { issuer: receipt.issuer, hash: `0x${'0'.repeat(64)}` as `0x${string}`, version: 0n, updatedAt: 0n };

test('failed network send remains reserved and blocks a different API replica', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let sends = 0;
    const overrides = {
      ...demoChain,
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => zeroReceipt,
      broadcastAnchor: async () => { sends++; throw new Error('RPC response lost; outcome unknown'); },
    };
    const firstApp = createApp(store, undefined, overrides);
    const secondApp = createApp(store, undefined, overrides);
    const options = { method: 'POST', headers: { authorization: `Bearer ${admin}` } };
    const first = await firstApp.request(`/api/audits/${audit.auditId}/anchor`, options);
    const second = await secondApp.request(`/api/audits/${audit.auditId}/anchor`, options);
    expect(first.status).toBe(502);
    expect(second.status).toBe(409);
    expect(sends).toBe(1);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});

test('only an independently matching transaction event can reconcile an ambiguous anchor', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    await store.reserveAnchor(audit, demoPrepared(audit.auditId).draft);
    let valid = false;
    const app = createApp(store, undefined, {
      ...demoChain,
      chainConfigured: () => true,
      inspectAnchorIntent: async () => valid ? { status: 'confirmed', receipt } : { status: 'pending' },
    });
    const request = () => app.request(`/api/audits/${audit.auditId}/reconcile`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' }, body: JSON.stringify(receipt),
    });
    expect((await request()).status).toBe(202);
    expect((await store.get(audit.auditId))?.anchored).toBe(false);
    valid = true;
    expect((await request()).status).toBe(200);
    const persisted = await store.get(audit.auditId);
    expect(persisted?.receipt).toEqual(receipt);
    expect(persisted?.anchored).toBe(true);
    expect((await request()).status).toBe(200);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});


test('missing chain signer is rejected before creating a durable transaction intent', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let readCalls = 0;
    const app = createApp(store, undefined, {
      ...demoChain,
      chainConfigured: () => true, chainWriteConfigured: () => false,
      readReceipt: async () => { readCalls++; return zeroReceipt; },
    });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}` },
    });
    expect(response.status).toBe(503);
    expect(readCalls).toBe(0);
    expect(await store.reserveAnchor(audit, demoPrepared(audit.auditId).draft)).toBe(true);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});

test('RPC chain mismatch fails during preflight before reserving an intent or broadcasting', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let broadcasts = 0;
    const app = createApp(store, undefined, {
      ...demoChain,
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => { throw new Error('RPC chain ID mismatch'); },
      broadcastAnchor: async () => {
        broadcasts++;

      },
    });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}` },
    });
    expect(response.status).toBe(503);
    expect(broadcasts).toBe(0);
    expect(await store.reserveAnchor(audit, demoPrepared(audit.auditId).draft)).toBe(true);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});

test('restart recovers the exact transaction without rebroadcast and exposes only safe status metadata', async () => {
  const old = process.env.ADMIN_API_TOKEN; process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let sends = 0;
    const first = createApp(store, undefined, { ...demoChain, broadcastAnchor: async () => { sends++; throw Error('timeout'); } });
    const options = { method: 'POST', headers: { authorization: `Bearer ${admin}` } };
    expect((await first.request(`/api/audits/${audit.auditId}/anchor`, options)).status).toBe(502);
    const { FileAuditStore } = await import('./store');
    const restarted = createApp(new FileAuditStore(store.path), undefined, { ...demoChain, broadcastAnchor: async () => { sends++; } });
    expect((await restarted.request(`/api/audits/${audit.auditId}/anchor`, options)).status).toBe(409);
    expect((await restarted.request(`/api/audits/${audit.auditId}/anchor-status`)).status).toBe(401);
    const status = await restarted.request(`/api/audits/${audit.auditId}/anchor-status`, { headers: options.headers });
    expect(JSON.stringify(await status.json())).not.toContain('serializedTransaction');
    expect((await restarted.request(`/api/audits/${audit.auditId}/reconcile`, options)).status).toBe(200);
    expect((await new FileAuditStore(store.path).get(audit.auditId))?.anchored).toBe(true);
    expect(sends).toBe(1);
  } finally { if (old === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = old; }
});
test('a changed configured target is rejected before reserving or sending', async () => {
  const old = process.env.ADMIN_API_TOKEN; process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = await demoStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let sent = false;
    const app = createApp(store, undefined, { ...demoChain, broadcastAnchor: async () => { sent = true; } });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' },
      body: JSON.stringify({ chainId: 11155111, registryAddress: demoReceipt.registryAddress, issuer: `0x${'f'.repeat(40)}` }) });
    expect(response.status).toBe(409); expect(sent).toBe(false);
    expect(await store.getAnchorIntent(audit.auditId)).toBeUndefined();
  } finally { if (old === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = old; }
});
