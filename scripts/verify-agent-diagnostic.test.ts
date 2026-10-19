import { describe, expect, test } from 'bun:test';
import { validateAgentDiagnostic } from './verify-agent-diagnostic';

const input = { sourceId:'S_1',claimType:'source_detected',claimText:'The supplied archive explicitly records this source.',
  consentToExternalProcessing:true,documents:[{id:'doc-1',title:'Authored local record',
    text:'This is an authored DEMO test record containing no third party report body. Source S_1 is recorded.',rightsDeclared:'owned'}] };
const rows = [{claimId:'c1',input}];
const proposal = {claimId:'c1',verdict:'supported',reason:'The supplied record explicitly includes this source.',citations:[{documentId:'doc-1',quote:'Source S_1 is recorded.'}]};

describe('offline agent diagnostic grounding',()=>{
  test('uses actual application quote verifier and exact input hashes',()=>{
    const result=validateAgentDiagnostic(rows,[proposal]);
    expect(result[0].verdict).toBe('supported');
    expect(result[0].assessmentInputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result[0].citationValidationFailures).toBe(0);
    expect(result[0].providerBenchmarkCompleted).toBe(false);
  });
  test('invented quotation forces abstention',()=>{
    const result=validateAgentDiagnostic(rows,[{...proposal,citations:[{documentId:'doc-1',quote:'The equipment was repaired.'}]}]);
    expect(result[0].verdict).toBe('insufficient_evidence');
    expect(result[0].citationValidationFailures).toBe(1);
  });
  test('no quotations cannot support a claim',()=>{
    expect(validateAgentDiagnostic(rows,[{...proposal,citations:[]}])[0].verdict).toBe('insufficient_evidence');
  });
  test('rejects missing, extra, duplicate and malformed claims',()=>{
    for(const proposals of [[],[proposal,proposal],[{...proposal,claimId:'other'}],[{...proposal,reason:'x'}]]){
      expect(()=>validateAgentDiagnostic(rows,proposals)).toThrow();
    }
  });
  test('rejects duplicate input IDs',()=>{
    expect(()=>validateAgentDiagnostic([...rows,...rows],[proposal])).toThrow();
  });
  test('rejects non-string verdict instead of coercing it',()=>{
    expect(()=>validateAgentDiagnostic(rows,[{...proposal,verdict:{toString:()=> 'supported'}}])).toThrow();
  });
});
