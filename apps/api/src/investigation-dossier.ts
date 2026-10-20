import type { CaseWorkDraft, SharedWorkContext } from '@methane/shared';
import { investigationMaterialsValid, type InvestigationMaterials } from '@methane/shared/investigation-dossier';
import type { SnapshotTransition } from '@methane/shared/snapshot-transition';
import type { MemoryPlanStore } from './plan-store';
import type { AuditStore } from './store';
import { auditIntegrityValid } from './integrity';

export class InvestigationLinkError extends Error { constructor() { super('Investigation links do not match an accepted plan revision, source, claim scope or pinned change report.'); } }
export class InvestigationExportLimitError extends Error { constructor() { super('This investigation exceeds the 16 MiB export limit. Existing revisions are retained.'); } }
export const MAX_INVESTIGATION_BYTES = 16 * 1024 * 1024;
/** Count UTF-8 JSON incrementally before cloning, hashing or replaying the collected export. */
export class InvestigationExportBudget {
  private bytes = 0;
  constructor(private readonly limit = MAX_INVESTIGATION_BYTES - 65_536) {}
  consume(value: unknown, depth = 0): void {
    if (depth > 40) throw new InvestigationExportLimitError();
    const add = (bytes: number) => { this.bytes += bytes; if (this.bytes > this.limit) throw new InvestigationExportLimitError(); };
    if (Array.isArray(value)) {
      add(2 + Math.max(0, value.length - 1));
      for (const item of value) this.consume(item ?? null, depth + 1);
    } else if (value !== null && typeof value === 'object') {
      add(2); let first = true;
      for (const key of Object.keys(value)) {
        const item = (value as Record<string,unknown>)[key]; if (item === undefined) continue;
        add(Buffer.byteLength(JSON.stringify(key)) + 1 + (first ? 0 : 1)); first = false; this.consume(item, depth + 1);
      }
    } else { const text = JSON.stringify(value); if (text === undefined) throw new InvestigationExportLimitError(); add(Buffer.byteLength(text)); }
  }
}
type Resources = { planStore: MemoryPlanStore; auditStore: AuditStore; transition: () => Promise<SnapshotTransition> };
/** Load by server-owned IDs only; no caller-supplied reports, file paths or remote URLs. */
export async function loadInvestigationMaterials(context: SharedWorkContext, drafts: CaseWorkDraft[], resources: Resources, budget = new InvestigationExportBudget()): Promise<InvestigationMaterials> {
  budget.consume(drafts);
  const plans: InvestigationMaterials['plans'] = [], assessments: InvestigationMaterials['assessments'] = [];
  for (const id of new Set(drafts.flatMap(d => d.planLink ? [d.planLink.planId] : []))) {
    const plan = await resources.planStore.get(id, value => budget.consume(value)); if (!plan) throw new InvestigationLinkError(); plans.push(plan);
  }
  for (const id of new Set(drafts.flatMap(d => d.assessmentLink ? [d.assessmentLink.auditId] : []))) {
    const audit = await resources.auditStore.get(id);
    if (!audit) throw new InvestigationLinkError();
    budget.consume(audit.bundle);
    if (!auditIntegrityValid(audit)) throw new InvestigationLinkError();
    assessments.push({ bundleHash: audit.bundleHash, bundle: audit.bundle as unknown as Record<string,unknown> });
  }
  const changeDigests = new Set(drafts.flatMap(d => d.changeReportDigest ? [d.changeReportDigest] : []));
  const transitions = changeDigests.size ? [await resources.transition()] : [];
  budget.consume(transitions);
  if (changeDigests.size > 1 || changeDigests.size && !changeDigests.has(transitions[0].digest)) throw new InvestigationLinkError();
  const materials = { plans, assessments, transitions };
  if (!await investigationMaterialsValid(context, drafts, materials)) throw new InvestigationLinkError();
  return materials;
}
