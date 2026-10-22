import { z } from '../../apps/api/node_modules/zod';
import type { AgentAttempt } from './agent-loop';

/** A new, limited protocol. Never feed these outputs to the frozen r12 scorer. */
export const SMOKE_VERSION = 'pre-video-p8-smoke/2';
export const SMOKE_DIRECTORY = 'docs/evidence/pre-video-final-2026-10-21/p8-smoke-v2';
export const PLAN_IDS = ['MEX_S_003','MEX_S_007','TKM_S_021','IRN_S_075','TKM_S_047','MYS_S_001','IRN_S_065','VEN_S_008','BHR_S_003','DZA_S_011'];
export const TRUSTED_PIN = '0x7f150071975c7acf393707578f782d654bcb6b5fa18ffd3414dd6dca96af803b';
const physical = z.literal(false);
const schemas = {
  T1: z.object({activeCapacity:z.literal(10),editedCapacity:z.literal(20),activeSourceIds:z.array(z.string()).length(10),replacementActivated:z.literal(false),physicalOutcomeEstablished:physical}).strict(),
  T2: z.object({sourceId:z.literal('TKM_S_021'),historical:z.literal(true),observationCount:z.number().int().positive(),repairConfirmed:z.literal(false),nextEvidenceNeeded:z.string().min(30),physicalOutcomeEstablished:physical}).strict(),
  T3: z.object({sourceId:z.literal('TKM_S_021'),digest:z.literal(TRUSTED_PIN),verificationValid:z.literal(true),chainStatus:z.literal('NOT_VERIFIED'),physicalOutcomeEstablished:physical}).strict(),
};
export type SmokeTask = keyof typeof schemas;
export function smokeSchema(task:SmokeTask) {
  // Advertise field TYPES, never the oracle's expected values. The original
  // v1 diagnostic exposed literal outcomes; retain that protocol as transport
  // evidence only. A future trial needs a fresh directory/protocol and budget.
  const stripOracle=(value:unknown):unknown => {
    if(Array.isArray(value)) return value.map(stripOracle);
    if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='const').map(([key,item])=>[key,stripOracle(item)]));
    return value;
  };
  return stripOracle(z.toJSONSchema(schemas[task]));
}
export function scoreSmoke(task:SmokeTask, output:unknown, observationCount?:number) {
  const parsed = schemas[task].safeParse(output);
  if(!parsed.success) return {pass:false,reason:'output_schema_mismatch'};
  if(task === 'T1') {
    const ids=(parsed.data as z.infer<typeof schemas.T1>).activeSourceIds;
    if(new Set(ids).size!==10 || !PLAN_IDS.every(id=>ids.includes(id))) return {pass:false,reason:'incorrect_active_source_membership'};
  }
  if(task === 'T2' && (observationCount===undefined || (parsed.data as z.infer<typeof schemas.T2>).observationCount!==observationCount)) return {pass:false,reason:'observation_count_mismatch'};
  return {pass:true,reason:'limited_task_output_matches_oracle'};
}
export function qualifySmokeAttempt(task:SmokeTask,attempt:AgentAttempt,observationCount?:number) {
  const score=scoreSmoke(task,attempt.output,observationCount);
  const genuine=attempt.timing.modelCalls>0 && attempt.execution?.submittedThroughBridge===true;
  return {score,genuineModelSubmission:genuine,pass:attempt.status==='completed' && genuine && score.pass && attempt.timing.failures.length===0};
}
export const smokeAssignments:Record<SmokeTask,string> = {
  T1:'Using the application, compare investigation plans for 10 slots, at most 2 sources per country, all countries/sectors, and the default equal recurrence/magnitude weighting. Activate the weighted historical plan. Then edit capacity to 20 without activating a replacement. Inspect the active queue and report its actual source IDs and capacities. Do not claim a repair. No reviewer permissions are provided or required.',
  T2:'Inspect the historical UNEP MARS record TKM_S_021 in the application. Report the count of archived plume observations, whether these are historical, whether they establish confirmed repair, and one specific additional measurement/document needed to assess a mitigation claim. This is a read-only historical interpretation subtask; do not run AI, create a review or pretend to submit an evidence request.',
  T3:'Verify the operator-provisioned export with the supplied verify_export tool. Report the returned source, digest, integrity verdict and chain verification status. You are checking a previously DEMO-reviewed record, not performing a review or authenticating a human. This task provides no reviewer authority. Do not infer a physical outcome from the hash.',
};
