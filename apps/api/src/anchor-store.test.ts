import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from './audit';
import { FileAuditStore } from './store';

const hash = `0x${'1'.repeat(64)}` as const;
const address = `0x${'2'.repeat(40)}` as const;
const draft = (auditId: string) => ({ operationId: crypto.randomUUID(), auditId, chainId: 11155111 as const,
  registryAddress: address, issuer: address, txHash: hash, nonce: 0, expectedVersion: 1, confirmations: 1 });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'methane-anchor-'));
  const path = join(dir, 'audits.json');
  const store = new FileAuditStore(path);
  const create = () => store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
    createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
  return { dir, path, store, create };
}
test('signed transaction identity survives a restart before broadcast and blocks all competing revisions', async () => {
  const f = await fixture();
  try {
    const first = await f.create(), second = await f.create();
    expect(await f.store.reserveAnchor!(first, draft(first.auditId))).toBe(true);
    const reopened = new FileAuditStore(f.path);
    expect(await reopened.getAnchorIntent!(first.auditId)).toMatchObject({ txHash: hash, state: 'pending', auditId: first.auditId, bundleHash: first.bundleHash });
    expect(await reopened.reserveAnchor!(second, { ...draft(second.auditId), nonce: 1 })).toBe(false);
    expect((await reopened.get(first.auditId))?.anchored).toBe(false);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('completion atomically commits receipt and intent, rejects a fake receipt and preserves bundle bytes', async () => {
  const f = await fixture();
  try {
    const audit = await f.create();
    await f.store.reserveAnchor!(audit, draft(audit.auditId));
    const receipt = { chainId: 11155111, registryAddress: address, issuer: address, txHash: hash, version: 1, blockNumber: '123' };
    await expect(f.store.completeAnchor!({ ...audit, anchored: true, chainTxHash: hash, receipt: { ...receipt, issuer: `0x${'3'.repeat(40)}` } })).rejects.toThrow('intent');
    await f.store.completeAnchor!({ ...audit, anchored: true, chainTxHash: hash, receipt });
    const reopened = new FileAuditStore(f.path);
    expect((await reopened.get(audit.auditId))?.receipt).toEqual(receipt);
    expect((await reopened.get(audit.auditId))?.bundle).toEqual(audit.bundle);
    expect((await reopened.getAnchorIntent!(audit.auditId))?.state).toBe('confirmed');
    const persisted = JSON.parse(await readFile(f.path, 'utf8'));
    expect(persisted.audits[0].anchored).toBe(true);
    expect(persisted.anchorIntents[0].state).toBe('confirmed');
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('a missing initialized audit file fails closed after restart', async () => {
  const f = await fixture();
  try {
    await f.create(); await unlink(f.path);
    expect((await new FileAuditStore(f.path).status()).ready).toBe(false);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('legacy array migration preserves audit hashes and rejects concurrent reservation', async () => {
  const f = await fixture();
  try {
    const audit = await f.create();
    await writeFile(f.path, JSON.stringify([audit]), { mode: 0o600 });
    const reopened = new FileAuditStore(f.path);
    const outcomes = await Promise.all([reopened.reserveAnchor!(audit, draft(audit.auditId)), reopened.reserveAnchor!(audit, draft(audit.auditId))]);
    expect(outcomes.sort()).toEqual([false, true]);
    expect((await reopened.get(audit.auditId))?.bundleHash).toBe(audit.bundleHash);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('reverted attempts release the issuer only for a fresh nonce and completion cannot be forged', async () => {
  const f = await fixture();
  try {
    const audit = await f.create();
    await f.store.reserveAnchor(audit, draft(audit.auditId));
    await f.store.markAnchorReverted(audit.auditId);
    expect(await f.store.reserveAnchor(audit, draft(audit.auditId))).toBe(false);
    expect(await f.store.reserveAnchor(audit, { ...draft(audit.auditId), nonce: 1 })).toBe(true);
    expect((await f.store.getAnchorIntent(audit.auditId))?.state).toBe('pending');
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('corrupt initialization marker and audit state fail closed', async () => {
  const f = await fixture();
  try {
    await f.create();
    await writeFile(`${f.path}.initialized`, 'corrupt');
    expect((await new FileAuditStore(f.path).status()).ready).toBe(false);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
test('confirmed completion is idempotent and its receipt cannot be changed', async () => {
  const f = await fixture();
  try {
    const audit = await f.create(); await f.store.reserveAnchor(audit, draft(audit.auditId));
    const anchored = { ...audit, anchored: true, chainTxHash: hash, receipt: { chainId: 11155111, registryAddress: address, issuer: address, txHash: hash, version: 1, blockNumber: '123' } };
    await f.store.completeAnchor(anchored); await f.store.completeAnchor(anchored);
    await expect(f.store.completeAnchor({ ...anchored, receipt: { ...anchored.receipt, blockNumber: '999' } })).rejects.toThrow('immutable');
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
