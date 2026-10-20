import { InvestigationPortfolio, plannerCanonical, verifyInvestigationPortfolio, type PlannerParameters } from '@methane/shared/investigation-planner';

export type PlannerContext = { datasetSnapshotId: string; inputFileSha256: string; archiveSha256: string; parameters: PlannerParameters };
export async function acceptInvestigationPortfolio(raw: unknown, context: PlannerContext) {
  const report = InvestigationPortfolio.parse(raw);
  const dataset = report.input.dataset;
  const normalized = { ...context.parameters, countries: [...new Set(context.parameters.countries)].sort(), sectors: [...new Set(context.parameters.sectors)].sort() };
  if (dataset.synthetic || dataset.datasetSnapshotId !== context.datasetSnapshotId || dataset.inputFileSha256 !== context.inputFileSha256
    || dataset.archiveSha256 !== context.archiveSha256 || plannerCanonical(report.input.parameters) !== plannerCanonical(normalized)) throw new Error('Plan belongs to different constraints or dataset. Run it again.');
  if (!await verifyInvestigationPortfolio(report)) throw new Error('Plan checksum or policy replay failed. Run it again.');
  return report;
}
export const dispositionLabels = {
  selected: 'Selected within capacity and country quota', outside_country_scope: 'Outside country scope', outside_sector_scope: 'Outside sector scope',
  no_linked_observations: 'No linked observations to rank', country_quota_filled: 'Country quota filled by earlier selections', capacity_filled: 'Capacity filled by earlier selections', unknown_source: 'Source not in this catalog',
} as const;
export function downloadPlannerReplay(report: InvestigationPortfolio) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'methane-investigation-plan.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
