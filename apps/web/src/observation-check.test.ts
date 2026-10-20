import { expect, test } from 'bun:test';
import { buildObservationCheck } from '@methane/shared/observation-claims';
import { acceptObservationCheck, observationCheckMarkdown, observationPlot } from './observation-check';

const input = { sourceId: 'DEMO-CHECK', datasetSnapshotId: 'DEMO-snapshot', synthetic: true,
  archiveSha256: 'a'.repeat(64), inputFileSha256: 'b'.repeat(64), archiveEndDate: '2026-06-30', sourceLimitations: [],
  query: { kind: 'reported_flux_at_most' as const, startDate: '2026-06-01', endDate: '2026-06-30', thresholdKgHr: 100 },
  observations: [{ id: 'DEMO-plume', sourceId: 'DEMO-CHECK', linkStatus: 'linked' as const, date: '2026-06-12T10:00:00', fluxKgHr: 120, uncertaintyKgHr: 80, fluxUnit: 'kg/h' as const }] };

test('observation client binds source, exact question, snapshot and archive before replay', async () => {
  const report = await buildObservationCheck(input);
  const context = { sourceId: input.sourceId, synthetic: true, datasetSnapshotId: input.datasetSnapshotId, archiveSha256: input.archiveSha256, inputFileSha256: input.inputFileSha256, query: input.query };
  expect((await acceptObservationCheck(report, context)).digest).toBe(report.digest);
  for (const change of [{ sourceId: 'OTHER' }, { synthetic: false }, { datasetSnapshotId: 'stale' }, { archiveSha256: 'c'.repeat(64) }, { inputFileSha256: 'c'.repeat(64) }, { query: { ...input.query, thresholdKgHr: 200 } }]) {
    await expect(acceptObservationCheck(report, { ...context, ...change })).rejects.toThrow();
  }
  await expect(acceptObservationCheck({ ...report, counterexampleIds: [] }, context)).rejects.toThrow();
});
test('observation export keeps exact witnesses, uncertainty, scope and unsigned status', async () => {
  const report = await buildObservationCheck(input);
  const text = observationCheckMarkdown(report);
  for (const value of ['DEMO', 'DEMO-plume', '2026-06-12T10:00:00', '120', '80', 'kg/h', report.digest, input.archiveSha256, 'not sent', 'not proof of physical repair']) expect(text).toContain(value);
  expect(text).not.toContain('\\n');
});
test('discrete plot excludes absent flux and outside dates, preserves witnesses and caps nodes', async () => {
  const report = await buildObservationCheck({ ...input, observations: [...input.observations,
    { ...input.observations[0], id: 'DEMO-missing', fluxKgHr: null },
    { ...input.observations[0], id: 'DEMO-outside', date: '2026-05-01' }] });
  const plot = observationPlot(report);
  expect(plot.points.length).toBe(1);
  expect(plot.points[0].id).toBe('DEMO-plume');
  expect(plot.points[0].counterexample).toBe(true);
  expect(plot.points[0].x).toBeGreaterThanOrEqual(50);
  expect(plot.points[0].y).toBeGreaterThanOrEqual(20);
  expect(plot.points[0].lowY).toBeGreaterThan(plot.points[0].y);
  expect(plot.omitted).toBe(0);
  const many = await buildObservationCheck({ ...input, observations: Array.from({ length: 240 }, (_, i) => ({ ...input.observations[0], id: 'DEMO-' + i, fluxKgHr: i })) });
  const capped = observationPlot(many);
  expect(capped.points.length).toBe(200);
  expect(capped.omitted).toBe(40);
  expect(capped.points.some(point => point.id === 'DEMO-239')).toBe(true);
});
test('downloaded drafts cannot interpret source metadata as Markdown instructions or links', async () => {
  const report = await buildObservationCheck({ ...input,
    sourceLimitations: ['Archive note\n## Spoofed heading <script>alert(1)</script>'],
    observations: [{ ...input.observations[0], satellite: 'DEMO\n[False reference](https://example.com) **verified**' }],
  });
  const text = observationCheckMarkdown(report);
  expect(text).not.toContain('\n## Spoofed heading');
  expect(text).not.toContain('[False reference](https://example.com)');
  expect(text).not.toContain('<script>');
  expect(text).toContain('\\*\\*verified\\*\\*');
});
