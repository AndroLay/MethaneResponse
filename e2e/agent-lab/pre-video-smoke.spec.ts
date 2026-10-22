import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCodexTaskAgent } from '../../scripts/agent-usefulness/codex-cli-runner';
import { parseRunnerConfig } from '../../scripts/agent-usefulness/runner-config';
import { SMOKE_VERSION, SMOKE_DIRECTORY, TRUSTED_PIN, qualifySmokeAttempt, smokeSchema, smokeAssignments, type SmokeTask } from '../../scripts/agent-usefulness/pre-video-smoke';

// Exactly three single attempts. Not paired research, a retry of r12, a human
// study, or the original full T2/T3 workflow. Gold stays out of runner prompts.
const tasks:SmokeTask[] = ['T3','T1','T2'];
const budget = {totalTokens:0,costUsd:0,providerCalls:0};
const config=parseRunnerConfig({AGENT_LAB_PROFILE:'codex-cli-gpt-6-luna-max',AGENT_LAB_CODEX_VERSION:'0.160.0',AGENT_LAB_TOKEN_CAP:'60000',AGENT_LAB_MAX_CALLS_PER_EPISODE:'1'});
let infrastructureStopped=false;
let observationCount:number;
const fixture=resolve('docs/evidence/r12-blocker-followup-2026-10-21/browser/frozen-investigation-decision.json');
test.beforeAll(async()=>{
  await mkdir(SMOKE_DIRECTORY,{recursive:true});
  const hashes:Record<string,string>={};
  for(const file of ['scripts/agent-usefulness/pre-video-smoke.ts','e2e/agent-lab/pre-video-smoke.spec.ts','scripts/agent-usefulness/codex-cli-runner.ts','scripts/agent-usefulness/codex-mcp-server.ts',fixture]) hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
  const response=await fetch(`${process.env.AGENT_LAB_APP_ORIGIN}/api/intelligence/insights?sourceId=TKM_S_021`);
  if(!response.ok) throw new Error('Independent source oracle unavailable before agent startup.');
  const insight=await response.json();
  observationCount=insight.insight.observationCount;
  if(!Number.isSafeInteger(observationCount) || observationCount<1) throw new Error('Invalid observation oracle.');
  await writeFile(`${SMOKE_DIRECTORY}/smoke-protocol.json`,JSON.stringify({version:SMOKE_VERSION,frozenAt:new Date().toISOString(),tasks:tasks.map(task=>({task,assignment:smokeAssignments[task],schema:smokeSchema(task)})),limits:{maxAttempts:3,retries:0,tokenAllowance:60000,tokenEnforcement:'Codex reports aggregate tokens only at turn completion; this allowance stops later attempts, not internal requests.',billing:'existing ChatGPT plan; consumes plan quota, no new API key or per-token paid provider'},oracle:{plan:'r12 exact source membership retained; not exposed to task agent',observationCount,trustedPin:TRUSTED_PIN},hashes,scope:'Bounded synthetic P8 diagnostic tasks only. No full r12 rescore, human productivity claim, reviewer mutation, AI backend call, public chain or deployment.'},null,2)+'\n',{flag:'wx',mode:0o600});
});
// Keep the batch in one test: Playwright restarts a worker after a failed test,
// which must never reset the allowance or start a fresh model call implicitly.
test('three bounded P8 probes, one attempt each, no worker-reset retries',async()=>{
  test.setTimeout(480_000);
  const outcomes:boolean[]=[];
  for(const task of tasks) {
  if(infrastructureStopped || budget.totalTokens>=config.tokenCap) {
    await writeFile(`${SMOKE_DIRECTORY}/smoke-${task}-not-attempted.json`,JSON.stringify({version:SMOKE_VERSION,task,status:'not_attempted',reason:infrastructureStopped?'earlier_runner_failure_no_retry':'aggregate_token_allowance_exhausted'})+'\n',{flag:'wx'});
    outcomes.push(false);
    continue;
  }
  await writeFile(`${SMOKE_DIRECTORY}/smoke-${task}-started.json`,JSON.stringify({task,startedAt:new Date().toISOString()})+'\n',{flag:'wx'});
  const timeLimitSeconds=task==='T1'?150:task==='T2'?90:60;
  const stepLimit=task==='T1'?22:task==='T2'?10:3;
  const prompt=`You are P8, a nontechnical first-time user. Use only the interface or explicitly supplied read-only verifier. No reviewer authority. Do not claim repair, reduced emissions, human approval or live observations. This is a limited diagnostic subtask, not the full original r12 task.\n${smokeAssignments[task]}\nReturn exactly this output schema through submit_result. Do not invent values you cannot inspect; abstain instead.\n${JSON.stringify(smokeSchema(task))}`;
  const attempt=await runCodexTaskAgent({config,prompt,stepLimit,timeLimitSeconds,budget,context:{episode:{episodeId:`pre-video-P8-${task}`,pairId:'none-unpaired-smoke',personaId:'P8',taskId:task,condition:task==='T3'?'C0_MANUAL_PACKET':'C1_APPLICATION_BROWSER',sequence:1,stepLimit,timeLimitSeconds},packet:{},appOrigin:task==='T3'?null:process.env.AGENT_LAB_APP_ORIGIN!,initialPath:task==='T3'?null:task==='T1'?'/dashboard/cases?sourceId=BHR_S_003':'/dashboard/audit?sourceId=TKM_S_021',...(task==='T3'?{verificationFixture:{path:fixture,expectedDigest:TRUSTED_PIN}}:{})}});
  const result=qualifySmokeAttempt(task,attempt,observationCount);
  const {pass,genuineModelSubmission:genuine}=result;
  await writeFile(`${SMOKE_DIRECTORY}/smoke-${task}.json`,JSON.stringify({version:SMOKE_VERSION,task,attempt,...result,budgetAfter:{...budget}},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({task,pass,status:attempt.status,steps:attempt.steps,modelTurns:attempt.timing.modelCalls,tokens:attempt.timing.inputTokens===null || attempt.timing.outputTokens===null?null:attempt.timing.inputTokens+attempt.timing.outputTokens,failures:attempt.timing.failures}));
  if(!genuine || attempt.timing.failures.some(f=>f.startsWith('codex_cli_exit') || f==='codex_result_missing')) infrastructureStopped=true;
  outcomes.push(pass);
  }
  expect(outcomes).toEqual([true,true,true]);
});
