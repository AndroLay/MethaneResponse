import { z } from 'zod';
import { MarsProvenance, evidenceUtcDay } from './index';

export const PLANNER_POLICY = 'investigation-allocation/1';
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Label = z.string().trim().min(1).max(160);
export const PlannerParameters = z.object({
  capacity: z.number().int().min(1).max(50), maxPerCountry: z.number().int().min(1).max(50),
  countries: z.array(Label).max(100), sectors: z.array(Label).max(50),
  recurrenceWeight: z.number().int().min(0).max(100),
}).strict();
export type PlannerParameters = z.infer<typeof PlannerParameters>;
export const PlannerRequest = z.object({ datasetSnapshotId: Label, inputFileSha256: Hash, parameters: PlannerParameters }).strict();
const Candidate = z.object({
  sourceId: z.string().min(1).max(128), country: Label.nullable(), sector: Label.nullable(),
  medianFluxKgHr: z.number().finite().nonnegative().nullable(), medianUncertaintyKgHr: z.number().finite().nonnegative().nullable(),
  distinctDates: z.number().int().nonnegative(), observationCount: z.number().int().nonnegative(),
  missingFluxCount: z.number().int().nonnegative(),
  lastObserved: z.string().refine(value => Boolean(evidenceUtcDay(value))).nullable(),
}).strict().superRefine((row, context) => {
  if (row.distinctDates > row.observationCount || row.missingFluxCount > row.observationCount
    || (row.observationCount > 0) !== (row.lastObserved !== null) || (row.observationCount > 0) !== (row.distinctDates > 0)
    || (row.medianFluxKgHr !== null) !== (row.observationCount > row.missingFluxCount)) context.addIssue({ code: 'custom', message: 'Inconsistent source observation summary' });
});
export type PlannerCandidate = z.infer<typeof Candidate>;
export const PlannerInput = z.object({
  dataset: z.object({ datasetSnapshotId: Label, inputFileSha256: Hash, archiveSha256: Hash, intelligenceSha256: Hash,
    synthetic: z.boolean(), provenance: MarsProvenance.nullable(), scope: z.enum(['full_snapshot', 'public_preview']),
    totalSourceCount: z.number().int().nonnegative().max(100_000), archiveStartDate: z.iso.date(), archiveEndDate: z.iso.date(),
  }).strict(),
  parameters: PlannerParameters, candidates: z.array(Candidate).max(10_000),
}).strict().superRefine((input, context) => {
  const d = input.dataset;
  if (new Set(input.candidates.map(row => row.sourceId)).size !== input.candidates.length) context.addIssue({ code: 'custom', message: 'Duplicate source IDs' });
  if (input.candidates.length > d.totalSourceCount || (d.scope === 'full_snapshot' && input.candidates.length !== d.totalSourceCount)
    || d.archiveStartDate > d.archiveEndDate) context.addIssue({ code: 'custom', message: 'Invalid catalog count or archive range' });
  if (!d.synthetic && (!d.provenance || d.provenance.snapshotId !== d.datasetSnapshotId || d.provenance.archiveSha256 !== d.archiveSha256)) context.addIssue({ code: 'custom', message: 'Real plans require matching publisher provenance' });
  if (input.candidates.some(row => row.lastObserved && (evidenceUtcDay(row.lastObserved)! < d.archiveStartDate || evidenceUtcDay(row.lastObserved)! > d.archiveEndDate))) context.addIssue({ code: 'custom', message: 'Source timestamp is outside the archive' });
});
export type PlannerInput = z.infer<typeof PlannerInput>;
export const plannerStrategies = ['weighted', 'flux', 'recurrence', 'breadth'] as const;
export type PlannerStrategy = typeof plannerStrategies[number];
export const plannerStrategyLabels: Record<PlannerStrategy, string> = {
  weighted: 'Weighted historical indicators', flux: 'Median flux first', recurrence: 'Observed recurrence first', breadth: 'Geographic / sector breadth',
};
const Portfolio = z.object({
  strategy: z.enum(plannerStrategies), selectedIds: z.array(z.string()).max(50), unfilledSlots: z.number().int().nonnegative(),
  countryCount: z.number().int().nonnegative(), sectorCount: z.number().int().nonnegative(), missingFluxSelected: z.number().int().nonnegative(),
  meanWeightedIndicatorScore: z.number().nullable(), medianSourceFluxKgHr: z.number().nullable(), medianObservedDates: z.number().nullable(),
  overlapWithWeighted: z.number().int().nonnegative(),
}).strict();
export const InvestigationPortfolio = z.object({
  schemaVersion: z.literal(1), policyVersion: z.literal(PLANNER_POLICY), input: PlannerInput,
  eligibleCount: z.number().int().nonnegative(), portfolios: z.array(Portfolio).length(4),
  sensitivity: z.array(z.object({ key: z.enum(['capacity_minus_one', 'capacity_plus_one', 'recurrence_minus_twenty', 'recurrence_plus_twenty', 'country_cap_plus_one']),
    parameters: PlannerParameters, selectedCount: z.number().int().nonnegative(), addedIds: z.array(z.string()).max(50), removedIds: z.array(z.string()).max(50),
  }).strict()).max(5), physicalBenefitEstimated: z.literal(false), limitations: z.array(z.string()), digest: z.string().regex(/^0x[a-f0-9]{64}$/),
}).strict();
export type InvestigationPortfolio = z.infer<typeof InvestigationPortfolio>;
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function plannerCanonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(plannerCanonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + plannerCanonical(object[key])).join(',') + '}';
}
async function digest(value: unknown) {
  return '0x' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plannerCanonical(value)))), byte => byte.toString(16).padStart(2, '0')).join('');
}
function eligible(row: PlannerCandidate, p: PlannerParameters) {
  return row.observationCount > 0 && (!p.countries.length || row.country !== null && p.countries.includes(row.country))
    && (!p.sectors.length || row.sector !== null && p.sectors.includes(row.sector));
}
/** Tied midranks within the SAME eligible pool; not a population percentile or probability. */
function percentiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b), result = new Map<number, number>();
  for (let first = 0; first < sorted.length;) {
    let end = first + 1;
    while (end < sorted.length && sorted[end] === sorted[first]) end++;
    result.set(sorted[first], sorted.length === 1 ? 100 : round(100 * (first + end - 1) / 2 / (sorted.length - 1)));
    first = end;
  }
  return result;
}
export function plannerScores(candidates: PlannerCandidate[], parameters: PlannerParameters) {
  const pool = candidates.filter(row => eligible(row, parameters));
  const flux = percentiles(pool.flatMap(row => row.medianFluxKgHr === null ? [] : [row.medianFluxKgHr]));
  const dates = percentiles(pool.map(row => row.distinctDates));
  return new Map(pool.map(row => {
    const magnitudePoints = row.medianFluxKgHr === null ? 0 : flux.get(row.medianFluxKgHr)!;
    const recurrencePoints = dates.get(row.distinctDates)!;
    return [row.sourceId, { magnitudePoints, recurrencePoints, score: round((magnitudePoints * (100 - parameters.recurrenceWeight) + recurrencePoints * parameters.recurrenceWeight) / 100) }];
  }));
}
function allocate(candidates: PlannerCandidate[], p: PlannerParameters, strategy: PlannerStrategy, scores: ReturnType<typeof plannerScores>) {
  const pool = candidates.filter(row => scores.has(row.sourceId));
  const ranked = [...pool].sort((a, b) => {
    if (strategy === 'flux') return (b.medianFluxKgHr ?? -1) - (a.medianFluxKgHr ?? -1) || order(a.sourceId, b.sourceId);
    if (strategy === 'recurrence') return b.distinctDates - a.distinctDates || order(a.sourceId, b.sourceId);
    return scores.get(b.sourceId)!.score - scores.get(a.sourceId)!.score || order(a.sourceId, b.sourceId);
  });
  const selected: PlannerCandidate[] = [], countries = new Map<string | null, number>(), sectors = new Set<string>();
  const used = new Set<string>();
  while (selected.length < p.capacity) {
    let next: PlannerCandidate | undefined, bestNovelty = -1;
    for (const row of ranked) {
      if (used.has(row.sourceId) || (countries.get(row.country) || 0) >= p.maxPerCountry) continue;
      // Breadth has an explicit greedy marginal objective: one point per new KNOWN country/sector.
      const novelty = (row.country !== null && !countries.has(row.country) ? 1 : 0) + (row.sector !== null && !sectors.has(row.sector) ? 1 : 0);
      if (strategy !== 'breadth') { next = row; break; }
      if (novelty > bestNovelty) { next = row; bestNovelty = novelty; }
    }
    if (!next) break;
    selected.push(next); used.add(next.sourceId); countries.set(next.country, (countries.get(next.country) || 0) + 1);
    if (next.sector !== null) sectors.add(next.sector);
  }
  return { strategy, selectedIds: selected.map(row => row.sourceId), unfilledSlots: p.capacity - selected.length,
    countryCount: [...countries.keys()].filter(country => country !== null).length, sectorCount: sectors.size,
    missingFluxSelected: selected.filter(row => row.medianFluxKgHr === null).length,
    medianSourceFluxKgHr: median(selected.flatMap(row => row.medianFluxKgHr === null ? [] : [row.medianFluxKgHr])),
    medianObservedDates: median(selected.map(row => row.distinctDates)),
    meanWeightedIndicatorScore: selected.length ? round(selected.reduce((sum, row) => sum + scores.get(row.sourceId)!.score, 0) / selected.length) : null,
    overlapWithWeighted: 0 };
}
export async function buildInvestigationPortfolio(raw: unknown): Promise<InvestigationPortfolio> {
  const parsed = PlannerInput.parse(raw);
  const input = { ...parsed, parameters: { ...parsed.parameters, countries: [...new Set(parsed.parameters.countries)].sort(order), sectors: [...new Set(parsed.parameters.sectors)].sort(order) }, candidates: [...parsed.candidates].sort((a, b) => order(a.sourceId, b.sourceId)) };
  const p = input.parameters, scores = plannerScores(input.candidates, p);
  const portfolios = plannerStrategies.map(strategy => allocate(input.candidates, p, strategy, scores));
  const weighted = new Set(portfolios[0].selectedIds);
  for (const portfolio of portfolios) portfolio.overlapWithWeighted = portfolio.selectedIds.filter(id => weighted.has(id)).length;
  const variants = [
    ['capacity_minus_one', { ...p, capacity: Math.max(1, p.capacity - 1) }], ['capacity_plus_one', { ...p, capacity: Math.min(50, p.capacity + 1) }],
    ['recurrence_minus_twenty', { ...p, recurrenceWeight: Math.max(0, p.recurrenceWeight - 20) }], ['recurrence_plus_twenty', { ...p, recurrenceWeight: Math.min(100, p.recurrenceWeight + 20) }],
    ['country_cap_plus_one', { ...p, maxPerCountry: Math.min(50, p.maxPerCountry + 1) }],
  ] as const;
  const sensitivity = variants.filter(([, parameters]) => plannerCanonical(parameters) !== plannerCanonical(p)).map(([key, parameters]) => {
    const selected = allocate(input.candidates, parameters, 'weighted', plannerScores(input.candidates, parameters)).selectedIds;
    return { key, parameters, selectedCount: selected.length, addedIds: selected.filter(id => !weighted.has(id)), removedIds: portfolios[0].selectedIds.filter(id => !selected.includes(id)) };
  });
  const payload: Omit<InvestigationPortfolio, 'digest'> = { schemaVersion: 1, policyVersion: PLANNER_POLICY, input, eligibleCount: scores.size, portfolios, sensitivity,
    physicalBenefitEstimated: false as const, limitations: [
      'Analyst-defined allocation, not a validated estimate of repairs, avoided emissions, investigation value, cost or future leakage. One slot assumes one source investigation; actual effort differs.',
      'All strategies share the same linked-observation pool and hard quotas. Flux/recurrence baselines are application-defined, not the official UNEP Top 50 ranking. Breadth uses a greedy heuristic, not a guaranteed coverage optimum.',
      'Tied midrank percentiles are relative to the filtered pool. Missing flux gives no magnitude ranking points; it is not an observed zero. Reported standard deviations are retained, not converted into confidence intervals or benefit probabilities.',
      'Historical observations are discontinuous. Missing later records do not establish zero emissions; source feedback does not prove repair. No sums of discrete kg/h observations are interpreted as avoidable emissions.',
      'Distinct observation dates depend on sampling opportunities and satellite coverage. They are not standardized leakage frequencies or UNEP persistency. Median source flux summarizes selected source medians, not a combined emission rate.',
      'Sensitivity changes analyst assumptions on this same snapshot. It is not model validation or a scientific uncertainty interval. Unknown country is one quota bucket; unknown geography never increases coverage.',
      'Unsigned replay and checksum detect changes relative to a trusted digest, not authentic data origin or physical truth. Review evidence before publishing an authorized audit. No work has been assigned or message sent.',
    ] };
  return { ...payload, digest: await digest(payload) };
}
export async function verifyInvestigationPortfolio(raw: unknown, expectedDigest?: string) {
  const parsed = InvestigationPortfolio.safeParse(raw);
  if (!parsed.success || expectedDigest && parsed.data.digest !== expectedDigest) return false;
  const { digest: claimed, ...payload } = parsed.data;
  if (await digest(payload) !== claimed) return false;
  return plannerCanonical(await buildInvestigationPortfolio(parsed.data.input)) === plannerCanonical(parsed.data);
}
/** Every row, including an excluded row, has an inspectable deterministic disposition. */
export function plannerDisposition(report: InvestigationPortfolio, sourceId: string, strategy: PlannerStrategy) {
  const row = report.input.candidates.find(candidate => candidate.sourceId === sourceId);
  if (!row) return 'unknown_source';
  const p = report.input.parameters;
  if (p.countries.length && (row.country === null || !p.countries.includes(row.country))) return 'outside_country_scope';
  if (p.sectors.length && (row.sector === null || !p.sectors.includes(row.sector))) return 'outside_sector_scope';
  if (!row.observationCount) return 'no_linked_observations';
  const portfolio = report.portfolios.find(item => item.strategy === strategy)!;
  if (portfolio.selectedIds.includes(sourceId)) return 'selected';
  const countries = new Map(report.input.candidates.map(candidate => [candidate.sourceId, candidate.country]));
  if (portfolio.selectedIds.filter(id => countries.get(id) === row.country).length >= p.maxPerCountry) return 'country_quota_filled';
  return 'capacity_filled';
}

