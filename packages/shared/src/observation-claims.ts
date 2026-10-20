import { z } from 'zod';
import { MarsProvenance, evidenceUtcDay } from './index';

export const OBSERVATION_CHECK_POLICY = 'mars-observation-claim/1';
export const ObservationQuery = z.object({
  kind: z.enum(['no_linked_detections', 'reported_flux_at_most', 'physical_mitigation']),
  startDate: z.iso.date(), endDate: z.iso.date(),
  thresholdKgHr: z.number().finite().min(0).max(1_000_000_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.startDate > value.endDate) context.addIssue({ code: 'custom', message: 'The period must be ordered.' });
  if ((value.kind === 'reported_flux_at_most') !== (value.thresholdKgHr !== undefined)) context.addIssue({ code: 'custom', message: 'Only a flux-threshold question requires a threshold in kg/h.' });
});
export type ObservationQuery = z.infer<typeof ObservationQuery>;
export const ObservationCheckRequest = z.object({
  sourceId: z.string().min(1).max(128), datasetSnapshotId: z.string().min(1).max(160),
  inputFileSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  query: ObservationQuery,
}).strict();
export const ArchiveObservation = z.object({
  id: z.string().min(1).max(128), sourceId: z.string().min(1).max(128), linkStatus: z.literal('linked'),
  date: z.string().min(10).max(64).refine(value => Boolean(evidenceUtcDay(value)), 'Invalid observation date'),
  fluxKgHr: z.number().finite().nonnegative().nullable(), uncertaintyKgHr: z.number().finite().nonnegative().nullable(),
  fluxUnit: z.literal('kg/h'), satellite: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90).optional(), lon: z.number().min(-180).max(180).optional(),
}).strict();
export type ArchiveObservation = z.infer<typeof ArchiveObservation>;
export const ObservationCheckInput = ObservationCheckRequest.extend({
  synthetic: z.boolean(), archiveSha256: z.string().regex(/^[a-f0-9]{64}$/), inputFileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  archiveStartDate: z.iso.date().default('0001-01-01'), archiveEndDate: z.iso.date(),
  provenance: MarsProvenance.optional(), sourceLimitations: z.array(z.string()).max(100),
  observations: z.array(ArchiveObservation).max(5000),
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  if (value.archiveStartDate > value.archiveEndDate) context.addIssue({ code: 'custom', message: 'Invalid archive date range' });
  for (const record of value.observations) {
    if (record.sourceId !== value.sourceId || ids.has(record.id)) context.addIssue({ code: 'custom', message: 'Source linkage or duplicate observation ID mismatch' });
    const day = evidenceUtcDay(record.date)!;
    if (day < value.archiveStartDate || day > value.archiveEndDate) context.addIssue({ code: 'custom', message: 'Observation lies outside the archive date range' });
    ids.add(record.id);
  }
  if (!value.synthetic && (!value.provenance || value.provenance.snapshotId !== value.datasetSnapshotId
    || value.provenance.archiveSha256 !== value.archiveSha256)) context.addIssue({ code: 'custom', message: 'Real observations require consistent pinned publisher provenance' });
});
const CheckStatus = z.enum(['counterexample_found', 'no_counterexample_in_archive', 'no_observations', 'incomplete_flux', 'incomplete_window', 'requires_document_review']);
const Trace = z.object({
  record: ArchiveObservation, utcDay: z.iso.date(),
  disposition: z.enum(['counterexample', 'within_threshold', 'missing_flux', 'outside_window', 'document_review']),
  uncertaintyRelation: z.enum(['not_applicable', 'unavailable', 'straddles_threshold', 'reported_band_above', 'reported_band_at_or_below']),
}).strict();
const Payload = z.object({
  schemaVersion: z.literal(1), policyVersion: z.literal(OBSERVATION_CHECK_POLICY), input: ObservationCheckInput,
  statement: z.string(), status: CheckStatus, explanation: z.string(),
  physicalMitigationEstablished: z.literal(false), counterexampleIds: z.array(z.string()).max(5000),
  summary: z.object({ total: z.number().int().nonnegative(), inWindow: z.number().int().nonnegative(), outsideWindow: z.number().int().nonnegative(),
    numericFlux: z.number().int().nonnegative(), missingFlux: z.number().int().nonnegative(), counterexamples: z.number().int().nonnegative() }).strict(),
  trace: z.array(Trace).max(5000),
  nextChecks: z.array(z.string()), limitations: z.array(z.string()),
}).strict();
export const ObservationCheck = Payload.extend({ digest: z.string().regex(/^0x[a-f0-9]{64}$/) }).strict();
export type ObservationCheck = z.infer<typeof ObservationCheck>;

