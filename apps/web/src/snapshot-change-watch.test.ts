import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { SnapshotTransition, transitionPage } from '@methane/shared/snapshot-transition';
import { acceptSnapshotTransitionPage, changeValue } from './snapshot-change-watch';

const report = SnapshotTransition.parse(JSON.parse(await readFile(new URL('../../../data/processed/snapshot-transition/report.json', import.meta.url), 'utf8')));
const request = { datasetSnapshotId: report.after.datasetSnapshotId, inputFileSha256: report.after.inputFileSha256, sourceIds: ['TKM_S_021', 'MEX_S_003'], offset: 0, limit: 20 };
test('page acceptance binds selected IDs, exact page and snapshot archive', () => {
  const page = transitionPage(report, request);
  expect(acceptSnapshotTransitionPage(page, request, report.after.provenance.archiveSha256).items[0].sourceId).toBe('TKM_S_021');
  expect(() => acceptSnapshotTransitionPage(page, { ...request, offset: 20 }, report.after.provenance.archiveSha256)).toThrow();
  expect(() => acceptSnapshotTransitionPage(page, { ...request, sourceIds: ['IRN_S_065'] }, report.after.provenance.archiveSha256)).toThrow();
  expect(() => acceptSnapshotTransitionPage(page, request, 'f'.repeat(64))).toThrow();
});
test('a response cannot relabel unrelated or duplicate rows as selected sources', () => {
  const page = transitionPage(report, request);
  page.items[0].sourceId = 'DEMO unrelated';
  expect(() => acceptSnapshotTransitionPage(page, request, report.after.provenance.archiveSha256)).toThrow();
  const duplicate = transitionPage(report, request); duplicate.items.push(duplicate.items[0]);
  expect(() => acceptSnapshotTransitionPage(duplicate, request, report.after.provenance.archiveSha256)).toThrow();
});
test('source changes keep unknown flux distinct from numeric zero and escape through React text', () => {
  expect(changeValue(null)).toBe('not reported'); expect(changeValue(0)).toBe('0');
  expect(changeValue(false)).toBe('false'); expect(changeValue('<script>')).toBe('<script>');
});
