import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { decisionFixture } from '../apps/api/src/fixtures/investigation-decision';
import { investigationDigest } from '../packages/shared/src/investigation-dossier';
test('independent decision CLI accepts original, rejects edits/recomputed hash, requires separate digest and chain configuration', async () => {
  const dir = await mkdtemp('/tmp/methane-decision-cli-');
  try {
    const decision = await decisionFixture(), path = `${dir}/decision.json`;
    const run = (...args:string[]) => Bun.spawnSync([process.execPath,'--no-env-file',`${import.meta.dir}/verify-investigation-decision.ts`,path,...args],{stdout:'pipe',stderr:'pipe',env:{PATH:process.env.PATH}});
    await writeFile(path,JSON.stringify({decision}));
    expect(run('--expected-digest',decision.digest).exitCode).toBe(0);
    const edited = structuredClone(decision); edited.rationale = 'DEMO deliberately altered rationale after review';
    await writeFile(path,JSON.stringify({decision:edited})); expect(run('--expected-digest',decision.digest).exitCode).toBe(1);
    const {digest:_,...payload} = edited; edited.digest = await investigationDigest(payload);
    await writeFile(path,JSON.stringify({decision:edited})); expect(run('--expected-digest',decision.digest).exitCode).toBe(1);
    await writeFile(path,JSON.stringify({decision})); expect(run('--expected-digest',decision.digest).exitCode).toBe(0);
    expect(run().exitCode).toBe(1); expect(run('--expected-digest',decision.digest,'--require-chain').exitCode).toBe(1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
