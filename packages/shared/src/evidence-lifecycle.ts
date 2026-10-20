import { z } from 'zod';
import { isSecureEvidenceReference } from './evidence-policy';
const Id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
/** Preserve the precision actually stated by a document; month/year never becomes an invented day. */
export const ReportedEvidenceDate = z.union([
  z.object({ precision: z.literal('day'), value: z.iso.date() }).strict(),
  z.object({ precision: z.literal('month'), value: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict(),
  z.object({ precision: z.literal('year'), value: z.string().regex(/^\d{4}$/) }).strict(),
  z.object({ precision: z.literal('unknown') }).strict(),
]);
export const EvidenceRequestEvent = z.union([
  z.object({ type: z.literal('issued'), requestId: Id, requirement: z.string().trim().min(10).max(1000), acceptanceCriteria: z.string().trim().min(10).max(1000), recipientRole: z.enum(['operator','regulator','researcher','independent_reviewer']), dueDate: z.iso.date() }).strict(),
  z.object({ type: z.literal('response_received'), requestId: Id, responseId: Id, reference: z.string().max(2000).refine(isSecureEvidenceReference), locator: z.string().trim().min(1).max(300), sha256: z.string().regex(/^[a-f0-9]{64}$/), reportedDate: ReportedEvidenceDate, rights: z.enum(['owned','explicit_permission','open_license']) }).strict(),
  z.object({ type: z.literal('response_reviewed'), requestId: Id, responseId: Id, decision: z.enum(['accepted_for_assessment','rejected','more_evidence_required']), rationale: z.string().trim().min(10).max(1000) }).strict(),
]);
export type EvidenceRequestEvent = z.infer<typeof EvidenceRequestEvent>;
export function evidenceLifecycleValid(raw: unknown): boolean {
  const parsed = z.array(EvidenceRequestEvent).max(40).safeParse(raw); if (!parsed.success) return false;
  const requests = new Set<string>(), responses = new Map<string,string>(), reviewed = new Set<string>();
  for (const event of parsed.data) {
    if (event.type === 'issued') { if (requests.has(event.requestId)) return false; requests.add(event.requestId); }
    else if (event.type === 'response_received') { if (!requests.has(event.requestId) || responses.has(event.responseId)) return false; responses.set(event.responseId, event.requestId); }
    else { if (responses.get(event.responseId) !== event.requestId || reviewed.has(event.responseId)) return false; reviewed.add(event.responseId); }
  }
  return true;
}
export function evidenceEventsAppendOnly(before: EvidenceRequestEvent[] = [], after: EvidenceRequestEvent[] = []) {
  return after.length >= before.length && evidenceLifecycleValid(after) && before.every((event, i) => JSON.stringify(event) === JSON.stringify(after[i]));
}
