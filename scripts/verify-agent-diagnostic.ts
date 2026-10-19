/** Offline grounding replay. Does not call a provider or authenticate agent identity. */
import { readFile, writeFile } from 'node:fs/promises';
import { DocumentAssessmentInput, assessmentInputHashes, verifyCitations } from '../apps/api/src/ai-review';

type Proposal = { claimId:string; verdict:'supported'|'contradicted'|'insufficient_evidence'; reason:string; citations:{documentId:string;quote:string}[] };
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function proposal(value:unknown):Proposal{
  if(!record(value)||typeof value.claimId!=='string'||typeof value.verdict!=='string'||!['supported','contradicted','insufficient_evidence'].includes(value.verdict)
    ||typeof value.reason!=='string'||value.reason.length<10||value.reason.length>1200||!Array.isArray(value.citations)||value.citations.length>8
    ||value.citations.some(q=>!record(q)||typeof q.documentId!=='string'||typeof q.quote!=='string'||q.quote.length<8||q.quote.length>450)){
    throw new Error('Malformed agent proposal');
  }
  return value as Proposal;
}

export function validateAgentDiagnostic(rows:unknown[], predictions:unknown[]){
  const inputs=new Map<string,ReturnType<typeof DocumentAssessmentInput.parse>>();
  for(const row of rows){
    if(!record(row)||typeof row.claimId!=='string'||inputs.has(row.claimId))throw new Error('Invalid or duplicate input ID');
    inputs.set(row.claimId,DocumentAssessmentInput.parse(row.input));
  }
  const seen=new Set<string>();
  const results=predictions.map(raw=>{
    const p=proposal(raw),input=inputs.get(p.claimId);
    if(!input||seen.has(p.claimId))throw new Error('Unknown or duplicate prediction ID');
    seen.add(p.claimId);
    const hashes=assessmentInputHashes(input);
    if(!hashes)throw new Error('Exact bounded claim required');
    const checked=verifyCitations(input,p);
    return {claimId:p.claimId,...hashes,proposedVerdict:p.verdict,verdict:checked.result,citations:checked.quotes,
      proposedCitationCount:p.citations.length,citationValidationFailures:checked.rejected,
      executionMode:'agent_offline' as const,providerBenchmarkCompleted:false as const};
  });
  if(!inputs.size||seen.size!==inputs.size)throw new Error('Exact nonempty claim sets required');
  return results;
}

if(import.meta.main){
  try{
    const [inputPath,predictionPath,outputPath]=process.argv.slice(2);
    if(!inputPath||!predictionPath||!outputPath||process.argv.length!==5)throw new Error('Expected three paths');
    const [rows,predictions]=await Promise.all([readFile(inputPath,'utf8').then(JSON.parse),readFile(predictionPath,'utf8').then(JSON.parse)]);
    if(!Array.isArray(rows)||!Array.isArray(predictions))throw new Error('Expected JSON arrays');
    const results=validateAgentDiagnostic(rows,predictions);
    await writeFile(outputPath,JSON.stringify(results,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({claims:results.length,rejectedQuotations:results.reduce((n,r)=>n+r.citationValidationFailures,0),providerCalls:0}));
  }catch{
    console.error('Offline diagnostic rejected input or could not write a new output. No provider was called.');process.exitCode=1;
  }
}
