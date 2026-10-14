import { expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { createAudit } from './audit';
import { DEMO_SOURCES, type AuditResult } from '@methane/shared';

// Models a durable, shared reservation; PostgreSQL independently enforces its
// transaction-wide lock and pending unique index in postgres-store.test.ts.
class ReservingStore extends MemoryAuditStore {
  private pending = new Set<string>();
  async reserveAnchor(audit: AuditResult) {
    const key = `${audit.caseId}:${audit.claimType}`;
    if (this.pending.has(key)) return false;
    this.pending.add(key);
    return true;
  }
  async completeAnchor(audit: AuditResult) { await this.replace(audit); }
}
const admin = 'admin-'.padEnd(48, 'x');
const receipt = {
  chainId: 11155111 as const,
  registryAddress: '0x0000000000000000000000000000000000000001' as const,
  txHash: `0x${'1'.repeat(64)}` as `0x${string}`,
  issuer: '0x0000000000000000000000000000000000000002' as const,
  version: 1,
  blockNumber: '123',
};
const zeroReceipt = { issuer: receipt.issuer, hash: `0x${'0'.repeat(64)}` as `0x${string}`, version: 0n, updatedAt: 0n };

test('failed network send remains reserved and blocks a different API replica', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let sends = 0;
    const overrides = {
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => zeroReceipt,
      anchorReceipt: async () => { sends++; throw new Error('RPC response lost; outcome unknown'); },
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
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    await store.reserveAnchor(audit);
    let valid = false;
    const app = createApp(store, undefined, {
      chainConfigured: () => true,
      verifyAnchorTransaction: (async () => ({ valid, reason: valid ? 'anchor_event_matches' : 'anchor_event_mismatch' })) as unknown as typeof import('./chain').verifyAnchorTransaction,
    });
    const request = () => app.request(`/api/audits/${audit.auditId}/reconcile`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}`, 'content-type': 'application/json' }, body: JSON.stringify(receipt),
    });
    expect((await request()).status).toBe(422);
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
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let readCalls = 0;
    const app = createApp(store, undefined, {
      chainConfigured: () => true, chainWriteConfigured: () => false,
      readReceipt: async () => { readCalls++; return zeroReceipt; },
    });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}` },
    });
    expect(response.status).toBe(503);
    expect(readCalls).toBe(0);
    expect(await store.reserveAnchor(audit)).toBe(true);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});

test('RPC chain mismatch fails during preflight before reserving an intent or broadcasting', async () => {
  const original = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = admin;
  try {
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let broadcasts = 0;
    const app = createApp(store, undefined, {
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => { throw new Error('RPC chain ID mismatch'); },
      anchorReceipt: async () => {
        broadcasts++;
        return { chainId: 11155111, registryAddress: receipt.registryAddress,
          txHash: receipt.txHash, issuer: receipt.issuer, version: 1, blockNumber: receipt.blockNumber };
      },
    });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${admin}` },
    });
    expect(response.status).toBe(503);
    expect(broadcasts).toBe(0);
    expect(await store.reserveAnchor(audit)).toBe(true);
  } finally { if (original === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = original; }
});
