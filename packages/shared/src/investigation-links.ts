import { z } from 'zod';

export const InvestigationDigest = z.string().regex(/^0x[a-f0-9]{64}$/);
/** Historical approval, bound to an exact immutable revision. Not a current mandate. */
export const InvestigationPlanLink = z.object({
  planId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), revision: z.number().int().min(1).max(100),
  revisionHash: InvestigationDigest, reportDigest: InvestigationDigest,
  strategy: z.enum(['weighted', 'flux', 'recurrence', 'breadth']),
}).strict();
export type InvestigationPlanLink = z.infer<typeof InvestigationPlanLink>;
