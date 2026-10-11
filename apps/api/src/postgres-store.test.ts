import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { type AuditReceipt } from '@methane/shared';
import { createAudit } from './audit';
import { findCaseBySourceId } from './casebook';
import { PostgresAuditStore } from './postgres-store';

const databaseUrl = process.env.TEST_DATABASE_URL;
const run = describe.skipIf(!databaseUrl);
let store: PostgresAuditStore;

run('PostgreSQL persistence integration', () => {
  beforeAll(async () => { store = await PostgresAuditStore.connect(databaseUrl!); });
  afterAll(async () => { await store?.close(); });

  test('applies migrations, seeds the real casebook, and keeps immutable audit revisions', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    expect(found).not.toBeNull();
    const caseId = `${found!.item.caseId}-TEST-${randomUUID()}`;
    const create = (revision: number) => createAudit(found!.source, { sourceId: found!.source.sourceId, claimType: 'source_detected' }, {
      caseId,
      revision,
      provenance: found!.book.provenance,
      externalEvidence: found!.item.externalEvidence,
    });
    const first = await store.create(caseId, found!.source.sourceId, 'source_detected', create);
    const second = await store.create(caseId, found!.source.sourceId, 'source_detected', create);
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect((await store.get(first.auditId))?.bundleHash).toBe(first.bundleHash);
    expect((await store.list(found!.source.sourceId, 'source_detected')).filter((item) => item.caseId === caseId)).toHaveLength(2);

    const receipt: AuditReceipt = {
      chainId: 11155111,
      registryAddress: '0x0000000000000000000000000000000000000001',
      txHash: `0x${'1'.repeat(64)}`,
      issuer: '0x0000000000000000000000000000000000000002',
      version: 1,
      blockNumber: '123',
    };
    await store.replace({ ...first, anchored: true, chainTxHash: receipt.txHash, receipt });
    expect((await store.get(first.auditId))?.receipt).toEqual(receipt);
    await expect(store.replace({ ...first, bundle: { ...first.bundle, reason: 'tampered' } })).rejects.toThrow('Audit bundles are immutable');
  });

  test('retains a plume observation with no source link instead of assigning a guessed source', async () => {
    const sql = postgres(databaseUrl!, { prepare: false });
    const plumeId = `UNLINKED-TEST-${randomUUID()}`;
    try {
      await sql`INSERT INTO observations (plume_id, source_id, observed_at, provenance)
        VALUES (${plumeId}, NULL, now(), ${sql.json({ linkStatus: 'source_id_missing' } as never)})`;
      const [row] = await sql`SELECT source_id FROM observations WHERE plume_id = ${plumeId}`;
      expect(row?.source_id).toBeNull();
    } finally {
      await sql`DELETE FROM observations WHERE plume_id = ${plumeId}`;
      await sql.end({ timeout: 2 });
    }
  });
});
