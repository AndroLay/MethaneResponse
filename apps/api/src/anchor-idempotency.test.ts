import { expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { createAudit } from './audit';
import { DEMO_SOURCES } from '@methane/shared';

const token = 'admin-'.padEnd(48, 'x');
class ReservingStore extends MemoryAuditStore {
  private pending = new Set<string>();
  async reserveAnchor(audit: import('@methane/shared').AuditResult) {
    const key = `${audit.caseId}:${audit.claimType}`;
    if (this.pending.has(key)) return false;
    this.pending.add(key);
    return true;
  }
  async completeAnchor(audit: import('@methane/shared').AuditResult) { await this.replace(audit); }
}

test('preflight prevents duplicate Sepolia anchoring when an identical bundle is already on chain', async () => {
  const old = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = token;
  try {
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let anchorCalls = 0;
    const app = createApp(store, undefined, {
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => ({ issuer: '0x0000000000000000000000000000000000000001', hash: audit.bundleHash, version: 1n, updatedAt: 0n }),
      anchorReceipt: async () => { anchorCalls++; throw new Error('Should not be called'); },
    });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(409);
    expect(anchorCalls).toBe(0);
    expect((await store.get(audit.auditId))?.anchored).toBe(false);
  } finally {
    if (old === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = old;
  }
});

test('concurrent anchor requests share one in-flight guard', async () => {
  const old = process.env.ADMIN_API_TOKEN;
  process.env.ADMIN_API_TOKEN = token;
  try {
    const store = new ReservingStore();
    const audit = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
      createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    let calls = 0;
    let release!: () => void;
    let signalEntered!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; });
    const entered = new Promise<void>(resolve => { signalEntered = resolve; });
    const app = createApp(store, undefined, {
      chainConfigured: () => true,
      chainWriteConfigured: () => true,
      readReceipt: async () => ({ issuer: '0x0000000000000000000000000000000000000001', hash: `0x${'0'.repeat(64)}` as `0x${string}`, version: 0n, updatedAt: 0n }),
      anchorReceipt: async () => {
        calls++;
        signalEntered();
        await wait;
        return { chainId: 11155111, registryAddress: '0x0000000000000000000000000000000000000001',
          txHash: `0x${'3'.repeat(64)}` as `0x${string}`, issuer: '0x0000000000000000000000000000000000000002', version: 1, blockNumber: '123' };
      },
    });
    const request = () => app.request(`/api/audits/${audit.auditId}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    const first = request();
    await entered;
    const second = await request();
    expect(second.status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(calls).toBe(1);
  } finally {
    if (old === undefined) delete process.env.ADMIN_API_TOKEN; else process.env.ADMIN_API_TOKEN = old;
  }
});
