import { CaseWorkDraft, SharedCaseWork, SharedWorkContext, type ClaimType } from '@methane/shared';
import { z } from 'zod';
import { evidenceEventsAppendOnly } from '@methane/shared/evidence-lifecycle';
import { canonicalJson } from './canonical';

export class CaseWorkError extends Error {
  constructor(readonly code: 'conflict' | 'capacity' | 'unavailable') { super(code); }
}
export const CaseWorkState = z.object({ schemaVersion: z.literal(1), histories: z.array(z.array(SharedCaseWork).min(1).max(100)).max(500) }).strict().superRefine((state, context) => {
  const keys = new Set<string>();
  for (const history of state.histories) {
    const first = history[0];
    const key = workKey(first.context, first.workId);
    if (keys.has(key)) context.addIssue({ code: 'custom', message: 'Duplicate work identity' });
    keys.add(key);
    for (const [index, item] of history.entries()) {
      if (!evidenceEventsAppendOnly(history[index - 1]?.requestEvents, item.requestEvents)) context.addIssue({ code: 'custom', message: 'Invalid evidence lifecycle' });
      if (item.revision !== index + 1 || workKey(item.context, item.workId) !== key || item.ownerId !== first.ownerId || item.createdAt !== first.createdAt
        || item.claimType !== first.claimType || canonicalJson(item.scope || null) !== canonicalJson(first.scope || null)) {
        context.addIssue({ code: 'custom', message: 'Invalid work history' });
      }
    }
  }
});
export type CaseWorkState = z.infer<typeof CaseWorkState>;
export function workKey(context: SharedWorkContext, workId: string) { return canonicalJson({ context, workId }); }
export function matchesWorkContext(left: SharedWorkContext, right: Omit<SharedWorkContext, 'sourceId'> & { sourceId?: string }) {
  return (!right.sourceId || left.sourceId === right.sourceId) && left.synthetic === right.synthetic
    && left.datasetSnapshotId === right.datasetSnapshotId && left.archiveSha256 === right.archiveSha256;
}
export interface CaseWorkStore {
  list(context: Omit<SharedWorkContext, 'sourceId'> & { sourceId?: string }, claims: ReadonlySet<ClaimType>): Promise<SharedCaseWork[]>;
  history(context: SharedWorkContext, workId: string): Promise<SharedCaseWork[]>;
  save(context: SharedWorkContext, workId: string, draft: CaseWorkDraft, expectedRevision: number, actor: string, authorize?: () => Promise<void>): Promise<SharedCaseWork>;
  status(): Promise<{ backend: 'memory' | 'file'; persistent: boolean; ready: boolean }>;
}
export class MemoryCaseWorkStore implements CaseWorkStore {
  private state: CaseWorkState = { schemaVersion: 1, histories: [] };
  private queue: Promise<unknown> = Promise.resolve();
  protected async readState(): Promise<CaseWorkState> { return structuredClone(this.state); }
  protected async writeState(state: CaseWorkState) { this.state = structuredClone(state); }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
  async list(context: Omit<SharedWorkContext, 'sourceId'> & { sourceId?: string }, claims: ReadonlySet<ClaimType>) {
    return (await this.readState()).histories.map(items => items[items.length - 1])
      .filter(item => matchesWorkContext(item.context, context) && claims.has(item.claimType))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.workId.localeCompare(b.workId));
  }
  async history(context: SharedWorkContext, workId: string) {
    return (await this.readState()).histories.find(items => workKey(items[0].context, items[0].workId) === workKey(context, workId)) || [];
  }
  async save(context: SharedWorkContext, workId: string, draft: CaseWorkDraft, expectedRevision: number, actor: string, authorize?: () => Promise<void>) {
    return this.serialize(async () => {
      const state = await this.readState();
      let history = state.histories.find(items => workKey(items[0].context, items[0].workId) === workKey(context, workId));
      const previous = history?.[history.length - 1];
      if ((previous?.revision || 0) !== expectedRevision || (previous && (previous.claimType !== draft.claimType || canonicalJson(previous.scope || null) !== canonicalJson(draft.scope || null)))) throw new CaseWorkError('conflict');
      if (!evidenceEventsAppendOnly(previous?.requestEvents, draft.requestEvents)) throw new CaseWorkError('conflict');
      if ((!history && state.histories.length >= 500) || (history && history.length >= 100)) throw new CaseWorkError('capacity');
      const now = new Date().toISOString();
      const work = SharedCaseWork.parse({ ...draft, context, workId, revision: expectedRevision + 1, ownerId: previous?.ownerId || actor, updatedBy: actor, createdAt: previous?.createdAt || now, updatedAt: now });
      if (!history) { history = []; state.histories.push(history); }
      history.push(work);
      await authorize?.();
      await this.writeState(state);
      return structuredClone(work);
    });
  }
  async status(): Promise<{ backend: 'memory' | 'file'; persistent: boolean; ready: boolean }> { return { backend: 'memory', persistent: false, ready: true }; }
}
