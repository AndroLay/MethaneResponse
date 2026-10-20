import { ObservationCheck, observationCanonical, verifyObservationCheck, type ObservationQuery } from '@methane/shared/observation-claims';

export type ObservationContext = { sourceId: string; synthetic: boolean; datasetSnapshotId?: string; archiveSha256?: string; inputFileSha256?: string; query: ObservationQuery };
export const observationStatusLabels = {
  counterexample_found: 'Exact record counterexample found', no_counterexample_in_archive: 'No counterexample in this archive',
  no_observations: 'No records in this period — outcome unknown', incomplete_flux: 'Missing flux — numeric check incomplete',
  incomplete_window: 'Period extends beyond the archive', requires_document_review: 'Physical outcome requires document review',
} as const;
export const uncertaintyLabels = {
  not_applicable: 'Not a numeric threshold check', unavailable: 'No standard deviation reported', straddles_threshold: 'Estimate ± reported SD straddles threshold',
  reported_band_above: 'Estimate ± reported SD above threshold', reported_band_at_or_below: 'Estimate ± reported SD at or below threshold',
} as const;
export async function acceptObservationCheck(value: unknown, context: ObservationContext): Promise<ObservationCheck> {
  const parsed = ObservationCheck.safeParse(value);
  if (!parsed.success) throw new Error('Invalid observation analysis. Reload the dataset and retry.');
  const report = parsed.data;
  if (report.input.sourceId !== context.sourceId || report.input.synthetic !== context.synthetic
    || report.input.datasetSnapshotId !== context.datasetSnapshotId || report.input.archiveSha256 !== context.archiveSha256 || report.input.inputFileSha256 !== context.inputFileSha256
    || observationCanonical(report.input.query) !== observationCanonical(context.query)) throw new Error('The analysis belongs to a different source, question or dataset. Run it again.');
  if (!await verifyObservationCheck(report)) throw new Error('The analysis checksum or policy replay does not match. Run it again.');
  return report;
}
function markdownValue(value: string) {
  return value.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_\[\]()#|~]/g, character => '\\' + character);
}
export function observationCheckMarkdown(report: ObservationCheck) {
  const input = report.input;
  return [
    '# Observation claim cross-check — investigation draft', '',
    ...(input.synthetic ? ['**SYNTHETIC DEMO — no real operator or repair is represented.**', ''] : []),
    'Analyst-defined scenario; no statement is attributed to an operator or publisher.', '', markdownValue(report.statement), '',
    'Result: ' + observationStatusLabels[report.status], markdownValue(report.explanation), '',
    'Dataset: ' + markdownValue(input.datasetSnapshotId), 'Archive SHA-256: ' + input.archiveSha256,
    'Normalized input SHA-256: ' + input.inputFileSha256, 'Policy: ' + report.policyVersion, 'Analysis digest: ' + report.digest, '',
    '## Exact counterexample records', '',
    ...report.trace.filter(item => item.disposition === 'counterexample').flatMap(item => [
      '- Plume ID: ' + markdownValue(item.record.id), '  Source ID: ' + markdownValue(item.record.sourceId),
      '  Original timestamp: ' + markdownValue(item.record.date) + ' (UTC day: ' + item.utcDay + ')',
      '  Reported point estimate: ' + (item.record.fluxKgHr ?? 'not reported') + ' kg/h; reported SD: ' + (item.record.uncertaintyKgHr ?? 'not reported') + ' kg/h',
      '  Satellite: ' + markdownValue(item.record.satellite || 'not reported'),
      '  Coordinates: ' + (item.record.lat === undefined || item.record.lon === undefined ? 'not reported' : item.record.lat + ', ' + item.record.lon),
      '  ' + uncertaintyLabels[item.uncertaintyRelation], '',
    ]),
    ...(report.counterexampleIds.length ? [] : ['No exact counterexample was found; this is not proof of physical repair.', '']),
    '## Next checks', '', ...report.nextChecks.map(item => '- ' + markdownValue(item)), '',
    ...(input.provenance ? ['## Dataset attribution', '', markdownValue(input.provenance.attribution), 'License: ' + markdownValue(input.provenance.license),
      'Publisher catalogue: ' + markdownValue(input.provenance.catalogUrl), 'Retrieved: ' + markdownValue(input.provenance.retrievedAt), ''] : []),
    '## Limitations', '', ...[...report.limitations, ...input.sourceLimitations].map(item => '- ' + markdownValue(item)), '',
    'Draft only; not sent. This is an unsigned exploratory analysis, not proof of physical repair or a blockchain receipt. Review and publish an authorized audit separately.', '',
  ].join('\n');
}

/** Discrete UTC-day plot, never interpolation. Highest estimates retained first if capped. */
export function observationPlot(report: ObservationCheck) {
  const numeric = report.trace.filter(item => item.disposition !== 'outside_window' && item.record.fluxKgHr !== null);
  const picked = [...numeric].sort((a, b) => b.record.fluxKgHr! - a.record.fluxKgHr! || a.record.id.localeCompare(b.record.id)).slice(0, 200);
  const query = report.input.query;
  const start = Date.parse(query.startDate + 'T00:00:00Z'), end = Date.parse(query.endDate + 'T00:00:00Z');
  const maximum = Math.max(1, query.thresholdKgHr || 0, ...numeric.map(item => item.record.fluxKgHr! + (item.record.uncertaintyKgHr || 0))) * 1.12;
  const y = (value: number) => 180 - Math.max(0, value) / maximum * 160;
  return { maximum, thresholdY: query.thresholdKgHr === undefined ? null : y(query.thresholdKgHr), omitted: numeric.length - picked.length,
    points: picked.map(item => ({ id: item.record.id, date: item.utcDay, flux: item.record.fluxKgHr!, sd: item.record.uncertaintyKgHr,
      counterexample: item.disposition === 'counterexample', x: end === start ? 320 : 50 + (Date.parse(item.utcDay + 'T00:00:00Z') - start) / (end - start) * 540,
      y: y(item.record.fluxKgHr!), lowY: y(item.record.fluxKgHr! - (item.record.uncertaintyKgHr || 0)), highY: y(item.record.fluxKgHr! + (item.record.uncertaintyKgHr || 0)) })),
  };
}
