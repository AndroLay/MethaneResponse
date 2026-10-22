import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { stageSnapshotUpdate } from './stage-snapshot-update';
const before=resolve('data/real/snapshot-projections/unep-mars-e0721015e925.json.gz'), candidate=resolve('apps/web/public/data/mars-snapshot.json.gz');
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function options() { return { before,candidate,expectedBefore:sha(await readFile(before)),expectedCandidate:sha(await readFile(candidate)),approved:true }; }
test('snapshot staging requires explicit approval and separate input hashes before writing',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'methane-staging-'));
  try {
    const output=join(dir,'stage'), opts=await options();
    await expect(stageSnapshotUpdate({...opts,output,approved:false})).rejects.toThrow('approval');
    await expect(stageSnapshotUpdate({...opts,output,expectedCandidate:'0'.repeat(64)})).rejects.toThrow('hash');
    expect(await stat(output).catch(()=>null)).toBeNull();
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('real historical snapshots stage complete copies and replay without altering active input',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'methane-staging-'));
  try {
    const output=join(dir,'stage'),opts=await options(),beforeInput=await readFile(candidate);
    const result=await stageSnapshotUpdate({...opts,output});
    expect(result.activeSnapshotChanged).toBe(false);expect(result.summary.addedSources).toBe(7);expect(result.summary.addedObservations).toBe(95);
    expect(await readFile(candidate)).toEqual(beforeInput);
    expect(sha(await readFile(join(output,'candidate.json.gz')))).toBe(opts.expectedCandidate);
    expect(JSON.parse(await readFile(join(output,'manifest.json'),'utf8')).operatorApprovedStaging).toBe(true);
    await expect(stageSnapshotUpdate({...opts,output})).rejects.toThrow();
    expect(await readFile(candidate)).toEqual(beforeInput);
  } finally {await rm(dir,{recursive:true,force:true});}
  // Full real-snapshot parsing, replay and a second refusal check exceed Bun's
  // 5s unit-test default on loaded runners. Keep all assertions; bound integration
  // runtime separately from any product performance claim.
},20_000);
test('staging refuses active, frozen evidence, real provenance and state trees',async()=>{
  const opts=await options();
  for(const output of ['apps/web/public/data/DEMO-stage','data/real/DEMO-stage','docs/evidence/DEMO-stage','data/state/DEMO-stage'])await expect(stageSnapshotUpdate({...opts,output})).rejects.toThrow('protected');
});
test('staging resolves symlinked output parents before enforcing protected trees',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'methane-staging-link-'));
  try{await symlink(resolve('docs/evidence'),join(dir,'alias'));await expect(stageSnapshotUpdate({...await options(),output:join(dir,'alias','DEMO-stage')})).rejects.toThrow('protected');}
  finally{await rm(dir,{recursive:true,force:true});}
});
