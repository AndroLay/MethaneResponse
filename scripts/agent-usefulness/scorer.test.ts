import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  aggregate, detectCriticalOverclaims, scoreEpisode, validateSealedRun,
  type Episode, type GoldSet, type RunRecord,
} from './scorer';

const gold: GoldSet = {
  T1: {
    selectedStrategy: 'weighted',
    selectedSourceIds: ['DZA_S_011', 'IRN_S_065'],
    dispositions: {
      included: { sourceId: 'DZA_S_011', disposition: 'selected' },
      excludedQuota: { sourceId: 'TKM_S_021', disposition: 'country_quota_filled' },
    },
    activePlanRule: 'Changing capacity must not replace the active plan.',
  },
  T2: {
    sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', claimTextSha256: 'a'.repeat(64),
    scope: { startDate: '2026-06-01', endDate: '2026-07-31', observationId: 'DEMO-OBS' },
    verdict: 'insufficient_evidence',
    requiredEvidenceRequirementIds: ['action_record', 'post_action_measurement'],
    requiredRequestFields: ['requestedEvidence', 'whyNeeded', 'acceptanceCriteria', 'ownerRole', 'dueDateOrReasonUnset', 'sourceId', 'claimText', 'scope', 'references'],
  },
  T3: {
    workId: 'DEMO-work', decisionDigest: '0x' + 'b'.repeat(64), revisitState: 'review_recommended',
    revisitReasonCodes: ['new_authorized_response'], historicalDecisionUnchanged: true,
    verificationValid: true, physicalOutcomeEstablished: false,
  },
};

const episodes: Episode[] = [
  { episodeId: 'P1-T1-C0_MANUAL_PACKET', pairId: 'P1-T1', personaId: 'P1', taskId: 'T1', condition: 'C0_MANUAL_PACKET' },
  { episodeId: 'P1-T1-C1_APPLICATION_BROWSER', pairId: 'P1-T1', personaId: 'P1', taskId: 'T1', condition: 'C1_APPLICATION_BROWSER' },
  { episodeId: 'P8-T1-C0_MANUAL_PACKET', pairId: 'P8-T1', personaId: 'P8', taskId: 'T1', condition: 'C0_MANUAL_PACKET' },
  { episodeId: 'P8-T1-C1_APPLICATION_BROWSER', pairId: 'P8-T1', personaId: 'P8', taskId: 'T1', condition: 'C1_APPLICATION_BROWSER' },
];

function run(episode: Episode, output: Record<string, unknown>): RunRecord {
  return {
    schemaVersion: 1,
    episodeId: episode.episodeId,
    pairId: episode.pairId,
    personaId: episode.personaId,
    taskId: episode.taskId,
    condition: episode.condition,
    runner: { kind: 'agent', model: 'DEMO-model', provider: 'DEMO-provider', seed: '1', browser: 'DEMO', startedAt: '2026-10-21T00:00:00Z', endedAt: '2026-10-21T00:01:00Z' },
    status: 'completed',
    assistance: 'none',
    output,
    timing: { wallClockSeconds: 60, modelCalls: 1, inputTokens: null, outputTokens: null, costUsd: null, retries: 0, hints: 0, failures: [] },
    artifactPaths: [],
  };
}

const correctT1 = {
  selectedStrategy: 'weighted',
  selectedSourceIds: ['DZA_S_011', 'IRN_S_065'],
  includedRationale: 'DZA_S_011 ranks highest on the frozen weighted score.',
  excludedRationale: 'TKM_S_021 is excluded because its country quota is filled.',
  activationStateBeforeCapacityChange: 'active_capacity_10',
  activationStateAfterCapacityChange: 'active_capacity_10',
};

