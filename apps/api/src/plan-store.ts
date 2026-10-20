import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { z } from 'zod';
import { PlanJournal, appendPlanDecision, verifyPlanJournal, type PlanDecision } from '@methane/shared/plan-journal';
import type { InvestigationPortfolio } from '@methane/shared/investigation-planner';
import { atomicPrivateWrite } from './case-work-file';

const State = z.object({ schemaVersion: z.literal(1), journals: z.array(PlanJournal).max(20) }).strict();
type State = z.infer<typeof State>;
const MAX_BYTES = 32 * 1024 * 1024;
export class PlanStoreError extends Error { constructor(readonly code: 'conflict' | 'capacity' | 'unavailable') { super(code); } }
export class MemoryPlanStore {
  private state: State = { schemaVersion: 1, journals: [] };
  private queue: Promise<unknown> = Promise.resolve();
  protected async read(): Promise<State> { return structuredClone(this.state); }
  protected async write(state: State) { this.state = structuredClone(state); }
  async get(id: string, inspect?: (journal: PlanJournal) => void) {
    const item = (await this.read()).journals.find(j => j.planId === id);
    if (item) inspect?.(item);
    if (item && !await verifyPlanJournal(item, item.revisions.at(-1)!.hash)) throw new PlanStoreError('unavailable');
    return item || null;
  }
  async save(id: string, report: InvestigationPortfolio, decision: PlanDecision, expectedRevision: number, expectedHead: string | null, actor: string, authorize?: () => Promise<void>) {
    const operation = this.queue.then(async () => {
      const state = await this.read(), index = state.journals.findIndex(j => j.planId === id), previous = state.journals[index] || null;
      if ((index < 0 && state.journals.length >= 20) || previous && (previous.revisions.length >= 100 || !previous.reports.some(r => r.digest === report.digest) && previous.reports.length >= 20)) throw new PlanStoreError('capacity');
      const next = await appendPlanDecision(previous, id, report, decision, expectedRevision, expectedHead, actor);
      if (index < 0) state.journals.push(next); else state.journals[index] = next;
      if (Buffer.byteLength(JSON.stringify(state)) > MAX_BYTES) throw new PlanStoreError('capacity');
      await authorize?.(); await this.write(state); return structuredClone(next);
    });
    this.queue = operation.then(() => undefined, () => undefined); return operation;
  }
}
/** Existing API writer lock protects this companion state file; not multi-instance storage. */
export class FilePlanStore extends MemoryPlanStore {
  private observed = false;
  constructor(readonly path: string) { super(); }
  private async text(path: string, limit: number) {
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try { const stat = await handle.stat(); if (!stat.isFile() || stat.size > limit || (stat.mode & 0o077) !== 0) throw new PlanStoreError('unavailable');
      const text = await handle.readFile('utf8'); if (Buffer.byteLength(text) > limit) throw new PlanStoreError('unavailable'); return text;
    } finally { await handle.close(); }
  }
  protected override async read(): Promise<State> {
    let initialized = false;
    try { initialized = await this.text(this.path + '.initialized', 100) === 'methane-plans-v1\n'; if (!initialized) throw new PlanStoreError('unavailable'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new PlanStoreError('unavailable'); }
    try {
      const state = State.parse(JSON.parse(await this.text(this.path, MAX_BYTES)));
      if (new Set(state.journals.map(j => j.planId)).size !== state.journals.length) throw new PlanStoreError('unavailable');
      this.observed = true; return state;
    } catch (error) {
      if (!initialized && !this.observed && (error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, journals: [] };
      throw new PlanStoreError('unavailable');
    }
  }
  protected override async write(state: State) {
    await atomicPrivateWrite(this.path, JSON.stringify(State.parse(state)));
    await atomicPrivateWrite(this.path + '.initialized', 'methane-plans-v1\n');
  }
}
