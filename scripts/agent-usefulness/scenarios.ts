import { buildInvestigationPortfolio, plannerDisposition } from '../../packages/shared/src/investigation-planner';
import type { InvestigationPortfolio } from '../../packages/shared/src/investigation-planner';
import { SharedCaseWork } from '../../packages/shared/src';
import { investigationDecisionRevisit } from '../../packages/shared/src/investigation-revisit';
import { getIntelligenceSnapshot } from '../../apps/api/src/intelligence-data';
import { getPlannerCatalog } from '../../apps/api/src/investigation-planner-data';
import { decisionFixture } from '../../apps/api/src/fixtures/investigation-decision';
import { PROTOCOL_ID, TASK_FAMILIES } from './protocol';

const T1_PARAMETERS = { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [] as string[], sectors: [] as string[] } as const;
const T1_PARAMETERS_AFTER = { ...T1_PARAMETERS, capacity: 20 } as const;

type PlannerSnapshot = Awaited<ReturnType<typeof getIntelligenceSnapshot>>;
type PlannerCatalog = Awaited<ReturnType<typeof getPlannerCatalog>>;

export async function loadPlannerInput(snapshot: PlannerSnapshot, catalog: PlannerCatalog, parameters: typeof T1_PARAMETERS | typeof T1_PARAMETERS_AFTER) {
  return {
    dataset: {
      datasetSnapshotId: snapshot.datasetSnapshotId,
      inputFileSha256: snapshot.inputFileSha256,
      archiveSha256: snapshot.upstreamArchiveSha256,
      intelligenceSha256: snapshot.snapshotSha256,
      synthetic: false,
      provenance: snapshot.sourceProvenance,
      scope: 'full_snapshot' as const,
      totalSourceCount: snapshot.sourceCount,
      archiveStartDate: catalog.archiveStartDate,
      archiveEndDate: catalog.archiveEndDate,
    },
    parameters,
    candidates: catalog.candidates,
  };
}

function pickDispositionExamples(report: InvestigationPortfolio) {
  const selected = report.portfolios.find(plan => plan.strategy === 'weighted')!.selectedIds;
  const selectedSet = new Set(selected);
  const candidates = [...report.input.candidates].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const included = candidates.find(row => selectedSet.has(row.sourceId));
  const excludedQuota = candidates.find(row => !selectedSet.has(row.sourceId) && plannerDisposition(report, row.sourceId, 'weighted') === 'country_quota_filled');
  const excludedCapacity = candidates.find(row => !selectedSet.has(row.sourceId) && plannerDisposition(report, row.sourceId, 'weighted') === 'capacity_filled');
  if (!included || !excludedQuota) throw new Error('T1 scenario requires one included and one quota-excluded real source.');
  return {
    included: { sourceId: included.sourceId, disposition: plannerDisposition(report, included.sourceId, 'weighted') },
    excludedQuota: { sourceId: excludedQuota.sourceId, disposition: plannerDisposition(report, excludedQuota.sourceId, 'weighted') },
    ...(excludedCapacity ? { excludedCapacity: { sourceId: excludedCapacity.sourceId, disposition: plannerDisposition(report, excludedCapacity.sourceId, 'weighted') } } : {}),
  };
}

const T1_POLICY = `# Planner policy (frozen, policyVersion investigation-allocation/1)

Inputs: the complete candidate table in \`T1-plan-packet.json\`, parameters
\`capacity\`, \`maxPerCountry\`, \`recurrenceWeight\`, \`countries\`, \`sectors\`.

Eligibility: a candidate is eligible only when \`observationCount > 0\` and it
matches every non-empty country and sector filter. Unknown country/sector never
joins a non-empty filter.

Scores: within the eligible pool, compute tied midrank percentiles (0-100) for
the numeric \`medianFluxKgHr\` values and for \`distinctDates\`. Null flux receives
no magnitude points; it is not zero. The weighted score is
\`(magnitudePoints * (100 - recurrenceWeight) + recurrencePoints * recurrenceWeight) / 100\`.

Weighted allocation: rank eligible candidates by descending weighted score,
breaking ties by ascending \`sourceId\`. Walk the ranking and select a candidate
only when its country has fewer than \`maxPerCountry\` selected rows, until
\`capacity\` rows are selected or no candidate can be added. A country count
includes rows with unknown country as one bucket.

Required answers: the selected source IDs, the disposition reason for each named
source (selected, country_quota_filled, capacity_filled, outside_country_scope,
outside_sector_scope, or no_linked_observations), and the effect of changing
capacity from 10 to 20. Re-running the comparison must not activate a new plan;
activation is a separate explicit action.`;

const T1_LIMITATIONS = [
  'This is an analyst-defined allocation, not a repair estimate, emissions reduction, cost estimate or validation of future leakage.',
  'Flux and recurrence baselines are application-defined, not the official UNEP Top 50 ranking.',
  'Historical observations are discontinuous. Missing later records do not establish zero emissions; source feedback does not prove repair.',
  'A replay checksum detects change relative to a trusted digest; it does not authenticate data origin or physical truth.',
];

