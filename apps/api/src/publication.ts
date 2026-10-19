import { z } from 'zod';
import { PublicationChange, transparencySummaryPayload, type AuditResult, type PublicationState, type WithdrawalReason } from '@methane/shared';

export const PublicationEvent = PublicationChange.extend({
  version: z.number().int().positive(), auditId: z.string().uuid(), actorId: z.string().min(1).max(128),
  origin: z.enum(['explicit_action', 'legacy_consent']).optional(),
}).strict();
export type PublicationEvent = z.infer<typeof PublicationEvent>;
export type PublicationSnapshot = { audits: AuditResult[]; events: PublicationEvent[] };
export class PublicationError extends Error {
  constructor(readonly status: 403 | 404 | 409, message: string) { super(message); }
}

/** Project legacy consent once; persist this provenance on the next normal mutation. */
export function migrateLegacyPublications(audits: AuditResult[]): PublicationEvent[] {
  const eligible = audits.filter(audit => transparencySummaryPayload(audit));
  const events: PublicationEvent[] = [];
  for (const audit of eligible) {
    events.push({ auditId: audit.auditId, version: 1, status: 'published', reason: 'publication_consent',
      actorId: 'legacy-consent-migration', changedAt: audit.generatedAt, origin: 'legacy_consent' });
    const next = eligible.filter(item => item.caseId === audit.caseId && item.claimType === audit.claimType && item.revision > audit.revision)
      .sort((a, b) => a.revision - b.revision)[0];
    if (next) events.push({ auditId: audit.auditId, version: 2, status: 'superseded', reason: 'revised_assessment',
      actorId: 'legacy-consent-migration', changedAt: next.generatedAt, replacementAuditId: next.auditId, origin: 'legacy_consent' });
  }
  return validatePublicationEvents(events, audits);
}

export function validatePublicationEvents(value: unknown, audits: AuditResult[]): PublicationEvent[] {
  const events = z.array(PublicationEvent).max(100_000).parse(value);
  const versions = new Map<string, number>();
  const previous = new Map<string, PublicationEvent>();
  const byId = new Map(audits.map(audit => [audit.auditId, audit]));
  for (const event of events) {
    const audit = byId.get(event.auditId);
    const prior = previous.get(event.auditId);
    const replacement = event.replacementAuditId ? byId.get(event.replacementAuditId) : undefined;
    if (!audit || !transparencySummaryPayload(audit) || event.version !== (versions.get(event.auditId) || 0) + 1
      || (!prior && event.status !== 'published')
      || prior?.status === 'withdrawn' || (event.status === 'published' && Boolean(prior))
      || (event.status === 'published' && event.reason !== 'publication_consent')
      || (event.status === 'published' && event.replacementAuditId !== undefined)
      || (event.status === 'superseded' && prior?.status !== 'published')
      || (event.status === 'superseded' && (event.reason !== 'revised_assessment' || !replacement))
      || (event.status === 'withdrawn' && !['consent_withdrawn', 'published_in_error', 'evidence_under_review'].includes(event.reason))
      || (replacement && (!transparencySummaryPayload(replacement) || replacement.caseId !== audit.caseId || replacement.claimType !== audit.claimType || replacement.revision <= audit.revision))
      || (prior?.replacementAuditId && prior.replacementAuditId !== event.replacementAuditId)) throw new Error('Invalid publication event history');
    versions.set(event.auditId, event.version); previous.set(event.auditId, event);
  }
  const latest = new Map<string, AuditResult>();
  for (const audit of audits.filter(item => transparencySummaryPayload(item))) {
    if (!previous.has(audit.auditId)) throw new Error('Publication history is incomplete');
    const key = JSON.stringify([audit.caseId, audit.claimType]);
    if (!latest.has(key) || latest.get(key)!.revision < audit.revision) latest.set(key, audit);
  }
  for (const [auditId, event] of previous) {
    const audit = byId.get(auditId)!;
    if (event.status === 'published' && latest.get(JSON.stringify([audit.caseId, audit.claimType]))?.auditId !== auditId) throw new Error('Multiple current publications');
  }
  return events;
}

export function publicationState(audit: AuditResult, events: PublicationEvent[]): PublicationState {
  const history = events.filter(event => event.auditId === audit.auditId).map(event => ({
      version: event.version, status: event.status, changedAt: event.changedAt, reason: event.reason,
      ...(event.replacementAuditId ? { replacementAuditId: event.replacementAuditId } : {}),
    }));
  if (!history.length) throw new Error('Publication history is missing');
  return { ...history[history.length - 1], history };
}

export function publicationEventsForCreate(audit: AuditResult, records: AuditResult[], events: PublicationEvent[], expectedParent?: string): PublicationEvent[] {
  if (!transparencySummaryPayload(audit)) return events;
  const prior = records.filter(item => item.caseId === audit.caseId && item.claimType === audit.claimType && transparencySummaryPayload(item));
  // A caller must have loaded the latest private assessment before changing an existing public stream.
  if (prior.length && !expectedParent) throw new PublicationError(409, 'Load the latest human assessment before publishing a correction');
  const actorId = audit.bundle.humanAssessment!.reviewerId;
  const changedAt = audit.generatedAt;
  const changes: PublicationEvent[] = prior.filter(item => publicationState(item, events).status === 'published').map(item => ({
    auditId: item.auditId, version: publicationState(item, events).version + 1, status: 'superseded',
    reason: 'revised_assessment', changedAt, actorId, replacementAuditId: audit.auditId,
  }));
  return [...events, ...changes, { auditId: audit.auditId, version: 1, status: 'published', reason: 'publication_consent', changedAt, actorId }];
}

export function withdrawalEvent(snapshot: PublicationSnapshot, auditId: string, expectedVersion: number, reason: WithdrawalReason, actorId: string): PublicationEvent {
  const audit = snapshot.audits.find(item => item.auditId === auditId);
  if (!audit || !transparencySummaryPayload(audit)) throw new PublicationError(404, 'Public summary not found');
  const state = publicationState(audit, snapshot.events);
  if (state.version !== expectedVersion || state.status === 'withdrawn') throw new PublicationError(409, 'Publication changed; refresh before another action');
  return PublicationEvent.parse({ auditId, version: state.version + 1, status: 'withdrawn', reason, actorId, changedAt: new Date().toISOString(),
    ...(state.replacementAuditId ? { replacementAuditId: state.replacementAuditId } : {}) });
}
