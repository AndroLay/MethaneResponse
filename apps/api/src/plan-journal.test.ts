import { expect, test } from 'bun:test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import { verifyPlanJournal, planJournalHash } from '@methane/shared/plan-journal';
import { FilePlanStore, MemoryPlanStore } from './plan-store';

async function report(capacity = 1) {
  return buildInvestigationPortfolio({ dataset: { datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64), inputFileSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 0, archiveStartDate: '2020-01-01', archiveEndDate: '2026-01-01' }, parameters: { capacity, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] }, candidates: [] });
}
const draft = { strategy: 'weighted' as const, decision: 'accept' as const, rationale: 'DEMO allocation decision; inspect original records before taking action.' };
test('plan revisions preserve old report, authenticated actor and parent hash; same report deduplicates', async () => {
  const store = new MemoryPlanStore(), first = await report();
  const a = await store.save('test-plan', first, draft, 0, null, 'test-reviewer');
  const b = await store.save('test-plan', first, { ...draft, decision: 'defer' }, 1, a.revisions[0].hash, 'other-reviewer');
  expect(b.reports).toHaveLength(1); expect(b.revisions).toHaveLength(2);
  expect(b.revisions[0]).toEqual(a.revisions[0]); expect(b.revisions[1].previousHash).toBe(a.revisions[0].hash);
  expect(b.revisions[1].reviewerId).toBe('other-reviewer'); expect(await verifyPlanJournal(b, b.revisions[1].hash)).toBe(true);
});
test('simultaneous stale writers cannot overwrite plan decisions and wrong parent is rejected', async () => {
  const store = new MemoryPlanStore(), r = await report();
  const a = await store.save('test-plan', r, draft, 0, null, 'test-reviewer');
  const writes = await Promise.allSettled([store.save('test-plan', r, draft, 1, a.revisions[0].hash, 'test-reviewer'), store.save('test-plan', r, draft, 1, a.revisions[0].hash, 'other-reviewer')]);
  expect(writes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  await expect(store.save('test-plan', r, draft, 2, '0x'+'f'.repeat(64), 'test-reviewer')).rejects.toThrow('conflict');
});
test('trusted head detects rewritten reasoning even after recomputing an internally valid hash', async () => {
  const a = await new MemoryPlanStore().save('test-plan', await report(), draft, 0, null, 'test-reviewer');
  const expected = a.revisions[0].hash, changed = structuredClone(a);
  changed.revisions[0].rationale = 'DEMO different reasoning that was not accepted by the original reviewer.';
  const { hash: _, ...payload } = changed.revisions[0]; changed.revisions[0].hash = await planJournalHash(payload);
  expect(await verifyPlanJournal(changed, expected)).toBe(false);
  expect(await verifyPlanJournal(changed, changed.revisions[0].hash)).toBe(true); // self-consistency is not publisher authentication
  const other = structuredClone(a); other.planId = 'foreign-plan';
  expect(await verifyPlanJournal(other, expected)).toBe(false);
});
test('replayed reports and final authorization are mandatory before committing a plan', async () => {
  const store = new MemoryPlanStore(), r = await report();
  const bad = structuredClone(r); bad.eligibleCount = 19;
  await expect(store.save('test-plan', bad, draft, 0, null, 'test-reviewer')).rejects.toThrow();
  await expect(store.save('test-plan', r, draft, 0, null, 'test-reviewer', async () => { throw new Error('revoked'); })).rejects.toThrow('revoked');
  expect(await store.get('test-plan')).toBeNull();
});
test('private file journal survives reopening and fails closed after data loss or tampering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-plan-test-')); const path = join(dir, 'plans.json');
  try {
    const store = new FilePlanStore(path), a = await store.save('test-plan', await report(), draft, 0, null, 'test-reviewer');
    expect(await new FilePlanStore(path).get('test-plan')).toEqual(a);
    const raw = await readFile(path, 'utf8');
    await writeFile(path, raw.replace('test-reviewer', 'fake-reviewer'), { mode: 0o600 });
    await expect(new FilePlanStore(path).get('test-plan')).rejects.toThrow();
    await rm(path); await expect(new FilePlanStore(path).get('test-plan')).rejects.toThrow();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
