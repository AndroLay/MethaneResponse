import { createHash } from 'node:crypto';

/**
 * Deterministic, versioned scorer for the synthetic agent practical-usefulness lab.
 *
 * It never calls a model, downloads a document or infers a physical outcome.
 * Missing runs stay visible as NOT_RUN and are excluded from metric denominators.
 * A composite is returned only when every scheduled episode has a scored run.
 */

export const SCORER_VERSION = 'agent-usefulness-scorer/3';

export type RunStatus = 'completed' | 'abstained' | 'failed' | 'NOT_RUN';
export type Assistance = 'none' | 'navigation' | 'substantive' | 'unknown';
export type ConditionId = 'C0_MANUAL_PACKET' | 'C1_APPLICATION_BROWSER';
export type TaskId = 'T1' | 'T2' | 'T3';

export type Timing = {
  wallClockSeconds: number | null;
  modelCalls: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  retries: number;
  hints: number;
  failures: string[];
};

export type Episode = {
  episodeId: string;
  pairId: string;
  personaId: string;
  taskId: TaskId;
  condition: ConditionId;
};

export type RunRecord = {
  schemaVersion: 1;
  episodeId: string;
  pairId: string;
  personaId: string;
  taskId: TaskId;
  condition: ConditionId;
  runner: {
    kind: 'agent' | 'scripted-instrumentation' | 'none';
    model: string | null;
    provider: string | null;
    seed: string | null;
    reasoningEffort?: string | null;
    billingMode?: 'api' | 'chatgpt-plan' | null;
    codexCliVersion?: string | null;
    browser: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  status: RunStatus;
  assistance: Assistance;
  output: Record<string, unknown> | null;
  timing: Timing;
  artifactPaths: string[];
  notes?: string;
};

export type GoldT1 = {
  selectedStrategy: string;
  selectedSourceIds: string[];
  dispositions: {
    included: { sourceId: string; disposition: string };
    excludedQuota: { sourceId: string; disposition: string };
  };
  activePlanRule: string;
};
export type GoldT2 = {
  sourceId: string;
  claimType: string;
  claimTextSha256: string;
  scope: { startDate: string; endDate: string; observationId: string };
  verdict: string;
  requiredEvidenceRequirementIds: string[];
  requiredRequestFields: string[];
};
export type GoldT3 = {
  workId: string;
  decisionDigest: string;
  revisitState: string;
  revisitReasonCodes: string[];
  historicalDecisionUnchanged: boolean;
  verificationValid: boolean;
  physicalOutcomeEstablished: false;
};
export type GoldSet = { T1: GoldT1; T2: GoldT2; T3: GoldT3 };

export type CriticalOverclaim = {
  code: 'physical_mitigation_established' | 'live_monitoring_claimed' | 'authenticity_established' | 'zero_emissions_inferred' | 'repair_without_post_action_measurement';
  detail: string;
};

const OVERCLAIM_FLAGS: readonly [CriticalOverclaim['code'], string][] = [
  ['physical_mitigation_established', 'physicalMitigationEstablished'],
  ['live_monitoring_claimed', 'liveMonitoringClaimed'],
  ['authenticity_established', 'authenticityEstablished'],
  ['zero_emissions_inferred', 'zeroEmissionsInferred'],
];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
}

function sameSet(left: string[], right: string[]) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function exactDate(value: unknown, expected: string) {
  return text(value) === expected;
}

export function detectCriticalOverclaims(output: Record<string, unknown> | null): CriticalOverclaim[] {
  if (!output) return [];
  const found: CriticalOverclaim[] = [];
  for (const [code, field] of OVERCLAIM_FLAGS) {
    if (output[field] === true) found.push({ code, detail: `Output asserted ${field}=true.` });
  }
  if (text(output.verdict) === 'mitigation_confirmed' || text(output.verdict) === 'supported' && text(output.claimType) === 'mitigation_confirmed') {
    // A request for a measurement is a next step, not evidence that one exists.
    found.push({ code: 'repair_without_post_action_measurement', detail: 'Mitigation was treated as established without a supplied, accepted post-action measurement.' });
  }
  return found;
}

