import { scoreEpisode, type Episode, type GoldSet, type RunRecord } from './scorer';

/** Alternative retrospective interpretation. Never replaces frozen scorer/3. */
export const RECOVERY_SCORER_VERSION = 'agent-usefulness-recovery/4';
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export function sameSourceIds(value: unknown, expected: string[]) {
  return Array.isArray(value) && value.length === expected.length && new Set(value).size === expected.length
    && value.every(id => typeof id === 'string' && expected.includes(id));
}

export function semanticVerdict(value: unknown) {
  const text = string(value).toLowerCase();
  if (['insufficient_evidence', 'abstain', 'abstain_insufficient_evidence'].includes(text)) return 'insufficient_evidence';
  if (/^abstain\s*[—:–-]\s*(?:insufficient evidence|the supplied evidence (?:does not (?:substantiate|establish)|is insufficient))/.test(text)) return 'insufficient_evidence';
  return string(value);
}

export function recoveryScore(episode: Episode, run: RunRecord, gold: GoldSet) {
  const copy = structuredClone(run);
  const output = copy.output;
  const changes: string[] = [];
  if (output && episode.taskId === 'T1') {
    const strategy = typeof output.selectedStrategy === 'string' ? output.selectedStrategy : object(output.selectedStrategy).name;
    if (/^Weighted historical indicators(?:$| — )/.test(string(strategy))) {
      output.selectedStrategy = 'weighted'; changes.push('strategy_display_label');
    }
    for (const field of ['includedRationale', 'excludedRationale']) {
      if (output[field] && typeof output[field] === 'object' && !Array.isArray(output[field])) {
        output[field] = JSON.stringify(output[field]); changes.push(`${field}_structured_text`);
      }
    }
    // Only application observations can establish runtime activation. Never infer
    // activation from a manual hypothetical or from the strategy label alone.
    const before = object(output.activationStateBeforeCapacityChange);
    const after = object(output.activationStateAfterCapacityChange);
    const beforeIds = before.selectedSourceIds ?? before.activeSourceIds;
    const afterIds = after.activeSourceIds ?? after.selectedSourceIds;
    const beforeCapacity = before.capacity ?? before.activeCapacity ?? before.activePlanCapacity;
    const beforeActive = before.active === true || ['active', 'Active plan'].includes(string(before.state ?? before.status));
    const afterCapacity = after.activePlanCapacity ?? after.activeCapacity;
    const editedCapacity = after.plannerInputCapacity ?? after.plannerCapacityInput ?? after.editableCapacity ?? after.editedCapacity ?? after.capacityInputSetTo;
    const unchanged = after.activePlanSourceIdsUnchanged === true
      || /unchanged|same active plan/i.test(string(after.state) + string(after.status));
    const nonReplacement = after.automaticallyReplaced === false || after.automaticReplacement === false || after.replacementActivated === false
      || /no replacement activated/i.test(string(after.status));
    const contradiction = [after.automaticallyReplaced, after.automaticReplacement, after.replacementActivated].some(value => value === true)
      || before.active === false || after.active === false || after.activePlanRemains === false;
    if (episode.condition === 'C1_APPLICATION_BROWSER' && sameSourceIds(output.selectedSourceIds, gold.T1.selectedSourceIds)
      && beforeActive && beforeCapacity === 10 && sameSourceIds(beforeIds, gold.T1.selectedSourceIds)
      && afterCapacity === 10 && editedCapacity === 20 && nonReplacement && !contradiction
      && (afterIds !== undefined ? sameSourceIds(afterIds, gold.T1.selectedSourceIds) : unchanged)) {
      output.activationStateBeforeCapacityChange = 'active_capacity_10';
      output.activationStateAfterCapacityChange = 'active_capacity_10';
      changes.push('observed_structured_active_plan_state');
    }
  }
  if (output && episode.taskId === 'T2') {
    const verdict = semanticVerdict(output.verdict);
    if (verdict !== output.verdict) { output.verdict = verdict; changes.push('bounded_abstention_alias'); }
    // No missing hash, requirement ID, source, scope, request or reference is invented.
  }
  const score = scoreEpisode(episode, copy, gold);
  // scorer/3 omitted reason-code equality from T3 completion, though it checks
  // accuracy. The recovery evaluator requires both; security is not weakened.
  if (episode.taskId === 'T3') score.taskCompletion = score.taskCompletion === true && score.decisionAccuracy === true && output?.physicalOutcomeEstablished === false;
  if (score.criticalOverclaims?.length) score.taskCompletion = false;
  return { evaluatorVersion: RECOVERY_SCORER_VERSION, changes, score };
}
