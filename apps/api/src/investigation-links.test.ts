import { expect, test } from 'bun:test';
import { CaseWorkDraft } from '@methane/shared';
import { FileCaseWorkStore } from './case-work-file';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const draft = { status: 'investigate', question: 'Check the source-specific follow-up', notes: '', evidenceRequest: 'Request the dated follow-up measurement.', nextAction: 'Inspect the follow-up method.', claimType: 'mitigation_confirmed' };
const planLink = { planId: 'DEMO-plan', revision: 1, revisionHash: '0x' + 'a'.repeat(64), reportDigest: '0x' + 'b'.repeat(64), strategy: 'weighted' };

test('casework preserves the exact plan revision, change report and evidence acceptance criteria', () => {
  const value = { ...draft, planLink, changeReportDigest: '0x' + 'c'.repeat(64), acceptanceCriteria: 'Follow-up must identify the source, method, action date and uncertainty.' };
  expect(CaseWorkDraft.parse(value)).toEqual(value as any);
});

test('casework rejects malformed and caller-extended investigation links while legacy drafts remain valid', () => {
  expect(CaseWorkDraft.safeParse(draft).success).toBe(true);
  for (const link of [{ ...planLink, revision: 0 }, { ...planLink, revisionHash: 'self-reported' }, { ...planLink, reviewerId: 'forged' }, { ...planLink, strategy: 'unbounded' }]) {
    expect(CaseWorkDraft.safeParse({ ...draft, planLink: link }).success).toBe(false);
  }
  expect(CaseWorkDraft.safeParse({ ...draft, acceptanceCriteria: 'x'.repeat(1001) }).success).toBe(false);
});
test('additive investigation fields and legacy revisions survive a file store reopen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-connected-work-'));
  try {
    const path = join(directory, 'work.json'), context = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO' };
    const store = new FileCaseWorkStore(path), legacy = CaseWorkDraft.parse(draft);
    await store.save(context, 'DEMO-work', legacy, 0, 'DEMO-reviewer');
    const linked = CaseWorkDraft.parse({ ...draft, planLink, changeReportDigest: '0x'+'c'.repeat(64), acceptanceCriteria: 'DEMO require dated source-specific measurement.' });
    await store.save(context, 'DEMO-work', linked, 1, 'DEMO-reviewer');
    const history = await new FileCaseWorkStore(path).history(context, 'DEMO-work');
    expect(history).toHaveLength(2); expect(history[0].planLink).toBeUndefined();
    expect(history[1].planLink).toEqual(linked.planLink); expect(history[1].changeReportDigest).toBe(linked.changeReportDigest); expect(history[1].acceptanceCriteria).toBe(linked.acceptanceCriteria);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