export async function buildT1Scenario() {
  const snapshot = await getIntelligenceSnapshot();
  const catalog = await getPlannerCatalog(snapshot);
  const input = await loadPlannerInput(snapshot, catalog, T1_PARAMETERS);
  const report = await buildInvestigationPortfolio(input);
  const inputAfter = await loadPlannerInput(snapshot, catalog, T1_PARAMETERS_AFTER);
  const reportAfter = await buildInvestigationPortfolio(inputAfter);
  const examples = pickDispositionExamples(report);
  const packet = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T1',
    label: 'REAL HISTORICAL METADATA — NOT A LIVE FEED',
    dataMode: 'real_historical_metadata',
    synthetic: false,
    dataset: input.dataset,
    parameters: T1_PARAMETERS,
    candidateCount: input.candidates.length,
    candidates: [...input.candidates].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    task: {
      sourceAId: examples.included.sourceId,
      sourceBId: examples.excludedQuota.sourceId,
      startingCapacity: T1_PARAMETERS.capacity,
      changedCapacity: T1_PARAMETERS_AFTER.capacity,
      maxPerCountry: T1_PARAMETERS.maxPerCountry,
    },
    policy: T1_POLICY,
    requiredOutputFields: TASK_FAMILIES.find(task => task.id === 'T1')!.requiredOutputFields,
    limitations: T1_LIMITATIONS,
  };
  const gold = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T1',
    goldKind: 'planner-policy-replay-pin',
    policyVersion: report.policyVersion,
    selectedStrategy: 'weighted',
    reportDigest: report.digest,
    reportAfterCapacityDigest: reportAfter.digest,
    selectedSourceIds: report.portfolios.find(plan => plan.strategy === 'weighted')!.selectedIds,
    selectedSourceIdsAtCapacity20: reportAfter.portfolios.find(plan => plan.strategy === 'weighted')!.selectedIds,
    dispositions: examples,
    activePlanRule: 'Changing parameters to capacity 20 must not replace the active capacity-10 plan; only an explicit activation may replace it.',
    limitations: T1_LIMITATIONS,
  };
  return { packet, gold, report, reportAfter, snapshot };
}

export async function buildT2Scenario() {
  const snapshot = await getIntelligenceSnapshot();
  const row = snapshot.sources.find(source => source.sourceId === 'KAZ_S_159');
  if (!row) throw new Error('T2 scenario source KAZ_S_159 is absent from the pinned snapshot.');
  const casebook = await Bun.file('data/real/mars_casebook_2026-10-15.json').json();
  const marsCase = casebook.cases.find((item: { sourceId: string }) => item.sourceId === 'KAZ_S_159');
  if (!marsCase) throw new Error('T2 scenario source KAZ_S_159 is absent from the pinned casebook.');
  const claim = 'The KAZ_S_159 operator completed mitigation of the 2026-06-05 detected methane plume, and a post-action measurement confirms the outcome by 2026-07-31.';
  const scope = { startDate: '2026-06-01', endDate: '2026-07-31', observationId: '7529d451-018f-4da3-9114-59b76c3a3bcd' };
  const packet = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T2',
    label: 'REAL HISTORICAL METADATA + PROJECT-AUTHORED DEMO NOTE — NOT A REPAIR CONFIRMATION',
    dataMode: 'real_historical_metadata_with_demo_note',
    synthetic: false,
    dataset: {
      datasetSnapshotId: snapshot.datasetSnapshotId,
      inputFileSha256: snapshot.inputFileSha256,
      archiveSha256: snapshot.upstreamArchiveSha256,
      archiveStartDate: '2020-10-29',
      archiveEndDate: '2026-09-13',
      license: 'UNEP IMEO MARS metadata, CC BY-NC-SA 4.0 (dataset terms)',
      attribution: snapshot.sourceProvenance?.attribution || 'UNEP IMEO MARS',
    },
    claim: {
      sourceId: 'KAZ_S_159',
      claimType: 'mitigation_confirmed',
      claimText: claim,
      scope,
      claimTextSha256: await sha256Hex(claim),
    },
    source: {
      sourceId: row.sourceId,
      country: marsCase.source.country,
      sector: marsCase.source.sector,
      sourceType: marsCase.source.sourceType,
      notified: marsCase.source.notified,
      feedback: marsCase.source.feedback,
      feedbackOperator: marsCase.source.feedbackOperator,
      feedbackGovernment: marsCase.source.feedbackGovernment,
      feedbackScope: marsCase.source.feedbackScope,
      mitigationConfirmed: marsCase.source.mitigationConfirmed,
      persistency: marsCase.source.persistency,
      persistencyStd: marsCase.source.persistencyStd,
      persistencyCategory: marsCase.source.persistencyCategory,
      latestPlumeDate: marsCase.source.latestPlumeDate,
      synthetic: false,
    },
    plumeRecords: marsCase.plumes.map((plume: Record<string, unknown>) => ({
      plumeId: plume.plumeId,
      sourceId: plume.sourceId,
      satellite: plume.satellite,
      tileDate: plume.tileDate,
      fluxKgHr: plume.fluxKgHr,
      fluxStdKgHr: plume.fluxStdKgHr,
      notified: plume.notified,
      actionable: plume.actionable,
      synthetic: false,
    })),
    externalEvidenceMetadata: marsCase.externalEvidence.map((item: Record<string, unknown>) => ({
      title: item.title,
      url: item.url,
      publisher: item.publisher,
      reportDate: item.reportDate,
      license: item.license,
      contentIncluded: false,
      providerProcessing: false,
      note: 'Metadata only. The linked report is not reproduced, downloaded, or sent to a provider in this lab.',
    })),
    demoSafetyNote: {
      label: 'DEMO AUTHORED NOTE — PROJECT TEXT, NOT A PUBLISHER CLAIM',
      text: 'The source record reports feedback: Yes and notified: Yes. Those fields are publisher metadata. This packet supplies no action date, no post-action measurement, no measurement method, no uncertainty, and no follow-up reference for the claimed 2026-06-05 plume.',
    },
    requiredOutputFields: TASK_FAMILIES.find(task => task.id === 'T2')!.requiredOutputFields,
  };
  const gold = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T2',
    goldKind: 'author-frozen-rule-check',
    sourceId: 'KAZ_S_159',
    claimType: 'mitigation_confirmed',
    claimTextSha256: await sha256Hex(claim),
    scope,
    verdict: 'insufficient_evidence',
    mustPreserve: ['sourceId=KAZ_S_159', `observationId=${scope.observationId}`, `scope=${scope.startDate}/${scope.endDate}`, 'claimType=mitigation_confirmed'],
    requiredEvidenceRequirementIds: ['action_record', 'post_action_measurement', 'method_and_uncertainty', 'follow_up_date', 'source_claim_scope'],
    requiredRequestFields: ['requestedEvidence', 'whyNeeded', 'acceptanceCriteria', 'ownerRole', 'dueDateOrReasonUnset', 'sourceId', 'claimText', 'scope', 'references'],
    forbiddenConclusions: ['mitigation_confirmed', 'physical_mitigation_established', 'zero_emissions_established'],
    limitations: [
      'A feedback flag is not evidence that an operator received a notice, repaired equipment or reduced emissions.',
      'Missing later observations do not establish zero emissions.',
      'The linked external report is metadata-only and was not rights-cleared for provider processing.',
    ],
  };
  return { packet, gold, snapshot };
}

