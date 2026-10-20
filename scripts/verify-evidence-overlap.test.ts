import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SharedCaseWork } from '../packages/shared/src/index';
import { buildEvidenceOverlapReport } from '../packages/shared/src/evidence-overlap';

test('standalone overlap verifier accepts an exact report and rejects changed or untrusted input', async () => {
  const directory=await mkdtemp(join(tmpdir(),'methane-overlap-cli-'));
  const work=SharedCaseWork.parse({workId:'DEMO-cli',revision:1,context:{sourceId:'DEMO-source',synthetic:true,datasetSnapshotId:'DEMO'},status:'investigate',question:'',notes:'',evidenceRequest:'',nextAction:'',claimType:'source_detected',ownerId:'DEMO-reviewer',updatedBy:'DEMO-reviewer',createdAt:'2026-10-20T00:00:00Z',updatedAt:'2026-10-20T00:00:00Z'});
  const report=await buildEvidenceOverlapReport(work,[work]);
  const path=join(directory,'report.json');
  const run=async(args:string[])=>{const child=Bun.spawn([process.execPath,'--no-env-file','scripts/verify-evidence-overlap.ts',...args],{stdout:'pipe',stderr:'pipe'});const [code,out]=await Promise.all([child.exited,new Response(child.stdout).text(),new Response(child.stderr).text()]);return {code,out};};
  try {
    await writeFile(path,JSON.stringify(report));
    const valid=await run([path,'--expected-digest',report.digest]);
    expect(valid.code).toBe(0);expect(JSON.parse(valid.out).duplicateMitigationEstablished).toBe(false);
    expect((await run([path])).code).toBe(1);
    expect((await run([path,'--expected-digest','0x'+'b'.repeat(64)])).code).toBe(1);
    await writeFile(path,JSON.stringify({...report,duplicateMitigationEstablished:true}));
    expect((await run([path,'--expected-digest',report.digest])).code).toBe(1);
    await writeFile(path,' '.repeat(1_048_577));
    expect((await run([path,'--expected-digest',report.digest])).code).toBe(1);
  } finally {await rm(directory,{recursive:true,force:true});}
});
