import { z } from 'zod';
import { InvestigationDecision, verifyInvestigationDecision } from '@methane/shared/investigation-decision';
import { SharedWorkContext } from '@methane/shared';
import { AnchorDraft } from './anchor-intent';
import { canonicalJson } from './canonical';
const Hash = z.string().regex(/^0x[a-fA-F0-9]{64}$/), Address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const DecisionReceipt = z.object({ chainId: z.union([z.literal(31337),z.literal(11155111)]), registryAddress: Address, txHash: Hash, issuer: Address, version: z.number().int().positive().safe(), blockNumber: z.string().regex(/^\d{1,19}$/), blockHash: Hash.optional(), confirmations: z.number().int().min(1).max(64).optional() }).strict();
export const DecisionRecord = z.object({ decision: InvestigationDecision, receipt: DecisionReceipt.optional() }).strict();
export type DecisionRecord = z.infer<typeof DecisionRecord>;
export const DecisionAnchorIntent = AnchorDraft.extend({ registryKey: Hash, bundleHash: Hash, state: z.enum(['pending','confirmed','reverted']), createdAt: z.iso.datetime() }).strict();
export type DecisionAnchorIntent = z.infer<typeof DecisionAnchorIntent>;
export class DecisionStateError extends Error { constructor(readonly code:'conflict'|'capacity'|'authority') { super(code); } }
export type DecisionRepository = {
  listInvestigationDecisions(context: SharedWorkContext, workId: string): Promise<DecisionRecord[]>;
  saveInvestigationDecision(decision: InvestigationDecision, expected: string | null, authorize: () => Promise<boolean>): Promise<void>;
  reserveDecisionAnchor(decisionDigest: string, registryKey: string, draft: AnchorDraft, authorize: () => Promise<boolean>): Promise<boolean>;
  getDecisionAnchorIntent(digest: string): Promise<DecisionAnchorIntent | undefined>;
  finishDecisionAnchor(digest: string, outcome: { status: 'reverted' } | { status: 'confirmed'; receipt: z.infer<typeof DecisionReceipt> }): Promise<void>;
};
export function sameInvestigation(left: InvestigationDecision, context: SharedWorkContext, workId: string) { return left.dossier.workId === workId && canonicalJson(left.dossier.context) === canonicalJson(context); }
export async function validateDecisionAppend(records: DecisionRecord[], decision: InvestigationDecision, expected: string | null, authorize: () => Promise<boolean>) {
  const previous = records.filter(r => sameInvestigation(r.decision, decision.dossier.context, decision.dossier.workId)).at(-1)?.decision;
  if (records.length >= 100) throw new DecisionStateError('capacity');
  if (decision.revision !== (previous?.revision || 0) + 1 || decision.previousDigest !== (previous?.digest || null) || expected !== (previous?.digest || null)) throw new DecisionStateError('conflict');
  if (!await verifyInvestigationDecision(decision, decision.digest)) throw new Error('Decision integrity failed');
  if (!await authorize()) throw new DecisionStateError('authority');
}
export function decisionStateValid(records: DecisionRecord[], intents: DecisionAnchorIntent[]) {
  const heads = new Map<string,string>();
  for (const r of records) {
    const key = canonicalJson([r.decision.dossier.context,r.decision.dossier.workId]);
    if (r.decision.previousDigest !== (heads.get(key) || null)) throw new Error('Invalid decision history');
    heads.set(key, r.decision.digest);
    if (r.receipt && !intents.some(i => i.bundleHash === r.decision.digest && i.state === 'confirmed' && matchesDecisionReceipt(i, r.receipt!))) throw new Error('Decision receipt has no confirmed intent');
  }
  if (new Set(records.map(r => r.decision.digest)).size !== records.length || new Set(intents.map(i => i.operationId)).size !== intents.length) throw new Error('Duplicate decision state');
  for (const i of intents) if (!records.some(r => r.decision.digest === i.bundleHash)) throw new Error('Orphan decision intent');
}
export function matchesDecisionReceipt(intent: DecisionAnchorIntent, receipt: z.infer<typeof DecisionReceipt>) {
  return receipt.txHash.toLowerCase() === intent.txHash.toLowerCase() && receipt.chainId === intent.chainId && receipt.registryAddress.toLowerCase() === intent.registryAddress.toLowerCase()
    && receipt.issuer.toLowerCase() === intent.issuer.toLowerCase() && receipt.version === intent.expectedVersion;
}
