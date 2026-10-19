// DEMO-only fixtures. No signer or external network is used by route unit tests.
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileAuditStore } from './store';
import type { PreparedAnchor, AnchorOutcome } from './chain';
export const demoReceipt = { chainId: 11155111 as const, registryAddress: `0x${'1'.repeat(40)}` as const,
  issuer: `0x${'2'.repeat(40)}` as const, txHash: `0x${'3'.repeat(64)}` as const, version: 1, blockNumber: '123' };
export function demoPrepared(auditId: string): PreparedAnchor {
  return { serializedTransaction: '0x01', draft: { chainId: demoReceipt.chainId, registryAddress: demoReceipt.registryAddress, issuer: demoReceipt.issuer, txHash: demoReceipt.txHash, operationId: crypto.randomUUID(), auditId, nonce: 0,
    expectedVersion: 1, confirmations: 1 } };
}
export async function demoStore() { return new FileAuditStore(join(await mkdtemp(join(tmpdir(), 'methane-chain-route-')), 'audits.json')); }
export const demoChain = {
  chainConfigured: () => true, chainWriteConfigured: () => true,
  readReceipt: async () => ({ issuer: demoReceipt.issuer, hash: `0x${'0'.repeat(64)}` as const, version: 0n, updatedAt: 0n }),
  prepareAnchor: async (auditId: string) => demoPrepared(auditId),
  broadcastAnchor: async () => {},
  inspectAnchorIntent: async (): Promise<AnchorOutcome> => ({ status: 'confirmed', receipt: demoReceipt }),
};
export async function demoReviewedAudit(store: FileAuditStore) {
  const { createDocumentAudit, createReviewedAudit, DocumentAssessmentInput } = await import('./ai-review');
  const input = DocumentAssessmentInput.parse({ sourceId: 'DEMO-001', claimType: 'source_detected', claimText: 'DEMO private claim only.', consentToExternalProcessing: true,
    documents: [{ id: 'DEMO-doc', title: 'DEMO confidential excerpt', text: 'DEMO source observation requires independent verification. No real source inspection or physical methane mitigation is asserted by this fixture.', rightsDeclared: 'explicit_permission' }] });
  const parent = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision => createDocumentAudit(input, { sourceId: 'DEMO-001', synthetic: true },
    { verdict: 'insufficient_evidence', reason: 'DEMO private reasoning.', citations: [] }, revision, { caseId: 'DEMO-001', externalEvidence: [] }));
  return store.create('DEMO-001', 'DEMO-001', 'source_detected', revision => createReviewedAudit(parent, revision, 'DEMO-reviewer', { status: 'needs_more_evidence', note: 'DEMO additional observation is required.' }), parent.auditId);
}
