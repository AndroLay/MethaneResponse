import { expect, test } from 'bun:test';
import { scoreResponses } from './product-value-evaluation';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('comparison retains missing and incorrect cells in the frozen denominator', () => {
  const key = [{ id: 'A', answer: { result: 'valid' } }, { id: 'B', answer: { physicalMitigationEstablished: false } }];
  expect(scoreResponses(key, [{ id: 'A', answer: { result: 'valid' } }])).toMatchObject({ scheduled: 2, correct: 1, missing: 1, criticalOverclaims: 0 });
  expect(scoreResponses(key, [{ id: 'B', answer: { physicalMitigationEstablished: true } }])).toMatchObject({ scheduled: 2, correct: 0, missing: 1, criticalOverclaims: 1 });
});

test('comparison refuses duplicate or unscheduled responses and scores objects independent of key order', () => {
  const key = [{ id: 'A', answer: { result: 'valid', physicalMitigationEstablished: false } }];
  expect(scoreResponses(key, [{ id: 'A', answer: { physicalMitigationEstablished: false, result: 'valid' } }]).correct).toBe(1);
  expect(() => scoreResponses(key, [{ id: 'X', answer: {} }])).toThrow('Unscheduled');
  expect(() => scoreResponses(key, [{ id: 'A', answer: {} }, { id: 'A', answer: {} }])).toThrow('Duplicate');
});

test('new comparison packets use English instructions and preserve existing frozen output', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'methane-english-protocol-'));
  const packet = join(temporary, 'new-packet');
  const prepare = () => Bun.spawn({
    cmd: [process.execPath, '--no-env-file', join(import.meta.dir, 'product-value-evaluation.ts'), 'prepare', packet],
    stdout: 'pipe', stderr: 'pipe',
  });
  try {
    const first = prepare();
    const firstError = await new Response(first.stderr).text();
    expect(await first.exited, firstError).toBe(0);
    const protocol = await readFile(join(packet, 'protocol.md'), 'utf8');
    expect(protocol).toContain('# Frozen functional-comparison protocol');
    expect(protocol).toContain('16 scheduled cells');
    expect(protocol).toContain('Missing\nanswers fail');
    expect(protocol).toContain('Do not inspect rubric.json');
    expect(protocol).toContain('Agents are not human participants');
    expect(protocol).not.toMatch(/\b(Protokol|Dibekukan|penilaian|jawaban|pengguna)\b/);
    const freeze = await readFile(join(packet, 'input-freeze.json'), 'utf8');
    const second = prepare();
    await new Response(second.stderr).text();
    expect(await second.exited).not.toBe(0);
    expect(await readFile(join(packet, 'protocol.md'), 'utf8')).toBe(protocol);
    expect(await readFile(join(packet, 'input-freeze.json'), 'utf8')).toBe(freeze);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
