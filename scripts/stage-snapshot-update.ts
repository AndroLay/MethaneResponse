import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { readTransitionSnapshot } from '../apps/api/src/snapshot-transition-data';
import { buildSnapshotTransition } from '../packages/shared/src/snapshot-transition';
const root=resolve(import.meta.dir,'..');
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const json=(value:unknown)=>JSON.stringify(value,null,2)+'\n';
const contains=(parent:string,path:string)=>{const sub=relative(parent,path);return !sub||(!sub.startsWith('..')&&!isAbsolute(sub));};
/** Local opt-in intake only. No network, active-file replacement, API settings or automatic verdict changes. */
export async function stageSnapshotUpdate(options:{before:string;candidate:string;expectedBefore:string;expectedCandidate:string;output:string;approved:boolean}) {
  if(options.approved!==true)throw new Error('Explicit operator approval is required for staging.');
  const requested=resolve(options.output);
  const protectedPaths=['apps/web/public','data/real','data/state','docs/evidence'].map(path=>resolve(root,path));
  if(protectedPaths.some(path=>contains(path,requested)))throw new Error('Snapshot output is inside a protected active or frozen tree.');
  const output=resolve(await realpath(dirname(requested)),basename(requested));
  if(protectedPaths.some(path=>contains(path,output)))throw new Error('Snapshot output is inside a protected active or frozen tree.');
  const before=await readTransitionSnapshot(resolve(options.before),options.expectedBefore),after=await readTransitionSnapshot(resolve(options.candidate),options.expectedCandidate);
  const report=await buildSnapshotTransition(before,after);
  const [oldBytes,newBytes]=await Promise.all([readFile(options.before),readFile(options.candidate)]);
  if(sha(oldBytes)!==options.expectedBefore||sha(newBytes)!==options.expectedCandidate)throw new Error('Input hash changed before staging.');
  const reportBytes=Buffer.from(json(report));
  if(reportBytes.length>16_000_000)throw new Error('Change report exceeds the supported 16 MB limit.');
  const files:{[key:string]:Uint8Array}={'before.json.gz':oldBytes,'candidate.json.gz':newBytes,'report.json':reportBytes};
  const manifest={schemaVersion:1,policyVersion:'snapshot-staging/1',operatorApprovedStaging:true,activeSnapshotChanged:false,
    before:before.descriptor,after:after.descriptor,reportDigest:report.digest,
    files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,{sha256:sha(bytes),bytes:bytes.length}])),
    limitations:['Staged local normalized records only; this is not acquisition of the latest publisher release or publisher authentication.',
      'Review provenance, attribution and license before activation. No active input, stored decision or frozen evidence package was replaced.',
      'Rebuild derived projections and run all gates in an isolated candidate checkout before separately approving activation. Historical decisions remain attached to their original snapshots.']};
  const argumentsList=['bun','run','verify:snapshot-transition',resolve(output,'report.json'),'--before',resolve(output,'before.json.gz'),'--after',resolve(output,'candidate.json.gz'),'--expected-before',options.expectedBefore,'--expected-after',options.expectedCandidate,'--expected-report',report.digest];
  files['manifest.json']=Buffer.from(json(manifest));
  files['README.md']=Buffer.from(`# Staged snapshot candidate\n\n${before.descriptor.datasetSnapshotId} → ${after.descriptor.datasetSnapshotId}\n\nActive input is unchanged. This is an opt-in local staging artifact, not a live feed.\n\nTrusted input hashes: ${options.expectedBefore}, ${options.expectedCandidate}\nReport digest: ${report.digest}\n\nUse verify:snapshot-transition with the staged files and separately recorded trusted digests. See manifest.json for attribution, inventory and file hashes.\n\nVerifier arguments as JSON data (not shell source):\n\n${JSON.stringify(argumentsList)}\n`);
  await mkdir(output,{mode:0o700}); // Refuse an existing path; partial failed stages remain visible for inspection.
  for(const [name,bytes]of Object.entries(files))await writeFile(resolve(output,name),bytes,{flag:'wx',mode:0o600});
  return {output,before:before.descriptor.datasetSnapshotId,after:after.descriptor.datasetSnapshotId,digest:report.digest,summary:report.summary,affectedSources:report.affectedSourceIds.length,activeSnapshotChanged:false};
}
if(import.meta.main){
  try{
    const args=process.argv.slice(2);
    if(args.length!==11||args[0]!=='--before'||args[2]!=='--candidate'||args[4]!=='--expected-before'||args[6]!=='--expected-candidate'||args[8]!=='--output'||args[10]!=='--approve-staging')throw new Error('Usage: --before OLD.json.gz --candidate NEW.json.gz --expected-before TRUSTED_SHA256 --expected-candidate TRUSTED_SHA256 --output NEW_DIRECTORY --approve-staging');
    console.log(JSON.stringify(await stageSnapshotUpdate({before:args[1],candidate:args[3],expectedBefore:args[5],expectedCandidate:args[7],output:args[9],approved:true})));
  }catch(error){console.error(error instanceof Error?error.message:'Snapshot staging failed');process.exitCode=1;}
}
