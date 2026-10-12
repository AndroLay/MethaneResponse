import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { type AuditReceipt } from '@methane/shared';
import { createAudit } from './audit';
import { findCaseBySourceId } from './casebook';
import { createDocumentAudit, createReviewedAudit, DocumentAssessmentInput } from './ai-review';
import { auditIntegrityValid } from './integrity';
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

  test('accepts every evidence kind in the shared audit schema', async () => {
    const sql = postgres(databaseUrl!, { prepare: false });
    const suffix = randomUUID();
    const evidenceIds = [`META-${suffix}`, `EXCERPT-${suffix}`];
    try {
      await sql`INSERT INTO evidence (evidence_id, source_id, kind, claim_type, title)
        VALUES (${evidenceIds[0]}, 'KAZ_S_159', 'metadata_notification', 'operator_notified', 'Source-level notification metadata'),
               (${evidenceIds[1]}, 'KAZ_S_159', 'document_excerpt', 'mitigation_confirmed', 'Authorized excerpt citation')`;
      const rows = await sql`SELECT kind FROM evidence WHERE evidence_id = ${evidenceIds[0]} OR evidence_id = ${evidenceIds[1]} ORDER BY evidence_id`;
      expect(rows.map((row) => row.kind)).toEqual(['document_excerpt', 'metadata_notification']);
    } finally {
      await sql`DELETE FROM evidence WHERE evidence_id = ${evidenceIds[0]} OR evidence_id = ${evidenceIds[1]}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('persists document-review dispositions as immutable v3 revisions across store reconnects', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    expect(found).not.toBeNull();
    const sourceCase = found!.item;
    const caseId = `${sourceCase.caseId}-V3-TEST-${randomUUID()}`;
    const input = DocumentAssessmentInput.parse({
      sourceId: sourceCase.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{
        id: 'authorized-inspection',
        title: 'Authorized inspection excerpt',
        text: 'The operator recorded a completed valve repair. An independent follow-up measurement has not yet been performed to verify sustained methane mitigation.',
      }],
    });
    let reopened: PostgresAuditStore | undefined;
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const draft = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createDocumentAudit(
        input,
        found!.source,
        { verdict: 'supported', reason: 'The excerpt documents a reported repair, but not a verified physical outcome.', citations: [{ documentId: 'authorized-inspection', quote: 'The operator recorded a completed valve repair.' }] },
        revision,
        { caseId, externalEvidence: found!.item.externalEvidence, provenance: found!.book.provenance, observationIds: sourceCase.plumes.map((item) => item.plumeId) },
      ));
      const decision = { status: 'needs_more_evidence' as const, note: 'Request an independent post-repair methane observation.', sourceInspected: false, publishCitations: false };
      const reviewed = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createReviewedAudit(draft, revision, 'database-reviewer', decision));
      reopened = await PostgresAuditStore.connect(databaseUrl!);

      const revisions = (await reopened.list(sourceCase.sourceId, input.claimType)).filter((item) => item.caseId === caseId).sort((a, b) => a.revision - b.revision);
      expect(revisions.map((item) => item.revision)).toEqual([1, 2]);
      expect(revisions[0].bundle.intelligence?.reviewStatus).toBe('unreviewed');
      expect(revisions[1].bundle.intelligence?.reviewStatus).toBe('needs_more_evidence');
      expect(revisions[1].result).toBe('insufficient_evidence');
      expect(revisions[1].bundle.intelligence?.review?.parentBundleHash).toBe(draft.bundleHash);
      expect(auditIntegrityValid(revisions[0])).toBe(true);
      expect(auditIntegrityValid(revisions[1])).toBe(true);
      expect((await reopened.get(reviewed.auditId))?.bundleHash).toBe(reviewed.bundleHash);
    } finally {
      await reopened?.close();
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('registers a pinned non-curated source before atomically persisting its document audit', async () => {
    const suffix = randomUUID();
    const sourceId = `MARS_TEST_${suffix}`;
    const caseId = `mars:unep-mars-test:${sourceId}`;
    const provenance = {
      provider: 'UNEP IMEO', dataset: 'Pinned MARS test snapshot',
      catalogUrl: 'https://methanedata.unep.org/download-dataset', downloadUrl: 'https://example.org/mars.zip',
      retrievedAt: '2026-10-12T10:20:45+00:00', archiveSha256: 'a'.repeat(64), snapshotId: 'unep-mars-test',
      license: 'CC BY-NC-SA 4.0', attribution: 'UNEP IMEO test snapshot',
    };
    const input = DocumentAssessmentInput.parse({
      sourceId, claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
      documents: [{ id: 'inspection', title: 'Authorized inspection excerpt', text: 'The operator recorded a completed repair, but no later methane observation is available to assess sustained mitigation.' }],
    });
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const audit = await store.create(caseId, sourceId, input.claimType, (revision) => createDocumentAudit(
        input, { sourceId, synthetic: false },
        { verdict: 'insufficient_evidence', reason: 'No later methane observation supports an outcome claim.', citations: [{ documentId: 'inspection', quote: 'The operator recorded a completed repair' }] },
        revision, { caseId, provenance, externalEvidence: [], observationIds: ['original-plume-id'] },
      ));
      const [source] = await sql`SELECT case_id, synthetic, source_license, raw_sha256 FROM sources WHERE source_id = ${sourceId}`;
      expect(source).toMatchObject({ case_id: caseId, synthetic: false, source_license: provenance.license, raw_sha256: provenance.archiveSha256 });
      expect((await store.get(audit.auditId))?.bundleHash).toBe(audit.bundleHash);
    } finally {
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql`DELETE FROM sources WHERE source_id = ${sourceId}`;
      await sql.end({ timeout: 2 });
    }
  });
});
