import type { SharedWorkContext } from '@methane/shared';
import { PlanJournal, verifyPlanJournal } from '@methane/shared/plan-journal';
import type { InvestigationPlanLink } from '@methane/shared/investigation-links';
import { InvestigationChangeCheckData } from '@methane/shared/investigation-change';
export type { InvestigationChangeCheck } from '@methane/shared/investigation-change';

export async function acceptedInvestigationPlanLink(raw: unknown, context: SharedWorkContext): Promise<InvestigationPlanLink> {
  const journal = PlanJournal.parse(raw), revision = journal.revisions.at(-1)!;
  if (!await verifyPlanJournal(journal, revision.hash)) throw new Error('Plan history failed replay verification.');
  const report = journal.reports.find(r => r.digest === revision.reportDigest)!, dataset = report.input.dataset;
  if (revision.decision !== 'accept' || dataset.datasetSnapshotId !== context.datasetSnapshotId || dataset.synthetic !== context.synthetic || dataset.archiveSha256 !== context.archiveSha256
    || !report.portfolios.find(p => p.strategy === revision.strategy)?.selectedIds.includes(context.sourceId)) throw new Error('The latest plan decision must accept an allocation containing this exact source and dataset.');
  return { planId: journal.planId, revision: revision.revision, revisionHash: revision.hash, reportDigest: revision.reportDigest, strategy: revision.strategy };
}
export function acceptInvestigationChangeCheck(raw: unknown, context: SharedWorkContext, revision: number) {
  const value = InvestigationChangeCheckData.parse(raw);
  if (value.sourceId !== context.sourceId || value.datasetSnapshotId !== context.datasetSnapshotId || value.afterSnapshotId !== context.datasetSnapshotId || value.workRevision !== revision) throw new Error('Investigation changed while checking. Load the latest saved revision.');
  return value;
}
