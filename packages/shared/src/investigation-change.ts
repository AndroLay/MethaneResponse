import { z } from 'zod';
import { InvestigationDigest } from './investigation-links';

// Small response contract used before the full dossier verifier is downloaded.
export const InvestigationChangeCheckData = z.object({ workRevision: z.number().int().positive(), sourceId: z.string(), datasetSnapshotId: z.string(), changeReportDigest: InvestigationDigest,
  beforeSnapshotId: z.string(), afterSnapshotId: z.string(), signal: z.object({ state: z.enum(['review_recommended','no_compared_changes']), metadataFields: z.array(z.string()).max(80), observationIds: z.array(z.string()).max(100_000), physicalOutcomeEstablished: z.literal(false) }).strict(),
}).strict();
export type InvestigationChangeCheck = z.infer<typeof InvestigationChangeCheckData>;
