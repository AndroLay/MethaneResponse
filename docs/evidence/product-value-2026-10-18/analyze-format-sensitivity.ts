/** Post-hoc serialization sensitivity. Never replaces the frozen primary analysis. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { scoreResponses } from '../../../scripts/product-value-evaluation';

const original = await readFile(join(import.meta.dir, 'manual-results.json'));
const manual = JSON.parse(original.toString());
const rubric = JSON.parse(await readFile(join(import.meta.dir, 'rubric.json'), 'utf8'));
let mappedCells = 0;
const normalized = manual.responses.map((row: { id: string; answer: Record<string, unknown> }) => {
  if (row.id.startsWith('DEMO:integrity:') && typeof row.answer.localDigest === 'boolean') {
    mappedCells++;
    return { ...row, answer: { ...row.answer, localDigest: row.answer.localDigest ? 'valid' : 'invalid' } };
  }
  return row;
});
if (mappedCells !== 5) throw new Error('Unexpected normalization set; review the method before interpreting');
await writeFile(join(import.meta.dir, 'format-sensitivity.json'), JSON.stringify({
  postHoc: true, primaryAnalysis: 'comparison.json', originalManualSha256: createHash('sha256').update(original).digest('hex'),
  reason: 'Prompts named localDigest but omitted its enum type. Manual returned booleans, app returned valid/invalid. The five primary mismatches are serialization differences, not wrong integrity decisions.',
  mapping: { true: 'valid', false: 'invalid' }, mappedCells,
  method: 'Map only boolean localDigest for the five integrity task IDs; no other fields, decisions, rubric, input, or raw response changed.',
  normalizedManual: scoreResponses(rubric, normalized),
  conclusion: 'Decision parity on this small authored set; no evidence of app superiority or human time savings.',
}, null, 2) + '\n', { flag: 'wx' });