describe('deterministic scorer', () => {
  test('NOT_RUN episodes are excluded from metric denominators and block the composite', () => {
    const scores = episodes.map(episode => scoreEpisode(episode, null, gold));
    const result = aggregate(scores, episodes);
    expect(result.scheduled).toBe(4);
    expect(result.scored).toBe(0);
    expect(result.notRun).toBe(4);
    expect(result.metrics.taskCompletionRate).toBeNull();
    expect(result.metrics.decisionAccuracy).toBeNull();
    expect(result.metrics.falseSupportedCount).toBeNull();
    expect(result.metrics.criticalOverclaimCount).toBeNull();
    expect(result.byTask.T1.falseSupportedCount).toBeNull();
    expect(result.byPersona.P1.criticalOverclaimCount).toBeNull();
    expect(scores.every(score => score.falseSupported === null)).toBe(true);
    expect(scores.every(score => score.criticalOverclaims === null)).toBe(true);
    expect(result.practicalUsefulnessIndex).toBeNull();
    expect(result.paired.eligiblePairs).toBe(0);
  });

  test('a correct T1 run scores, but one scored episode still yields no composite', () => {
    const scores = episodes.map((episode, index) => scoreEpisode(episode, index === 0 ? run(episode, correctT1) : null, gold));
    expect(scores[0]!.scored).toBe(true);
    expect(scores[0]!.taskCompletion).toBe(true);
    expect(scores[0]!.decisionAccuracy).toBe(true);
    expect(scores[0]!.sourceScopePreservation).toBe(1);
    const result = aggregate(scores, episodes);
    expect(result.scored).toBe(1);
    expect(result.notRun).toBe(3);
    expect(result.metrics.taskCompletionRate).toBe(1);
    expect(result.byTask.T1.falseSupportedCount).toBeNull();
    expect(result.practicalUsefulnessIndex).toBeNull();
  });

  test('wrong selection and a missing quota rationale fail the episode', () => {
    const episode = episodes[1]!;
    const score = scoreEpisode(episode, run(episode, { ...correctT1, selectedSourceIds: ['DZA_S_011'], excludedRationale: 'TKM_S_021 was not chosen.' }), gold);
    expect(score.taskCompletion).toBe(false);
    expect(score.reasons.join(' ')).toContain('Selected source IDs do not match');
    expect(score.reasons.join(' ')).toContain('quota/capacity');
  });

  test('critical physical-outcome overclaims are detected', () => {
    const overclaims = detectCriticalOverclaims({ verdict: 'supported', claimType: 'mitigation_confirmed', physicalMitigationEstablished: true, requestedEvidence: [] });
    expect(overclaims.map(item => item.code).sort()).toEqual(['physical_mitigation_established', 'repair_without_post_action_measurement']);
    expect(detectCriticalOverclaims({ verdict: 'supported', claimType: 'mitigation_confirmed', requestedEvidence: ['Request a post-action measurement'] }).map(item => item.code))
      .toEqual(['repair_without_post_action_measurement']);
    expect(detectCriticalOverclaims({ verdict: 'insufficient_evidence' })).toEqual([]);
  });

  test('T2 verifies the claim text itself against the frozen claim digest', () => {
    const episode = { episodeId: 'P1-T2-C0_MANUAL_PACKET', pairId: 'P1-T2', personaId: 'P1', taskId: 'T2' as const, condition: 'C0_MANUAL_PACKET' as const };
    const score = scoreEpisode(episode, run(episode, {
      sourceId: gold.T2.sourceId,
      claimType: gold.T2.claimType,
      claimText: 'A different claim text with a copied digest.',
      claimTextSha256: gold.T2.claimTextSha256,
      scope: gold.T2.scope,
      verdict: gold.T2.verdict,
      requestedEvidenceRequirementIds: gold.T2.requiredEvidenceRequirementIds,
      requestedEvidence: ['action record', 'post-action measurement'],
      whyNeeded: 'To inspect whether the reported action occurred in this source and period.',
      acceptanceCriteria: 'A dated, attributable record with matching source and scope.',
      ownerRole: 'response liaison',
      dueDateOrReasonUnset: 'Set by the receiving team.',
      references: ['DEMO reference'],
      startedAt: '2026-10-21T00:00:00Z',
      endedAt: '2026-10-21T00:01:00Z',
    }), gold);
    expect(score.taskCompletion).toBe(false);
    expect(score.sourceScopePreservation).toBe(0);
    expect(score.reasons.join(' ')).toMatch(/claim text/i);
  });

  test('T2 does not call a request complete when an evidence requirement is missing', () => {
    const episode = { episodeId: 'P1-T2-C0_MANUAL_PACKET', pairId: 'P1-T2', personaId: 'P1', taskId: 'T2' as const, condition: 'C0_MANUAL_PACKET' as const };
    const claimText = 'The project-authored test claim is fixed for this frozen scoring assertion.';
    const claimTextSha256 = createHash('sha256').update(claimText).digest('hex');
    const t2Gold = {
      ...gold.T2,
      claimTextSha256,
      requiredEvidenceRequirementIds: ['action_record', 'post_action_measurement'],
    };
    const score = scoreEpisode(episode, run(episode, {
      sourceId: t2Gold.sourceId,
      claimType: t2Gold.claimType,
      claimText,
      claimTextSha256,
      scope: t2Gold.scope,
      verdict: t2Gold.verdict,
      requestedEvidenceRequirementIds: ['action_record'],
      requestedEvidence: ['A dated action record'],
      whyNeeded: 'To identify whether an action was taken for this source.',
      acceptanceCriteria: 'The record names the source and date.',
      ownerRole: 'response liaison',
      dueDateOrReasonUnset: 'Unset pending recipient agreement.',
      references: ['DEMO observation'],
    }), { ...gold, T2: t2Gold });
    expect(score.missingEvidenceRecall).toBe(0.5);
    expect(score.taskCompletion).toBe(false);
  });

  test('run timestamps are required and must be ordered', () => {
    const episode = episodes[0]!;
    const invalid = run(episode, correctT1);
    invalid.runner.endedAt = null;
    const score = scoreEpisode(episode, invalid, gold);
    expect(score.status).toBe('failed');
    expect(score.reasons.join(' ')).toMatch(/endedAt/i);
  });

  test('a failed browser launch is a valid sealed attempt without browser metadata', () => {
    const episode = episodes[1]!;
    const attempt = run(episode, {});
    attempt.status = 'failed';
    attempt.runner.browser = null;
    expect(validateSealedRun(attempt, episode, { provider: 'DEMO-provider', model: 'DEMO-model', seed: '1' })).toEqual([]);
  });

  test('sealed attempts must match the frozen provider, model and seed', () => {
    const episode = episodes[0]!;
    const attempt = run(episode, correctT1);
    const expected = { provider: 'DEMO-provider', model: 'DEMO-model', seed: '1' };
    expect(validateSealedRun(attempt, episode, expected)).toEqual([]);
    attempt.runner.model = 'other-model';
    expect(validateSealedRun(attempt, episode, expected)).toContain('runner.model does not match the frozen protocol');
  });

  test('a direct mitigation_confirmed verdict counts as false-supported against insufficient evidence', () => {
    const episode = { episodeId: 'P1-T2-C1_APPLICATION_BROWSER', pairId: 'P1-T2', personaId: 'P1', taskId: 'T2' as const, condition: 'C1_APPLICATION_BROWSER' as const };
    const score = scoreEpisode(episode, run(episode, {
      sourceId: gold.T2.sourceId,
      claimType: gold.T2.claimType,
      claimText: 'A copied assertion that a repair is already confirmed.',
      claimTextSha256: gold.T2.claimTextSha256,
      scope: gold.T2.scope,
      verdict: 'mitigation_confirmed',
    }), gold);
    expect(score.falseSupported).toBe(true);
    expect(score.criticalOverclaims?.map(item => item.code)).toContain('repair_without_post_action_measurement');
  });

  test('a record whose identity does not match the scheduled episode is invalid, not NOT_RUN', () => {
    const episode = episodes[2]!;
    const mismatched = { ...run(episodes[0]!, correctT1), episodeId: episode.episodeId, personaId: 'P1' };
    const score = scoreEpisode(episode, mismatched, gold);
    expect(score.status).toBe('failed');
    expect(score.scored).toBe(true);
    expect(score.taskCompletion).toBe(false);
    expect(score.reasons.join(' ')).toContain('personaId mismatch');
  });
});
