import { CaseWorkDraft as Draft, CaseWorkRecord as Record } from '@methane/shared';
export type { CaseWorkDraft } from '@methane/shared';

export type CaseWorkContext = { sourceId: string; datasetSnapshotId?: string; archiveSha256?: string; synthetic: boolean; workId?: string };
export const CASE_WORK_CHANGED = 'methane-case-work-changed';
export const workStatusLabels = { investigate: 'Investigate', awaiting_evidence: 'Awaiting evidence', deferred: 'Deferred', review_recorded: 'Review recorded' } as const;
export type CaseWork = Record & { workId: string };

function namespace(context: CaseWorkContext, version = 2) {
  return `methane-case-work-v${version}:${encodeURIComponent(JSON.stringify([context.synthetic, context.datasetSnapshotId || null, context.archiveSha256 || null]))}:`;
}
function key(context: CaseWorkContext) { return namespace(context) + encodeURIComponent(context.sourceId) + ':' + encodeURIComponent(context.workId || 'default'); }
function browserStorage(storage?: Storage) { return storage || globalThis.localStorage; }
function parseStored(raw: string | null): CaseWork | null {
  if (!raw) return null;
  const result = Record.safeParse(JSON.parse(raw));
  return result.success && (result.data.version === 1 || result.data.workId) ? { ...result.data, workId: result.data.workId || 'default' } : null;
}
/** v1 is read through without deleting the original. A v2 save supersedes that item. */
export function listCaseWork(context: CaseWorkContext, storage?: Storage): CaseWork[] {
  try {
    const target = browserStorage(storage);
    const result = new Map<string, CaseWork>();
    for (const version of [1, 2]) {
      const prefix = namespace(context, version);
      for (let index = 0; index < target.length; index++) {
        const entryKey = target.key(index);
        if (!entryKey?.startsWith(prefix)) continue;
        try {
          const record = parseStored(target.getItem(entryKey));
          if (!record || record.version !== version) continue;
          const expected = version === 1 ? namespace(record, 1) + encodeURIComponent(record.sourceId) : key(record);
          if (expected === entryKey) result.set(`${record.sourceId}:${record.workId}`, record);
        } catch { /* A damaged record must not hide other investigations. */ }
      }
    }
    return [...result.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.workId.localeCompare(b.workId));
  } catch { return []; }
}
export function readCaseWork(context: CaseWorkContext, storage?: Storage): CaseWork | null {
  const records = listCaseWork(context, storage).filter(item => item.sourceId === context.sourceId);
  return (context.workId ? records.find(item => item.workId === context.workId) : records.find(item => item.workId === 'default') || records[0]) || null;
}
export function saveCaseWork(context: CaseWorkContext, draft: unknown, expectedRevision: number, storage?: Storage): { ok: true; record: CaseWork } | { ok: false; reason: 'invalid' | 'unavailable' | 'conflict' } {
  const parsed = Draft.safeParse(draft);
  if (!parsed.success || !context.sourceId || (!context.synthetic && (!context.datasetSnapshotId || !context.archiveSha256)) || (context.workId && context.workId.length > 128)) return { ok: false, reason: 'invalid' };
  try {
    const target = browserStorage(storage);
    const workId = context.workId || 'default';
    const previous = readCaseWork({ ...context, workId }, target);
    if ((previous?.revision || 0) !== expectedRevision) return { ok: false, reason: 'conflict' };
    // Explicit context allowlist: callers cannot accidentally persist transient credentials.
    const record: CaseWork = { ...parsed.data, sourceId: context.sourceId, datasetSnapshotId: context.datasetSnapshotId, archiveSha256: context.archiveSha256,
      synthetic: context.synthetic, workId, version: 2, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
    target.setItem(key(record), JSON.stringify(record));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CASE_WORK_CHANGED));
    return { ok: true, record };
  } catch { return { ok: false, reason: 'unavailable' }; }
}