export async function buildT3Scenario() {
  const decision = await decisionFixture();
  const frozenWork = decision.dossier.history.at(-1)!;
  const responseEvents = [
    { type: 'issued' as const, requestId: 'DEMO-T3-REQUEST', requirement: 'DEMO post-action measurement with method, uncertainty and source scope.', acceptanceCriteria: 'DEMO source KAZ_S_159 / scope 2026-01-01..2026-01-02 / operator attestation.', recipientRole: 'operator' as const, dueDate: '2026-01-15' },
    { type: 'response_received' as const, requestId: 'DEMO-T3-REQUEST', responseId: 'DEMO-T3-RESPONSE', reference: 'https://example.org/DEMO-T3-response', locator: 'DEMO page 1', sha256: 'a'.repeat(64), rights: 'owned' as const, reportedDate: { precision: 'month' as const, value: '2026-01' } },
  ];
  const latest = SharedCaseWork.parse({ ...frozenWork, revision: 2, updatedAt: '2026-01-05T00:00:00.000Z', requestEvents: [...(frozenWork.requestEvents || []), ...responseEvents] });
  const revisit = investigationDecisionRevisit(decision, latest);
  const packet = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T3',
    label: 'DEMO DECISION AND DEMO EVIDENCE EVENT — NOT A HUMAN REVIEW OR PHYSICAL OUTCOME',
    dataMode: 'demo_authored_fixture',
    synthetic: true,
    trustedDigest: decision.digest,
    historicalDecision: decision,
    newWorkRevision: latest,
    verificationCommand: 'bun --no-env-file scripts/verify-investigation-decision.ts decision.json --expected-digest <trustedDigest>',
    requiredOutputFields: TASK_FAMILIES.find(task => task.id === 'T3')!.requiredOutputFields,
    limitations: [
      'The dossier and reviewer identity are DEMO fixtures, not an independent human review.',
      'A digest or blockchain receipt proves integrity and chronology, not physical repair or emissions reduction.',
      'The historical decision must remain unchanged when a new response recommends review.',
    ],
  };
  const gold = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    taskId: 'T3',
    goldKind: 'frozen-decision-replay-and-revisit',
    workId: decision.dossier.workId,
    decisionDigest: decision.digest,
    disposition: decision.disposition,
    revisitState: revisit.state,
    revisitReasonCodes: revisit.reasons.map(reason => reason.code),
    revisitReasonIds: revisit.reasons.flatMap(reason => reason.ids),
    historicalDecisionUnchanged: true,
    verificationValid: true,
    physicalOutcomeEstablished: false,
    expectedReasonCode: 'new_authorized_response',
    expectedResponseId: 'DEMO-T3-RESPONSE',
  };
  return { packet, gold, decision, latest, revisit };
}

async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export { sha256Hex };
