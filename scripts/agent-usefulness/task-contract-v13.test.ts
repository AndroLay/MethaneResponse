import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { TASK_CONTRACT_VERSION, taskContractFields, taskContractProblems, taskOutputJsonSchema, validTaskOutput, type TaskContract } from './task-contract-v13';
import { runCodexTaskAgent } from './codex-cli-runner';
import { parseRunnerConfig } from './runner-config';

function ready(taskId:TaskContract['taskId']):TaskContract {
  return {version:TASK_CONTRACT_VERSION,taskId,advertisedOutputFields:taskContractFields(taskId),
    availableOperations:['inspect_plan','activate_plan','edit_capacity','inspect_evidence','inspect_dossier','review_decision','append_response','export_decision','verify_export'],
    trustedDigest:'0x'+'a'.repeat(64),seededDecisionDigest:'0x'+'a'.repeat(64),reviewerAuthorityChecked:true};
}

test('r12 T2 mismatch is detected before a trial; the new contract advertises every checked field',async () => {
  const packet = JSON.parse(await readFile('docs/evidence/agent-practical-usefulness-2026-10-21-r12/scenarios/T2-investigate-request-packet.json','utf8'));
  const problems = taskContractProblems({...ready('T2'),advertisedOutputFields:packet.requiredOutputFields});
  expect(problems).toContain('unadvertised_scored_field:claimTextSha256');
  expect(problems).toContain('unadvertised_scored_field:requestedEvidenceRequirementIds');
  expect(taskContractProblems(ready('T2'))).toEqual([]);
  expect(taskOutputJsonSchema('T2').required).toContain('claimTextSha256');
  expect(taskOutputJsonSchema('T2').properties?.references).toHaveProperty('type','array');
});

test('T1 cannot request runtime activation from the old read-only manual packet',() => {
  const contract = {...ready('T1'),availableOperations:['inspect_plan']};
  expect(taskContractProblems(contract)).toEqual(['unavailable_operation:activate_plan','unavailable_operation:edit_capacity']);
});

test('T3 requires seeded exact decision, scoped reviewer and executable export verification',() => {
  const contract = {...ready('T3'),availableOperations:['inspect_dossier'],seededDecisionDigest:undefined,reviewerAuthorityChecked:false};
  const problems = taskContractProblems(contract);
  expect(problems).toContain('seeded_decision_mismatch');
  expect(problems).toContain('reviewer_authority_unavailable');
  expect(problems).toContain('unavailable_operation:verify_export');
  expect(taskContractProblems({...ready('T3'),trustedDigest:undefined})).toContain('trusted_digest_unavailable');
});

test('impossible contract exits before starting a provider process or charging the shared budget',async () => {
  const budget = {totalTokens:0,providerCalls:0,costUsd:0};
  const attempt = await runCodexTaskAgent({config:parseRunnerConfig({AGENT_LAB_PROFILE:'codex-cli-gpt-6-luna-max',AGENT_LAB_CODEX_VERSION:'0.160.0'}),
    prompt:'DEMO new protocol preflight only',stepLimit:1,timeLimitSeconds:1,budget,
    context:{episode:{episodeId:'DEMO-preflight',pairId:'DEMO',personaId:'P8',taskId:'T3',condition:'C1_APPLICATION_BROWSER',sequence:1,stepLimit:1,timeLimitSeconds:1},packet:{},appOrigin:null,initialPath:null,
      taskContract:{...ready('T3'),availableOperations:[],reviewerAuthorityChecked:false}}});
  expect(attempt.status).toBe('failed'); expect(attempt.timing.failures).toContain('task_contract_not_ready');
  expect(attempt.execution?.providerProcessStarted).toBe(false); expect(attempt.timing.modelCalls).toBe(0);
  expect(budget).toEqual({totalTokens:0,providerCalls:0,costUsd:0});
});

test('new T2 JSON format retains real omissions; matching abstention alone is insufficient',() => {
  const claimText = 'DEMO claim; no physical outcome established.';
  const output = {sourceId:'DEMO-SOURCE',claimType:'mitigation_confirmed',claimText,claimTextSha256:createHash('sha256').update(claimText).digest('hex'),scope:{startDate:'2026-06-01',endDate:'2026-07-31'},
    verdict:'insufficient_evidence',limitations:['DEMO only'],requestedEvidence:['Source-specific dated measurement'],requestedEvidenceRequirementIds:['post_action_measurement'],whyNeeded:'An administrative response is not a measurement.',
    acceptanceCriteria:['Same source and review period'],ownerRole:'operator',dueDateOrReasonUnset:'Unset; not agreed by operator',references:[{reference:'fixture://DEMO/administrative',locator:'DEMO excerpt paragraph 1'}]};
  expect(validTaskOutput(ready('T2'),output)).toBe(true);
  expect(validTaskOutput(ready('T2'),{...output,claimTextSha256:undefined})).toBe(false);
  expect(validTaskOutput(ready('T2'),{...output,requestedEvidenceRequirementIds:undefined})).toBe(false);
  expect(validTaskOutput(ready('T2'),{...output,references:[]})).toBe(false);
  expect(validTaskOutput(ready('T2'),{...output,claimText:claimText+' altered'})).toBe(false);
  expect(validTaskOutput(ready('T2'),{...output,verdict:'abstain'})).toBe(false);
  expect(validTaskOutput(ready('T2'),{...output,physicalOutcomeEstablished:true})).toBe(false);
});

test('T1 exact observed membership is preserved; duplicates and silent replacement are rejected',() => {
  const output = {selectedStrategy:'weighted',selectedSourceIds:['DEMO-A','DEMO-B'],includedRationale:'DEMO included due to available quota',excludedRationale:'DEMO excluded due to filled quota',
    activationStateBeforeCapacityChange:{capacity:2,sourceIds:['DEMO-A','DEMO-B']},activationStateAfterCapacityChange:{capacity:2,sourceIds:['DEMO-A','DEMO-B'],editedCapacity:4,replacementActivated:false}};
  expect(validTaskOutput(ready('T1'),output)).toBe(true);
  expect(validTaskOutput(ready('T1'),{...output,selectedSourceIds:['DEMO-A','DEMO-A']})).toBe(false);
  expect(validTaskOutput(ready('T1'),{...output,activationStateAfterCapacityChange:{...output.activationStateAfterCapacityChange,sourceIds:['DEMO-A','DEMO-C']}})).toBe(false);
  expect(validTaskOutput(ready('T1'),{...output,activationStateAfterCapacityChange:{...output.activationStateAfterCapacityChange,replacementActivated:true}})).toBe(false);
});

test('T3 does not accept a digest supplied by an altered export or a physical-outcome claim',() => {
  const output = {workId:'DEMO',decisionDigest:ready('T3').trustedDigest,disposition:'request_more_evidence',rationale:'DEMO response needs attributable follow-up',revisitState:'review_recommended',revisitReasonCodes:['new_authorized_response'],historicalDecisionUnchanged:true,verificationValid:true,physicalOutcomeEstablished:false};
  expect(validTaskOutput(ready('T3'),output)).toBe(true);
  expect(validTaskOutput(ready('T3'),{...output,decisionDigest:'0x'+'b'.repeat(64)})).toBe(false);
  expect(validTaskOutput(ready('T3'),{...output,verificationValid:false})).toBe(false);
  expect(validTaskOutput(ready('T3'),{...output,physicalOutcomeEstablished:true})).toBe(false);
});
