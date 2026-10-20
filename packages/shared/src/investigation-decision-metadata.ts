import { z } from 'zod';

// Bounded metadata for the private decision history endpoint. Kept as a
// subpath so opening the dashboard does not eagerly load dossier validators.
const Address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const Digest = z.string().regex(/^0x[a-f0-9]{64}$/);
const ChainId = z.union([z.literal(31337), z.literal(11155111)]);

const DecisionSummary = z.object({
  digest: Digest,
  revision: z.number().int().min(1).max(100),
  workRevision: z.number().int().min(1).max(100),
  reviewerId: z.string().min(3).max(96),
  reviewedAt: z.iso.datetime(),
  disposition: z.enum(['accept_assessment', 'request_more_evidence', 'reject_assessment']),
  receipt: z.object({ txHash: Digest, chainId: ChainId }).passthrough().nullable(),
}).strict();

export const DecisionHistoryResponse = z.object({
  decisions: z.array(DecisionSummary).max(100),
  target: z.object({
    chainId: ChainId,
    registryAddress: Address,
    issuer: Address.nullable(),
    writeEnabled: z.boolean(),
  }).passthrough().nullable(),
}).strict();

export type DecisionSummary = z.infer<typeof DecisionSummary>;
export type DecisionTarget = NonNullable<z.infer<typeof DecisionHistoryResponse>['target']>;