export function observationCanonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(observationCanonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + observationCanonical(object[key])).join(',') + '}';
}
async function checksum(value: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(observationCanonical(value)));
  return '0x' + Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, '0')).join('');
}
export async function buildObservationCheck(raw: unknown): Promise<ObservationCheck> {
  const parsed = ObservationCheckInput.parse(raw);
  const input = { ...parsed, observations: [...parsed.observations].sort((a, b) => {
    const dayA = evidenceUtcDay(a.date)!, dayB = evidenceUtcDay(b.date)!;
    return dayA < dayB ? -1 : dayA > dayB ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }) };
  const query = input.query;
  const trace = input.observations.map(record => {
    const utcDay = evidenceUtcDay(record.date)!;
    let disposition: z.infer<typeof Trace>['disposition'];
    let uncertaintyRelation: z.infer<typeof Trace>['uncertaintyRelation'] = 'not_applicable';
    if (utcDay < query.startDate || utcDay > query.endDate) disposition = 'outside_window';
    else if (query.kind === 'physical_mitigation') disposition = 'document_review';
    else if (query.kind === 'no_linked_detections') disposition = 'counterexample';
    else if (record.fluxKgHr === null) disposition = 'missing_flux';
    else {
      disposition = record.fluxKgHr > query.thresholdKgHr! ? 'counterexample' : 'within_threshold';
      uncertaintyRelation = record.uncertaintyKgHr === null ? 'unavailable'
        : record.fluxKgHr - record.uncertaintyKgHr > query.thresholdKgHr! ? 'reported_band_above'
        : record.fluxKgHr + record.uncertaintyKgHr <= query.thresholdKgHr! ? 'reported_band_at_or_below' : 'straddles_threshold';
    }
    return { record, utcDay, disposition, uncertaintyRelation };
  });
  const included = trace.filter(item => item.disposition !== 'outside_window');
  const counterexampleIds = included.filter(item => item.disposition === 'counterexample').map(item => item.record.id);
  const missingFlux = included.filter(item => item.record.fluxKgHr === null).length;
  let status: z.infer<typeof CheckStatus>;
  if (query.kind === 'physical_mitigation') status = 'requires_document_review';
  else if (counterexampleIds.length) status = 'counterexample_found';
  else if (query.startDate < input.archiveStartDate || query.endDate > input.archiveEndDate) status = 'incomplete_window';
  else if (!included.length) status = 'no_observations';
  else if (missingFlux) status = 'incomplete_flux';
  else status = 'no_counterexample_in_archive';
  const statement = query.kind === 'no_linked_detections' ? 'The pinned archive contains no linked detection records for ' + input.sourceId
    : query.kind === 'reported_flux_at_most' ? 'Every reported point estimate for ' + input.sourceId + ' is at most ' + query.thresholdKgHr + ' kg/h'
    : 'Physical methane mitigation at ' + input.sourceId + ' succeeded';
  const explanations: Record<z.infer<typeof CheckStatus>, string> = {
    counterexample_found: counterexampleIds.length + ' exact archived record(s) contradict the defined archive-level statement. This does not establish whether equipment was repaired or identify the responsible operator.',
    no_counterexample_in_archive: 'No point-estimate counterexample was found among the included numeric records. This is a bounded archive result, not proof of continuous low emissions or physical repair.',
    no_observations: 'No linked detection records fall in this window. Observation opportunities and non-detections are unavailable; emissions and repair remain unknown.',
    incomplete_flux: 'Some included detection records lack reported flux. The universal numeric statement cannot be established from the available values.',
    incomplete_window: 'The requested period extends outside the observation-date range of this archive. A complete-window conclusion is unavailable.',
    requires_document_review: 'Satellite records, including their absence, cannot determine a physical repair outcome. Inspect attributable action records, facility identity, follow-up methods and observation opportunities.',
  };
  const payload: z.infer<typeof Payload> = {
    schemaVersion: 1, policyVersion: OBSERVATION_CHECK_POLICY, input,
    statement: statement + ' during ' + query.startDate + ' to ' + query.endDate + ' UTC (inclusive).',
    status, explanation: explanations[status], physicalMitigationEstablished: false, counterexampleIds,
    summary: { total: trace.length, inWindow: included.length, outsideWindow: trace.length - included.length,
      numericFlux: included.length - missingFlux, missingFlux, counterexamples: counterexampleIds.length },
    trace,
    nextChecks: [
      'Inspect the exact source ID, plume ID, UTC date, satellite and reported uncertainty against the publisher archive.',
      ...(counterexampleIds.length ? ['Ask whether the original statement concerns the same source location, time window, equipment and measurement definition as the witness records. Do not attribute dishonesty or failed repair automatically.'] : []),
      'Obtain dated action records and attributable follow-up measurements, including observation opportunities, detection limits, units and uncertainty.',
      'Record an authorized human determination separately; this exploratory check does not create or anchor an audit revision.',
    ],
    limitations: [
      'Analyst-defined scenario; not a statement attributed to an operator or publisher.',
      'Linked MARS records concern a source location, not necessarily the same equipment or responsible operator.',
      'The threshold checks reported point estimates. Estimate ± reported standard deviation is descriptive, not a calibrated confidence interval or an exceedance probability.',
      'Missing records are not zero emissions. Satellite detections are discrete and not continuous monitoring.',
      'Archive observation dates do not establish when a record became publicly available.',
      'An unsigned digest and policy replay do not establish authenticity or physical truth.',
    ],
  };
  return { ...payload, digest: await checksum(payload) };
}
export async function verifyObservationCheck(raw: unknown): Promise<boolean> {
  const parsed = ObservationCheck.safeParse(raw);
  if (!parsed.success) return false;
  const { digest, ...payload } = parsed.data;
  if (digest !== await checksum(payload)) return false;
  try { return observationCanonical(await buildObservationCheck(payload.input)) === observationCanonical(parsed.data); } catch { return false; }
}
