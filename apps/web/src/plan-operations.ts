import { InvestigationPortfolio, verifyInvestigationPortfolio, type PlannerStrategy } from '@methane/shared/investigation-planner';
import { PlanJournal, verifyPlanJournal } from '@methane/shared/plan-journal';
export async function acceptPlanArtifact(raw: unknown, expectedDigest: string): Promise<{ report: InvestigationPortfolio; strategy: PlannerStrategy; journal: PlanJournal | null }> {
  if (!/^0x[a-f0-9]{64}$/.test(expectedDigest)) throw new Error('Supply the expected SHA-256 digest from a separate trusted record.');
  const journal = PlanJournal.safeParse(raw);
  if (journal.success) {
    if (!await verifyPlanJournal(journal.data, expectedDigest)) throw new Error('Reviewer history verification failed.');
    const last = journal.data.revisions.at(-1)!;
    return { journal: journal.data, report: journal.data.reports.find(r => r.digest === last.reportDigest)!, strategy: last.strategy };
  }
  const report = InvestigationPortfolio.parse(raw);
  if (!await verifyInvestigationPortfolio(report, expectedDigest)) throw new Error('Plan checksum, expected digest or policy replay failed.');
  return { report, strategy: 'weighted', journal: null };
}
export function downloadPlanJournal(journal: PlanJournal) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(journal, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${journal.planId}-review-history.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
