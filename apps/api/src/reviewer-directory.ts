import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { ClaimType, type ReviewerAssurance } from '@methane/shared';

const identity = z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/);
const entry = z.object({
  reviewerId: identity, organization: z.string().trim().min(1).max(160), checkedBy: identity,
  checkedAt: z.iso.datetime({ offset: true }), expiresAt: z.iso.datetime({ offset: true }),
  verificationReference: z.string().trim().min(1).max(500),
  claimTypes: z.array(ClaimType).min(1).max(3), disabled: z.boolean(),
}).strict().refine(value => value.reviewerId !== value.checkedBy && Date.parse(value.checkedAt) < Date.parse(value.expiresAt));
const directorySchema = z.object({ schemaVersion: z.literal(1), reviewers: z.array(entry).max(500) }).strict()
  .refine(value => new Set(value.reviewers.map(item => item.reviewerId)).size === value.reviewers.length);

export function reviewerAssurance(directory: unknown, reviewerId: string, claimType: ClaimType, now = new Date().toISOString()): ReviewerAssurance {
  const fallback: ReviewerAssurance = { status: 'unverified', assessedAt: now };
  const parsed = directorySchema.safeParse(directory);
  if (!parsed.success || !Number.isFinite(Date.parse(now))) return fallback;
  const found = parsed.data.reviewers.find(item => item.reviewerId === reviewerId);
  if (!found || Date.parse(found.checkedAt) > Date.parse(now)) return fallback;
  return {
    status: found.disabled ? 'revoked' : Date.parse(found.expiresAt) <= Date.parse(now) ? 'expired'
      : !found.claimTypes.includes(claimType) ? 'outside_authority' : 'operator_attested',
    assessedAt: now, organization: found.organization, checkedBy: found.checkedBy,
    checkedAt: found.checkedAt, expiresAt: found.expiresAt, verificationReference: found.verificationReference,
  };
}

/** Read afresh for each operation so directory revocation is not cached. Never return file contents in errors. */
export async function loadReviewerAssurance(reviewerId: string, claimType: ClaimType): Promise<ReviewerAssurance> {
  try {
    const path = process.env.REVIEWER_DIRECTORY_PATH;
    if (!path) return reviewerAssurance(undefined, reviewerId, claimType);
    const file = Bun.file(path);
    if (file.size > 131_072) throw new Error('Directory exceeds bounds');
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (!directorySchema.safeParse(value).success) throw new Error('Invalid directory');
    return reviewerAssurance(value, reviewerId, claimType);
  } catch { return { status: 'directory_unavailable', assessedAt: new Date().toISOString() }; }
}
