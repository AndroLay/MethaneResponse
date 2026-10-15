import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { MarsCasebook } from '@methane/shared';
import { listReviewSources } from './casebook';

const repositoryRoot = resolve(import.meta.dir, '../../../');

describe('MARS casebook environment example', () => {
  test('pins the API to the latest recorded dataset snapshot', async () => {
    const environmentExample = await readFile(resolve(repositoryRoot, '.env.example'), 'utf8');
    const configuredPath = environmentExample.match(/^MARS_CASEBOOK_PATH=([^\r\n#]+)$/m)?.[1]?.trim();
    expect(configuredPath).toBeTruthy();
    if (!configuredPath) return;

    const casebookPath = resolve(repositoryRoot, 'apps/api', configuredPath);
    const casebook = MarsCasebook.parse(JSON.parse(await readFile(casebookPath, 'utf8')));
    const history = JSON.parse(await readFile(resolve(repositoryRoot, 'data/real/mars_snapshot_history.json'), 'utf8')) as {
      snapshots: Array<{ snapshotId: string; archiveSha256: string }>;
    };
    const latest = history.snapshots.at(-1);
    if (!latest) throw new Error('MARS snapshot history must contain an active snapshot');
    expect(casebook.provenance.snapshotId).toBe(latest.snapshotId);
    expect(casebook.provenance.archiveSha256).toBe(latest.archiveSha256);
  });

  test('exposes the UNEP Canada report as a link-only reference, not as in-app mitigation evidence', async () => {
    const sources = await listReviewSources();
    const source = sources.find((item) => item.sourceId === 'CAN_S_002');

    expect(source).toBeDefined();
    expect(source?.synthetic).toBe(false);
    expect(source?.externalEvidence).toEqual([{
      title: 'Methane Alert and Response System (MARS) Confirmed Mitigation Action – Canada (CAN_S_002)',
      url: 'https://wedocs.unep.org/handle/20.500.11822/49811',
      publisher: 'United Nations Environment Programme',
      reportDate: '2026-07',
      license: 'Attribution-NonCommercial-NoDerivs 3.0 IGO',
      contentIncluded: false,
    }]);
    expect(source?.evidence.some((item) => item.kind === 'mitigation_confirmation')).toBe(false);
  });
});
