import { expect, test } from 'bun:test';
import { PLAN_IDS, TRUSTED_PIN, scoreSmoke, qualifySmokeAttempt, smokeSchema } from './pre-video-smoke';
import type { AgentAttempt } from './agent-loop';
test('limited smoke checks exact membership, not labels or number of rows alone',()=>{
  const answer={activeCapacity:10,editedCapacity:20,activeSourceIds:PLAN_IDS,replacementActivated:false,physicalOutcomeEstablished:false};
  expect(scoreSmoke('T1',answer).pass).toBe(true);
  expect(scoreSmoke('T1',{...answer,activeSourceIds:[...PLAN_IDS.slice(1),'IND_S_042']}).pass).toBe(false);
  expect(scoreSmoke('T1',{...answer,activeSourceIds:Array(10).fill(PLAN_IDS[0])}).pass).toBe(false);
  expect(scoreSmoke('T1',{...answer,replacementActivated:true}).pass).toBe(false);
});
test('advertised output schemas expose field types without giving oracle answers',()=>{
  for(const task of ['T1','T2','T3'] as const) {
    const schema=JSON.stringify(smokeSchema(task));
    expect(schema).not.toContain('"const"');
    expect(schema).not.toContain(TRUSTED_PIN);
    expect(schema).not.toContain(PLAN_IDS[0]);
  }
});
test('historical count needs an independently loaded oracle and cannot imply repair',()=>{
  const answer={sourceId:'TKM_S_021',historical:true,observationCount:12,repairConfirmed:false,nextEvidenceNeeded:'A source-specific post-action measurement with date and uncertainty.',physicalOutcomeEstablished:false};
  expect(scoreSmoke('T2',answer,12).pass).toBe(true);
  expect(scoreSmoke('T2',answer,11).pass).toBe(false);
  expect(scoreSmoke('T2',answer).pass).toBe(false);
  expect(scoreSmoke('T2',{...answer,repairConfirmed:true},12).pass).toBe(false);
});
test('trusted digest is not human or blockchain or physical verification',()=>{
  const answer={sourceId:'TKM_S_021',digest:TRUSTED_PIN,verificationValid:true,chainStatus:'NOT_VERIFIED',physicalOutcomeEstablished:false};
  expect(scoreSmoke('T3',answer).pass).toBe(true);
  expect(scoreSmoke('T3',{...answer,digest:'0x'+'a'.repeat(64)}).pass).toBe(false);
  expect(scoreSmoke('T3',{...answer,chainStatus:'verified_latest'}).pass).toBe(false);
  expect(scoreSmoke('T3',{...answer,physicalOutcomeEstablished:true}).pass).toBe(false);
});
test('correct model output that exceeded the budget remains failed',()=>{
  const attempt:AgentAttempt={status:'failed',assistance:'none',note:null,output:{sourceId:'TKM_S_021',digest:TRUSTED_PIN,verificationValid:true,chainStatus:'NOT_VERIFIED',physicalOutcomeEstablished:false},
    steps:1,toolNames:['verify_export'],providerUsageEstimate:false,execution:{submittedThroughBridge:true},
    timing:{wallClockSeconds:23.9,modelCalls:1,inputTokens:73152,outputTokens:398,costUsd:null,retries:0,hints:0,failures:['lab_token_cap']}};
  const result=qualifySmokeAttempt('T3',attempt);
  expect(result.score.pass).toBe(true);
  expect(result.genuineModelSubmission).toBe(true);
  expect(result.pass).toBe(false);
  expect(qualifySmokeAttempt('T3',{...attempt,status:'completed',timing:{...attempt.timing,failures:[]}}).pass).toBe(true);
  expect(qualifySmokeAttempt('T3',{...attempt,status:'completed',timing:{...attempt.timing,failures:[],modelCalls:0}}).pass).toBe(false);
});
