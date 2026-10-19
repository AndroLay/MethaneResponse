import { CaseWorkDraft, HumanAssessmentDraft, CaseSessionDraft, type AuditResult } from '@methane/shared';
export const humanDraftSchema = HumanAssessmentDraft;
export const caseDraftSchema = CaseSessionDraft;
export type DraftSchema<T> = { safeParse: (value: unknown) => { success: true; data: T } | { success: false } };

const prefix = 'methane-session-draft-v1:';
function key(kind: string, context: string) { return `${prefix}${kind}:${encodeURIComponent(context)}`; }
export function readSessionDraft<T>(kind: string, context: string, schema: DraftSchema<T>, storage?: Storage): T | null {
  try { const value = (storage || globalThis.sessionStorage).getItem(key(kind, context)); if (!value) return null; const parsed = schema.safeParse(JSON.parse(value)); return parsed.success ? parsed.data : null; } catch { return null; }
}
export function writeSessionDraft<T>(kind: string, context: string, schema: DraftSchema<T>, value: unknown, storage?: Storage): boolean {
  try { const parsed = schema.safeParse(value); if (!parsed.success) return false; (storage || globalThis.sessionStorage).setItem(key(kind, context), JSON.stringify(parsed.data)); return true; } catch { return false; }
}
export function clearSessionDraft(kind: string, context: string, storage?: Storage) { try { (storage || globalThis.sessionStorage).removeItem(key(kind, context)); } catch { /* No durable save is implied. */ } }
export function clearHumanDrafts() {
  try { const storage = globalThis.sessionStorage; const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)); keys.filter(k => k?.startsWith(`${prefix}human:`)).forEach(k => storage.removeItem(k!)); } catch { /* Storage can be blocked. */ }
}
export function appendAssessmentRequest(draft: CaseWorkDraft, audit: AuditResult, context?: { sourceId: string; synthetic: boolean; datasetSnapshotId?: string; archiveSha256?: string }): CaseWorkDraft | null {
  if (context && (audit.sourceId !== context.sourceId || audit.synthetic !== context.synthetic || (!context.synthetic && (!context.datasetSnapshotId || !context.archiveSha256 || audit.bundle.provenance?.snapshotId !== context.datasetSnapshotId || audit.bundle.provenance?.archiveSha256 !== context.archiveSha256)))) return null;
  const request = audit.bundle.humanAssessment?.nextEvidenceRequest?.trim();
  if (!request || draft.claimType !== audit.claimType || JSON.stringify(draft.scope) !== JSON.stringify(audit.bundle.scope)) return null;
  const evidenceRequest = draft.evidenceRequest.split('\n\n').includes(request) ? draft.evidenceRequest : [draft.evidenceRequest, request].filter(Boolean).join('\n\n');
  const parsed = CaseWorkDraft.safeParse({ ...draft, evidenceRequest, assessmentLink: { auditId: audit.auditId, bundleHash: audit.bundleHash } });
  return parsed.success ? parsed.data : null;
}
