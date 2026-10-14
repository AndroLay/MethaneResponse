import { expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assessmentInputHashes } from '../apps/api/src/ai-review';
import { freezeAssessmentInputManifest, writeFrozenAssessmentInputManifest } from './freeze-ai-assessment-inputs';

const excerpt = 'Sensitive private report excerpt: an inspection was completed, but independent outcome evidence is absent.';
const input = {
  sourceId: 'KAZ_S_159',
  claimType: 'mitigation_confirmed' as const,
  claimText: 'The operator completed the stated repair for KAZ_S_159 on 2026-09-10 and verified sustained methane reduction.',
  consentToExternalProcessing: true as const,
  documents: [{ id: 'private-report', title: 'Private report', text: excerpt, rightsDeclared: 'explicit_permission' as const }],
};

test('frozen manifest commits to the exact claim and provider excerpt without copying either', () => {
  const first = freezeAssessmentInputManifest([{ claimId: 'claim-01', input }], Buffer.from('frozen-input-file-v1\n'));
  const changed = freezeAssessmentInputManifest([{
    claimId: 'claim-01', input: { ...input, claimText: `${input.claimText} by independent measurement` },
  }], Buffer.from('frozen-input-file-v2\n'));

  expect(first.claims).toEqual([{
    claimId: 'claim-01',
    claimTextSha256: assessmentInputHashes(input)!.claimTextSha256,
    assessmentInputSha256: assessmentInputHashes(input)!.assessmentInputSha256,
  }]);
  expect(first.inputFileSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(first.claims[0]?.assessmentInputSha256).not.toBe(changed.claims[0]?.assessmentInputSha256);
  expect(JSON.stringify(first)).not.toContain(excerpt);
  expect(JSON.stringify(first)).not.toContain(input.claimText);
});

test('frozen manifest rejects duplicate claims and rows without a bounded statement', () => {
  expect(() => freezeAssessmentInputManifest([
    { claimId: 'claim-01', input }, { claimId: 'claim-01', input },
  ], Buffer.from('duplicate'))).toThrow('Duplicate claimId');
  const { claimText: _claimText, ...legacyInput } = input;
  expect(() => freezeAssessmentInputManifest([
    { claimId: 'claim-02', input: legacyInput },
  ], Buffer.from('missing claim'))).toThrow('exact bounded claim');
});

test('private digest writer uses restrictive files, refuses overwrite, and performs no provider call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-freeze-ai-input-'));
  const source = join(directory, 'candidates.jsonl');
  const output = join(directory, 'frozen-input-digests.json');
  await writeFile(source, `${JSON.stringify({ claimId: 'claim-01', input })}\n`, { mode: 0o600 });
  try {
    const manifest = await writeFrozenAssessmentInputManifest(source, output);
    expect(manifest.claims).toHaveLength(1);
    expect((await stat(output)).mode & 0o777).toBe(0o600);
    const outputText = await readFile(output, 'utf8');
    expect(outputText).not.toContain(excerpt);
    expect(outputText).not.toContain(input.claimText);
    await expect(writeFrozenAssessmentInputManifest(source, output)).rejects.toThrow();
    expect(await readFile(output, 'utf8')).toBe(outputText);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('private digest writer refuses a group-readable candidate file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-freeze-ai-input-mode-'));
  const source = join(directory, 'candidates.jsonl');
  const output = join(directory, 'frozen-input-digests.json');
  await writeFile(source, `${JSON.stringify({ claimId: 'claim-01', input })}\n`, { mode: 0o640 });
  await chmod(source, 0o640);
  try {
    await expect(writeFrozenAssessmentInputManifest(source, output)).rejects.toThrow('owner-only permissions');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
