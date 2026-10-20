import { verifyEvidenceOverlapReport } from '../packages/shared/src/evidence-overlap';
if(import.meta.main){
  try{
    const [path,flag,digest,...rest]=process.argv.slice(2);
    if(!path||path.startsWith('-')||flag!=='--expected-digest'||!/^0x[a-f0-9]{64}$/.test(digest||'')||rest.length)throw new Error('Usage: REPORT.json --expected-digest TRUSTED_0x_SHA256');
    const file=Bun.file(path);
    if(file.size>1_048_576)throw new Error('Overlap report exceeds 1 MiB.');
    const raw=JSON.parse(await file.text());
    if(!await verifyEvidenceOverlapReport(raw,digest))throw new Error('Overlap report replay or independently supplied digest mismatch.');
    console.log(JSON.stringify({valid:true,digest,candidates:raw.candidates.length,duplicateMitigationEstablished:false,limitation:'Replays recorded authorized input summaries. No publisher authentication, complete cross-organization search or physical repair proof.'}));
  }catch(error){console.error(error instanceof Error?error.message:'Evidence overlap verification failed');process.exitCode=1;}
}
