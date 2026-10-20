import { expect, test } from 'bun:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { FileAuditStore } from './store';
import { verifyInvestigationDecision } from '@methane/shared/investigation-decision';
import { decisionFixture } from './fixtures/investigation-decision';
test('review freezes exact dossier, preserves revisions and survives file store restart', async () => {
  const dir = await mkdtemp('/tmp/methane-decision-');
  try {
    const store = new FileAuditStore(`${dir}/audits.json`), decision = await decisionFixture();
    await store.saveInvestigationDecision(decision, null, async () => true);
    const read = (await new FileAuditStore(store.path).listInvestigationDecisions(decision.dossier.context, decision.dossier.workId))[0];
    expect(read.decision).toEqual(decision); expect(await verifyInvestigationDecision(read.decision, decision.digest)).toBe(true);
    const edited = structuredClone(decision); edited.rationale = 'DEMO altered rationale after frozen decision';
    expect(await verifyInvestigationDecision(edited, decision.digest)).toBe(false);
    await expect(store.saveInvestigationDecision(decision, null, async () => true)).rejects.toThrow();
    await expect(store.saveInvestigationDecision(decision, decision.digest, async () => false)).rejects.toThrow();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('frozen state rejects normalization, payload edits and new unknown commitment fields on disk', async () => {
  const dir = await mkdtemp('/tmp/methane-decision-tamper-');
  try {
    const path = `${dir}/audits.json`, store = new FileAuditStore(path), decision = await decisionFixture();
    await store.saveInvestigationDecision(decision,null,async () => true);
    const original = await readFile(path,'utf8');
    for (const mutate of [
      (v:any) => {v.decisions[0].decision.rationale += ' ';},
      (v:any) => {v.decisions[0].decision.dossier.history[0].notes = ' ';},
      (v:any) => {v.decisions[0].decision.rationale = 'DEMO changed committed reasoning';},
      (v:any) => {v.decisions[0].decision.unknownExtension = true;},
    ]) {
      const changed = JSON.parse(original); mutate(changed); await writeFile(path,JSON.stringify(changed),{mode:0o600});
      await expect(new FileAuditStore(path).listInvestigationDecisions(decision.dossier.context,decision.dossier.workId)).rejects.toThrow();
    }
    await writeFile(path,original,{mode:0o600});
    expect((await new FileAuditStore(path).listInvestigationDecisions(decision.dossier.context,decision.dossier.workId))[0].decision.digest).toBe(decision.digest);
  } finally {await rm(dir,{recursive:true,force:true});}
});
