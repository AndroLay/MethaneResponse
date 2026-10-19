import { z } from 'zod';
import type { AuditResult } from '@methane/shared';
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
export const AnchorDraft = z.object({
  operationId: z.string().uuid(), auditId: z.string().min(1), chainId: z.union([z.literal(11155111), z.literal(31337)]),
  registryAddress: address, issuer: address, txHash: hash, nonce: z.number().int().nonnegative().safe(),
  expectedVersion: z.number().int().positive().safe(), confirmations: z.number().int().min(1).max(64),
}).strict();
export type AnchorDraft = z.infer<typeof AnchorDraft>;
export const AnchorIntent = AnchorDraft.extend({ caseId: z.string().min(1), claimType: z.string().min(1), bundleHash: hash,
  state: z.enum(['pending', 'confirmed', 'reverted']), createdAt: z.string().datetime() }).strict();
export type AnchorIntent = z.infer<typeof AnchorIntent>;
export function receiptMatchesIntent(audit: AuditResult, intent: AnchorIntent) {
  const r = audit.receipt;
  return Boolean(r && audit.anchored && audit.auditId === intent.auditId && audit.bundleHash === intent.bundleHash
    && audit.chainTxHash === intent.txHash && r.txHash === intent.txHash && r.chainId === intent.chainId
    && r.registryAddress.toLowerCase() === intent.registryAddress.toLowerCase()
    && r.issuer.toLowerCase() === intent.issuer.toLowerCase() && r.version === intent.expectedVersion);
}