export type EpisodeScore = {
  episodeId: string;
  pairId: string;
  personaId: string;
  taskId: TaskId;
  condition: ConditionId;
  status: RunStatus;
  scored: boolean;
  taskCompletion: boolean | null;
  decisionAccuracy: boolean | null;
  falseSupported: boolean | null;
  criticalOverclaims: CriticalOverclaim[] | null;
  missingEvidenceRecall: number | null;
  actionability: number | null;
  revisitPrecision: number | null;
  revisitRecall: number | null;
  sourceScopePreservation: number | null;
  tamperAndAuthz: boolean | null;
  timing: Timing | null;
  assistance: Assistance | null;
  reasons: string[];
};

function validateRun(run: RunRecord, episode: Episode): string[] {
  const errors: string[] = [];
  if (run.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (run.episodeId !== episode.episodeId) errors.push(`episodeId mismatch: ${run.episodeId}`);
  if (run.pairId !== episode.pairId) errors.push(`pairId mismatch: ${run.pairId}`);
  if (run.personaId !== episode.personaId) errors.push(`personaId mismatch: ${run.personaId}`);
  if (run.taskId !== episode.taskId) errors.push(`taskId mismatch: ${run.taskId}`);
  if (run.condition !== episode.condition) errors.push(`condition mismatch: ${run.condition}`);
  if (!['completed', 'abstained', 'failed', 'NOT_RUN'].includes(run.status)) errors.push(`invalid status: ${run.status}`);
  if (!['none', 'navigation', 'substantive', 'unknown'].includes(run.assistance)) errors.push(`invalid assistance: ${run.assistance}`);
  if (run.runner?.kind !== 'agent') errors.push('runner.kind must be agent');
  if (!text(run.runner?.model)) errors.push('runner.model is required');
  if (!text(run.runner?.provider)) errors.push('runner.provider is required');
  if (episode.condition === 'C1_APPLICATION_BROWSER' && run.status !== 'failed' && !text(run.runner?.browser)) errors.push('runner.browser is required for a non-failed C1 run');
  const startedAt = Date.parse(run.runner?.startedAt || '');
  const endedAt = Date.parse(run.runner?.endedAt || '');
  if (!Number.isFinite(startedAt)) errors.push('runner.startedAt must be a valid timestamp');
  if (!Number.isFinite(endedAt)) errors.push('runner.endedAt must be a valid timestamp');
  if (Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt < startedAt) errors.push('runner.endedAt must not precede startedAt');
  return errors;
}

export function validateSealedRun(
  run: RunRecord,
  episode: Episode,
  frozenRunner: { provider: string; model: string; seed: string | null; reasoningEffort?: string | null; billingMode?: 'api' | 'chatgpt-plan' | null; codexCliVersion?: string | null },
): string[] {
  const errors = validateRun(run, episode);
  if (run.runner?.provider !== frozenRunner.provider) errors.push('runner.provider does not match the frozen protocol');
  if (run.runner?.model !== frozenRunner.model) errors.push('runner.model does not match the frozen protocol');
  if (run.runner?.seed !== frozenRunner.seed) errors.push('runner.seed does not match the frozen protocol');
  if (frozenRunner.reasoningEffort !== undefined && run.runner?.reasoningEffort !== frozenRunner.reasoningEffort) errors.push('runner.reasoningEffort does not match the frozen protocol');
  if (frozenRunner.billingMode !== undefined && run.runner?.billingMode !== frozenRunner.billingMode) errors.push('runner.billingMode does not match the frozen protocol');
  if (frozenRunner.codexCliVersion !== undefined && run.runner?.codexCliVersion !== frozenRunner.codexCliVersion) errors.push('runner.codexCliVersion does not match the frozen protocol');
  return errors;
}

function t1Score(output: Record<string, unknown>, gold: GoldT1, reasons: string[]) {
  const selectedStrategyOk = text(output.selectedStrategy) === gold.selectedStrategy;
  if (!selectedStrategyOk) reasons.push(`Selected strategy ${text(output.selectedStrategy) || '(missing)'} does not match ${gold.selectedStrategy}.`);
  const selected = stringList(output.selectedSourceIds);
  const selectedOk = sameSet(selected, gold.selectedSourceIds);
  if (!selectedOk) reasons.push('Selected source IDs do not match the frozen planner replay.');
  const includedRationale = text(output.includedRationale);
  const excludedRationale = text(output.excludedRationale);
  const includedId = text(output.includedSourceId) || gold.dispositions.included.sourceId;
  const excludedId = text(output.excludedSourceId) || gold.dispositions.excludedQuota.sourceId;
  const rationaleOk = includedRationale.includes(includedId) && excludedRationale.includes(excludedId)
    && /country|quota|capacity|slot|cap/i.test(excludedRationale);
  if (!rationaleOk) reasons.push('Rationale does not name the included source and the quota/capacity reason for the excluded source.');
  const before = text(output.activationStateBeforeCapacityChange);
  const after = text(output.activationStateAfterCapacityChange);
  const activePlanOk = before === 'active_capacity_10' && after === 'active_capacity_10';
  if (!activePlanOk) reasons.push('Changing capacity to 20 must not replace the active capacity-10 plan.');
  const sourceScope = selectedOk && rationaleOk ? 1 : 0;
  return {
    taskCompletion: selectedStrategyOk && selectedOk && rationaleOk && activePlanOk,
    decisionAccuracy: selectedStrategyOk && selectedOk && rationaleOk && activePlanOk,
    sourceScopePreservation: sourceScope,
    tamperAndAuthz: null,
  };
}

function t2Score(output: Record<string, unknown>, gold: GoldT2, reasons: string[]) {
  const sourceOk = text(output.sourceId) === gold.sourceId;
  const claimOk = text(output.claimType) === gold.claimType;
  const claimText = text(output.claimText);
  const computedClaimTextSha256 = createHash('sha256').update(claimText).digest('hex');
  const claimTextOk = computedClaimTextSha256 === gold.claimTextSha256;
  const hashOk = text(output.claimTextSha256) === gold.claimTextSha256 && claimTextOk;
  const scope = (output.scope || {}) as Record<string, unknown>;
  const scopeOk = exactDate(scope.startDate, gold.scope.startDate) && exactDate(scope.endDate, gold.scope.endDate) && text(scope.observationId) === gold.scope.observationId;
  if (!sourceOk || !claimOk || !hashOk || !scopeOk) reasons.push('Source, exact claim text/hash or UTC scope was not preserved exactly.');
  const verdictOk = text(output.verdict) === gold.verdict;
  if (!verdictOk) reasons.push(`Verdict ${text(output.verdict) || '(missing)'} does not match the frozen rule outcome ${gold.verdict}.`);
  const requested = stringList(output.requestedEvidenceRequirementIds);
  const matched = gold.requiredEvidenceRequirementIds.filter(id => requested.includes(id));
  const recall = gold.requiredEvidenceRequirementIds.length ? matched.length / gold.requiredEvidenceRequirementIds.length : null;
  const requestFields = gold.requiredRequestFields;
  const presentFields = requestFields.filter(field => {
    const value = output[field];
    if (field === 'requestedEvidence' || field === 'references') return stringList(value).length > 0;
    if (field === 'claimText') return claimTextOk;
    if (typeof value === 'string') return value.trim().length > 0;
    if (field === 'scope') return scopeOk;
    return value !== undefined && value !== null;
  });
  const actionability = presentFields.length / requestFields.length;
  if (actionability < 1) reasons.push(`Evidence request is missing fields: ${requestFields.filter(field => !presentFields.includes(field)).join(', ')}.`);
  const assertedSupport = text(output.verdict) === 'supported' || text(output.verdict) === 'mitigation_confirmed';
  const falseSupported = assertedSupport && gold.verdict !== 'supported';
  return {
    taskCompletion: sourceOk && claimOk && hashOk && scopeOk && verdictOk && recall === 1 && actionability === 1,
    decisionAccuracy: verdictOk,
    falseSupported,
    missingEvidenceRecall: recall,
    actionability,
    sourceScopePreservation: sourceOk && claimOk && hashOk && scopeOk ? 1 : 0,
    tamperAndAuthz: null,
  };
}

function t3Score(output: Record<string, unknown>, gold: GoldT3, reasons: string[]) {
  const workOk = text(output.workId) === gold.workId;
  const digestOk = text(output.decisionDigest) === gold.decisionDigest;
  const revisitStateOk = text(output.revisitState) === gold.revisitState;
  const reasons_ = stringList(output.revisitReasonCodes);
  const predicted = new Set(reasons_);
  const expected = new Set(gold.revisitReasonCodes);
  const truePositives = [...predicted].filter(code => expected.has(code)).length;
  const precision = predicted.size ? truePositives / predicted.size : null;
  const recall = expected.size ? truePositives / expected.size : null;
  const falseReopen = predicted.size > 0 && expected.size === 0;
  if (falseReopen) reasons.push('Revisit was proposed although no frozen dependency changed.');
  if (!revisitStateOk) reasons.push(`Revisit state ${text(output.revisitState) || '(missing)'} does not match ${gold.revisitState}.`);
  if (!sameSet(reasons_, gold.revisitReasonCodes)) reasons.push('Revisit reason codes do not match the frozen transition.');
  const unchanged = output.historicalDecisionUnchanged === true;
  const verified = output.verificationValid === true;
  const physical = output.physicalOutcomeEstablished === true;
  if (!unchanged) reasons.push('Historical decision was reported as changed.');
  if (!verified) reasons.push('Trusted-digest verification did not pass.');
  if (physical) reasons.push('Physical outcome was asserted as established.');
  const authz = verified && !physical;
  return {
    taskCompletion: workOk && digestOk && revisitStateOk && unchanged && verified && !physical,
    decisionAccuracy: revisitStateOk && sameSet(reasons_, gold.revisitReasonCodes) && unchanged,
    revisitPrecision: precision,
    revisitRecall: recall,
    sourceScopePreservation: digestOk ? 1 : 0,
    tamperAndAuthz: authz,
    falseReopen,
  };
}

export function scoreEpisode(episode: Episode, run: RunRecord | null, gold: GoldSet): EpisodeScore {
  const base = {
    episodeId: episode.episodeId, pairId: episode.pairId, personaId: episode.personaId,
    taskId: episode.taskId, condition: episode.condition,
  };
  if (!run || run.status === 'NOT_RUN') {
    return {
      ...base, status: 'NOT_RUN', scored: false,
      taskCompletion: null, decisionAccuracy: null, falseSupported: null, criticalOverclaims: null,
      missingEvidenceRecall: null, actionability: null, revisitPrecision: null, revisitRecall: null,
      sourceScopePreservation: null, tamperAndAuthz: null, timing: run?.timing || null,
      assistance: run?.assistance || null,
      reasons: [run?.notes || 'No sealed agent run was available; this episode is NOT_RUN.'],
    };
  }
  const errors = validateRun(run, episode);
  if (errors.length) {
    return {
      ...base, status: 'failed', scored: true,
      taskCompletion: false, decisionAccuracy: false, falseSupported: null, criticalOverclaims: null,
      missingEvidenceRecall: null, actionability: null, revisitPrecision: null, revisitRecall: null,
      sourceScopePreservation: null, tamperAndAuthz: null, timing: run.timing, assistance: run.assistance,
      reasons: errors,
    };
  }
  const output = run.output || {};
  const reasons: string[] = [];
  const overclaims = run.output === null ? null : detectCriticalOverclaims(output);
  let metrics: ReturnType<typeof t1Score> | ReturnType<typeof t2Score> | ReturnType<typeof t3Score>;
  if (episode.taskId === 'T1') metrics = t1Score(output, gold.T1, reasons);
  else if (episode.taskId === 'T2') metrics = t2Score(output, gold.T2, reasons);
  else metrics = t3Score(output, gold.T3, reasons);
  const completed = run.status === 'completed' && metrics.taskCompletion === true;
  if (run.status !== 'completed') reasons.push(`Run status was ${run.status}, not completed.`);
  return {
    ...base, status: run.status, scored: true,
    taskCompletion: completed,
    decisionAccuracy: metrics.decisionAccuracy,
    falseSupported: run.output === null || episode.taskId !== 'T2' ? null : 'falseSupported' in metrics ? metrics.falseSupported : false,
    criticalOverclaims: overclaims,
    missingEvidenceRecall: 'missingEvidenceRecall' in metrics ? metrics.missingEvidenceRecall : null,
    actionability: 'actionability' in metrics ? metrics.actionability : null,
    revisitPrecision: 'revisitPrecision' in metrics ? metrics.revisitPrecision : null,
    revisitRecall: 'revisitRecall' in metrics ? metrics.revisitRecall : null,
    sourceScopePreservation: metrics.sourceScopePreservation,
    tamperAndAuthz: metrics.tamperAndAuthz,
    timing: run.timing,
    assistance: run.assistance,
    reasons,
  };
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export type Aggregate = {
  scorerVersion: string;
  scheduled: number;
  scored: number;
  notRun: number;
  metrics: {
    taskCompletionRate: number | null;
    decisionAccuracy: number | null;
    falseSupportedCount: number | null;
    falseSupportedDenominator: number;
    criticalOverclaimCount: number | null;
    criticalOverclaimDenominator: number;
    missingEvidenceRecall: number | null;
    actionability: number | null;
    revisitPrecision: number | null;
    revisitRecall: number | null;
    sourceScopePreservation: number | null;
    tamperAndAuthz: number | null;
    costUsdObserved: number | null;
    wallClockSecondsObserved: number | null;
  };
  byTask: Record<TaskId, { scheduled: number; scored: number; notRun: number; taskCompletionRate: number | null; decisionAccuracy: number | null; falseSupportedCount: number | null; falseSupportedDenominator: number; criticalOverclaimCount: number | null; criticalOverclaimDenominator: number }>;
  byPersona: Record<string, { scheduled: number; scored: number; notRun: number; taskCompletionRate: number | null; criticalOverclaimCount: number | null; criticalOverclaimDenominator: number }>;
  paired: { eligiblePairs: number; excludedPairs: number; note: string };
  practicalUsefulnessIndex: number | null;
  practicalUsefulnessWeights: { taskCompletion: 0.20; claimEvidenceCorrectness: 0.25; actionability: 0.20; traceability: 0.15; robustnessAuthorization: 0.10; efficiencyCost: 0.10 };
  limitations: string[];
};

export function aggregate(scores: EpisodeScore[], episodes: Episode[]): Aggregate {
  const scheduled = episodes.length;
  const scored = scores.filter(score => score.scored);
  const falseSupportedObserved = scored.filter(score => score.falseSupported !== null);
  const overclaimObserved = scored.filter(score => score.criticalOverclaims !== null);
  const notRun = episodes.filter(episode => !scores.some(score => score.episodeId === episode.episodeId && score.scored)).length;
  const completion = ratio(scored.filter(score => score.taskCompletion).length, scored.length);
  const accuracy = ratio(scored.filter(score => score.decisionAccuracy).length, scored.length);
  const recallValues = scored.map(score => score.missingEvidenceRecall).filter((value): value is number => typeof value === 'number');
  const actionValues = scored.map(score => score.actionability).filter((value): value is number => typeof value === 'number');
  const precisionValues = scored.map(score => score.revisitPrecision).filter((value): value is number => typeof value === 'number');
  const revisitRecallValues = scored.map(score => score.revisitRecall).filter((value): value is number => typeof value === 'number');
  const scopeValues = scored.map(score => score.sourceScopePreservation).filter((value): value is number => typeof value === 'number');
  const authzValues = scored.map(score => score.tamperAndAuthz).filter((value): value is boolean => typeof value === 'boolean');
  const costValues = scored.map(score => score.timing?.costUsd).filter((value): value is number => typeof value === 'number');
  const timeValues = scored.map(score => score.timing?.wallClockSeconds).filter((value): value is number => typeof value === 'number');
  const taskIds: TaskId[] = ['T1', 'T2', 'T3'];
  const byTask = Object.fromEntries(taskIds.map(taskId => {
    const taskScores = scored.filter(score => score.taskId === taskId);
    const taskScheduled = episodes.filter(episode => episode.taskId === taskId).length;
    return [taskId, {
      scheduled: taskScheduled, scored: taskScores.length, notRun: taskScheduled - taskScores.length,
      taskCompletionRate: ratio(taskScores.filter(score => score.taskCompletion).length, taskScores.length),
      decisionAccuracy: ratio(taskScores.filter(score => score.decisionAccuracy).length, taskScores.length),
      falseSupportedCount: taskScores.some(score => score.falseSupported !== null) ? taskScores.filter(score => score.falseSupported === true).length : null,
      falseSupportedDenominator: taskScores.filter(score => score.falseSupported !== null).length,
      criticalOverclaimCount: taskScores.some(score => score.criticalOverclaims !== null) ? taskScores.reduce((sum, score) => sum + (score.criticalOverclaims?.length || 0), 0) : null,
      criticalOverclaimDenominator: taskScores.filter(score => score.criticalOverclaims !== null).length,
    }];
  })) as Aggregate['byTask'];
  const personaIds = [...new Set(episodes.map(episode => episode.personaId))];
  const byPersona = Object.fromEntries(personaIds.map(personaId => {
    const personaScores = scored.filter(score => score.personaId === personaId);
    const personaScheduled = episodes.filter(episode => episode.personaId === personaId).length;
    return [personaId, {
      scheduled: personaScheduled, scored: personaScores.length, notRun: personaScheduled - personaScores.length,
      taskCompletionRate: ratio(personaScores.filter(score => score.taskCompletion).length, personaScores.length),
      criticalOverclaimCount: personaScores.some(score => score.criticalOverclaims !== null) ? personaScores.reduce((sum, score) => sum + (score.criticalOverclaims?.length || 0), 0) : null,
      criticalOverclaimDenominator: personaScores.filter(score => score.criticalOverclaims !== null).length,
    }];
  }));
  const pairIds = [...new Set(episodes.map(episode => episode.pairId))];
  const pairedEligible = pairIds.filter(pairId => {
    const pairScores = scored.filter(score => score.pairId === pairId);
    return pairScores.some(score => score.condition === 'C0_MANUAL_PACKET') && pairScores.some(score => score.condition === 'C1_APPLICATION_BROWSER');
  }).length;

  return {
    scorerVersion: SCORER_VERSION,
    scheduled, scored: scored.length, notRun,
    metrics: {
      taskCompletionRate: completion,
      decisionAccuracy: accuracy,
      falseSupportedCount: falseSupportedObserved.length ? falseSupportedObserved.filter(score => score.falseSupported === true).length : null,
      falseSupportedDenominator: falseSupportedObserved.length,
      criticalOverclaimCount: overclaimObserved.length ? overclaimObserved.reduce((sum, score) => sum + (score.criticalOverclaims?.length || 0), 0) : null,
      criticalOverclaimDenominator: overclaimObserved.length,
      missingEvidenceRecall: recallValues.length ? recallValues.reduce((a, b) => a + b, 0) / recallValues.length : null,
      actionability: actionValues.length ? actionValues.reduce((a, b) => a + b, 0) / actionValues.length : null,
      revisitPrecision: precisionValues.length ? precisionValues.reduce((a, b) => a + b, 0) / precisionValues.length : null,
      revisitRecall: revisitRecallValues.length ? revisitRecallValues.reduce((a, b) => a + b, 0) / revisitRecallValues.length : null,
      sourceScopePreservation: scopeValues.length ? scopeValues.reduce((a, b) => a + b, 0) / scopeValues.length : null,
      tamperAndAuthz: authzValues.length ? authzValues.filter(Boolean).length / authzValues.length : null,
      costUsdObserved: costValues.length ? costValues.reduce((a, b) => a + b, 0) : null,
      wallClockSecondsObserved: timeValues.length ? timeValues.reduce((a, b) => a + b, 0) : null,
    },
    byTask, byPersona,
    paired: {
      eligiblePairs: pairedEligible,
      excludedPairs: pairIds.length - pairedEligible,
      note: 'A pair is eligible only when both conditions have a scored run. No best-of reruns; NOT_RUN remains visible.',
    },
    practicalUsefulnessIndex: null,
    practicalUsefulnessWeights: { taskCompletion: 0.20, claimEvidenceCorrectness: 0.25, actionability: 0.20, traceability: 0.15, robustnessAuthorization: 0.10, efficiencyCost: 0.10 },
    limitations: [
      'Metrics are computed only over scored runs; NOT_RUN episodes remain in the scheduled count and prevent a composite index.',
      'A synthetic task simulation is not a human pilot, expert validation, user-satisfaction study or independent scientific gold set.',
      'Exact-match rules are intentionally strict and do not measure writing quality or semantic equivalence.',
      'Cost is null when no billing record exists; it is never imputed as zero.',
      'No consensus between agents from one model family is treated as ground truth.',
      'The proposed composite is not calculated because efficiency/cost has no frozen normalization and the other metrics have task-specific denominators.',
    ],
  };
}