/** Summary differences are inspection prompts, never inferred repairs/new physical leaks. */
export async function compareInvestigationPortfolios(before: InvestigationPortfolio, after: InvestigationPortfolio, beforeStrategy: PlannerStrategy, afterStrategy: PlannerStrategy) {
  if (!plannerStrategies.includes(beforeStrategy) || !plannerStrategies.includes(afterStrategy)
    || !await verifyInvestigationPortfolio(before) || !await verifyInvestigationPortfolio(after)) throw new Error('Plan replay failed');
  const a = before.input.dataset, b = after.input.dataset;
  if (a.synthetic !== b.synthetic || a.scope !== b.scope
    || ['provider', 'dataset', 'catalogUrl', 'license'].some(field => a.provenance?.[field] !== b.provenance?.[field])) throw new Error('Incompatible dataset scope or publisher');
  const datasetChanged = a.datasetSnapshotId !== b.datasetSnapshotId;
  if (!datasetChanged && (a.archiveSha256 !== b.archiveSha256 || a.inputFileSha256 !== b.inputFileSha256
    || plannerCanonical(before.input.candidates) !== plannerCanonical(after.input.candidates))) throw new Error('Snapshot identity reused for inconsistent contents');
  if (datasetChanged && (a.archiveSha256 === b.archiveSha256 || a.inputFileSha256 === b.inputFileSha256)) throw new Error('New snapshot requires distinct archive and normalized input');
  const oldIds = before.portfolios.find(p => p.strategy === beforeStrategy)!.selectedIds;
  const newIds = after.portfolios.find(p => p.strategy === afterStrategy)!.selectedIds;
  const oldRows = new Map(before.input.candidates.map(row => [row.sourceId, row]));
  const newRows = new Map(after.input.candidates.map(row => [row.sourceId, row]));
  const fields = ['country', 'sector', 'medianFluxKgHr', 'medianUncertaintyKgHr', 'distinctDates', 'observationCount', 'missingFluxCount', 'lastObserved'] as const;
  const changes = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort().flatMap(sourceId => {
    const left = oldRows.get(sourceId), right = newRows.get(sourceId);
    const changedFields: string[] = !left ? ['source_added_to_catalog'] : !right ? ['source_missing_from_catalog'] : fields.filter(field => left[field] !== right[field]);
    return changedFields.length ? [{ sourceId, changedFields, previouslySelected: oldIds.includes(sourceId), currentlySelected: newIds.includes(sourceId), before: left || null, after: right || null }] : [];
  });
  return { datasetChanged, assumptionsChanged: beforeStrategy !== afterStrategy || plannerCanonical(before.input.parameters) !== plannerCanonical(after.input.parameters),
    beforeDigest: before.digest, afterDigest: after.digest,
    addedIds: newIds.filter(id => !oldIds.includes(id)), removedIds: oldIds.filter(id => !newIds.includes(id)), retainedIds: newIds.filter(id => oldIds.includes(id)),
    changedSourceCount: changes.length, reviewSources: changes.filter(row => row.previouslySelected || row.currentlySelected),
    physicalOutcomeEstablished: false as const,
    limitation: 'Summary changes may reflect added observations, corrections or changed metadata. Inspect the original records. Missing records do not establish zero emissions; feedback does not prove repair. No future-snapshot chronology is inferred.' };
}
