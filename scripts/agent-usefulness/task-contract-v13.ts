import { createHash } from 'node:crypto';
import { z } from '../../apps/api/node_modules/zod';
import { plannerStrategies } from '../../packages/shared/src/investigation-planner';

/** Opt-in for NEW trials only. r12 packets, gold and scorer remain immutable. */
export const TASK_CONTRACT_VERSION = 'agent-task-contract/13' as const;
const text = z.string().trim().min(1).max(8000);
const ids = z.array(z.string().min(1).max(96)).min(1).max(100).refine(value => new Set(value).size === value.length);
const active = z.object({ capacity:z.number().int().min(1).max(100), sourceIds:ids }).strict();
export const taskOutputSchemas = {
  T1:z.object({selectedStrategy:z.enum(plannerStrategies),selectedSourceIds:ids,includedRationale:text,excludedRationale:text,
    activationStateBeforeCapacityChange:active,
    activationStateAfterCapacityChange:active.extend({editedCapacity:z.number().int().min(1).max(100),replacementActivated:z.literal(false)})}).strict(),
  T2:z.object({sourceId:text,claimType:z.enum(['source_detected','operator_notified','mitigation_confirmed']),claimText:z.string().min(1).max(8000),
    claimTextSha256:z.string().regex(/^[a-f0-9]{64}$/),scope:z.object({startDate:text,endDate:text,recipient:text.optional(),observationId:text.optional()}).strict(),
    verdict:z.enum(['supported','contradicted','insufficient_evidence']),limitations:z.array(text).min(1).max(30),
    requestedEvidence:z.array(text).min(1).max(30),requestedEvidenceRequirementIds:z.array(text).min(1).max(30),whyNeeded:text,
    acceptanceCriteria:z.array(text).min(1).max(30),ownerRole:text,dueDateOrReasonUnset:text,
    references:z.array(z.object({reference:text,locator:text}).strict()).min(1).max(30)}).strict().refine(value =>
      createHash('sha256').update(value.claimText).digest('hex') === value.claimTextSha256,{message:'claimTextSha256 must match the exact claim text'}),
  T3:z.object({workId:text,decisionDigest:z.string().regex(/^0x[a-f0-9]{64}$/),disposition:z.enum(['accept_assessment','request_more_evidence','reject_assessment']),rationale:text,
    revisitState:text,revisitReasonCodes:z.array(text).max(30),historicalDecisionUnchanged:z.literal(true),verificationValid:z.literal(true),physicalOutcomeEstablished:z.literal(false)}).strict(),
};
export type TaskContract = {
  version:typeof TASK_CONTRACT_VERSION;
  taskId:keyof typeof taskOutputSchemas;
  advertisedOutputFields:string[];
  availableOperations:string[];
  seededDecisionDigest?:string;
  trustedDigest?:string;
  reviewerAuthorityChecked?:boolean;
};
const operations = {T1:['inspect_plan','activate_plan','edit_capacity'],T2:['inspect_evidence'],T3:['inspect_dossier','review_decision','append_response','export_decision','verify_export']} as const;
export function taskOutputJsonSchema(task:TaskContract['taskId']) {
  return z.toJSONSchema(taskOutputSchemas[task]);
}
export function taskContractFields(task:TaskContract['taskId']) {
  return Object.keys(taskOutputJsonSchema(task).properties || {});
}
/** Called BEFORE starting a new paid/provider process. Capability declarations
 * are an operator setup contract, not evidence that an agent used those tools. */
export function taskContractProblems(contract:TaskContract):string[] {
  if(contract.version !== TASK_CONTRACT_VERSION || !Object.hasOwn(taskOutputSchemas,contract.taskId)) return ['unsupported_task_contract'];
  const missing = taskContractFields(contract.taskId).filter(field => !contract.advertisedOutputFields.includes(field)).map(field => `unadvertised_scored_field:${field}`);
  for(const operation of operations[contract.taskId]) if(!contract.availableOperations.includes(operation)) missing.push(`unavailable_operation:${operation}`);
  if(contract.taskId === 'T3') {
    if(!/^0x[a-f0-9]{64}$/.test(contract.trustedDigest || '')) missing.push('trusted_digest_unavailable');
    if(contract.seededDecisionDigest !== contract.trustedDigest) missing.push('seeded_decision_mismatch');
    if(contract.reviewerAuthorityChecked !== true) missing.push('reviewer_authority_unavailable');
  }
  return missing;
}
export function validTaskOutput(contract:TaskContract,output:unknown):boolean {
  if(taskContractProblems(contract).length) return false;
  const result = taskOutputSchemas[contract.taskId].safeParse(output);
  if(!result.success) return false;
  if(contract.taskId === 'T3' && (result.data as {decisionDigest?:string}).decisionDigest !== contract.trustedDigest) return false;
  if(contract.taskId === 'T1') {
    const value = result.data as z.infer<typeof taskOutputSchemas.T1>;
    const before = value.activationStateBeforeCapacityChange, after = value.activationStateAfterCapacityChange;
    const same = (left:string[],right:string[]) => left.length === right.length && left.every(id => right.includes(id));
    return before.capacity === before.sourceIds.length && after.capacity === before.capacity
      && same(value.selectedSourceIds,before.sourceIds) && same(before.sourceIds,after.sourceIds);
  }
  return true;
}
