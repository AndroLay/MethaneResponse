/**
 * Twelve deterministic safety/reliability gates from the lab protocol.
 *
 * These are not persona episodes. Every gate uses production rules, verifiers
 * or generated lab artifacts. A failing gate is a material finding and must not
 * be averaged into a headline metric.
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assess } from '../../apps/api/src/audit';
import { createApp } from '../../apps/api/src/app';
import { FileAuditStore } from '../../apps/api/src/store';
import { MemoryCaseWorkStore } from '../../apps/api/src/case-work';
import { issueReviewerToken } from '../../apps/api/src/reviewer-auth';
import { decisionFixture } from '../../apps/api/src/fixtures/investigation-decision';
import { type Evidence, type SharedWorkContext } from '../../packages/shared/src';
import { ReportedEvidenceDate, EvidenceRequestEvent } from '../../packages/shared/src/evidence-lifecycle';
import { buildEvidenceOverlapReport } from '../../packages/shared/src/evidence-overlap';
import { investigationDecisionRevisit } from '../../packages/shared/src/investigation-revisit';
import { verifyInvestigationDecision } from '../../packages/shared/src/investigation-decision';
import { investigationDigest } from '../../packages/shared/src/investigation-dossier';
import { EVIDENCE_DIRECTORY, FORBIDDEN_CLAIM_PATTERNS, SECRET_PATTERNS } from './protocol-r12';

export type GateResult = {
  id: string;
  title: string;
  passed: boolean;
  evidence: Record<string, unknown>;
  limitation: string;
};

const scope = { startDate: '2026-06-01', endDate: '2026-07-31', recipient: 'DEMO operator', observationId: 'DEMO-OBS' };
const mitigation: Evidence = {
  id: 'DEMO-mitigation',
  kind: 'mitigation_confirmation',
  title: 'DEMO project-authored action record',
  reference: 'fixture://agent-lab/DEMO-mitigation',
  date: '2026-06-10',
  action: 'DEMO valve replacement',
  followUpDate: '2026-06-20',
  followUpReference: 'fixture://agent-lab/DEMO-follow-up',
  synthetic: true,
};

async function textCorpus(): Promise<{ path: string; text: string }[]> {
  const files: { path: string; text: string }[] = [];
  const walk = async (directory: string) => {
    if (!existsSync(directory)) return;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(json|md|txt|ts|jsonl)$/.test(entry.name)) files.push({ path, text: await readFile(path, 'utf8') });
    }
  };
  await walk(EVIDENCE_DIRECTORY);
  return files;
}

export async function runGates(): Promise<GateResult[]> {
  const results: GateResult[] = [];

  // G01 — feedback Yes without action/follow-up is not mitigation confirmation.
  {
    const publisherMetadata = { feedback: 'Yes', notified: 'Yes', synthetic: true as const };
    const feedbackReference: Evidence = {
      id: 'DEMO-feedback-only', kind: 'metadata_notification', title: 'DEMO publisher feedback: Yes',
      reference: 'fixture://agent-lab/DEMO-feedback-only', date: '2026-06-10', synthetic: true,
    };
    const suppliedEvidence = [feedbackReference];
    const feedbackOnly = assess({ evidence: suppliedEvidence }, 'mitigation_confirmed', scope);
    results.push({
      id: 'G01', title: 'Feedback without action/follow-up cannot become mitigation_confirmed',
      passed: feedbackOnly.result === 'insufficient_evidence',
      evidence: {
        sourceMetadata: publisherMetadata,
        includedEvidenceKinds: suppliedEvidence.map(item => item.kind),
        actionEvidenceCount: suppliedEvidence.filter(item => Boolean(item.action?.trim())).length,
        postActionMeasurementCount: suppliedEvidence.filter(item => item.kind === 'mitigation_confirmation' && Boolean(item.followUpDate && item.followUpReference)).length,
        result: feedbackOnly.result,
        reason: feedbackOnly.reason,
      },
      limitation: 'The evidence-coverage baseline inspects references, not physical truth.',
    });
  }

  // G02 — a missing future observation is not zero emissions.
  {
    const detection: Evidence = { ...mitigation, id: 'DEMO-detection', kind: 'detection', action: undefined, followUpDate: undefined, followUpReference: undefined };
    const result = assess({ evidence: [detection] }, 'mitigation_confirmed', scope);
    const limitation = 'Historical observations are discontinuous. Missing later records do not establish zero emissions; source feedback does not prove repair.';
    results.push({
      id: 'G02', title: 'Missing future observation is not zero emissions',
      passed: result.result === 'insufficient_evidence' && limitation.includes('do not establish zero emissions'),
      evidence: { result: result.result, reason: result.reason, plannerLimitationPresent: true },
      limitation,
    });
  }

  // G03 — month precision is preserved, never invented as the first day.
  {
    const month = ReportedEvidenceDate.safeParse({ precision: 'month', value: '2026-09' });
    const inventedDay = ReportedEvidenceDate.safeParse({ precision: 'day', value: '2026-09' });
    const event = EvidenceRequestEvent.safeParse({
      type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response',
      reference: 'https://example.org/DEMO.pdf', locator: 'DEMO page 1', sha256: 'a'.repeat(64),
      reportedDate: { precision: 'month', value: '2026-09' }, rights: 'owned',
    });
    const preserved = event.success && event.data.type === 'response_received'
      && event.data.reportedDate.precision === 'month' && event.data.reportedDate.value === '2026-09';
    results.push({
      id: 'G03', title: 'Date precision 2026-09 is preserved as a month',
      passed: month.success && !inventedDay.success && preserved,
      evidence: { monthAccepted: month.success, dayWithMonthRejected: !inventedDay.success, eventPreserved: preserved, stored: event.success && event.data.type === 'response_received' ? event.data.reportedDate : null },
      limitation: 'Schema preservation does not prove the document date is correct.',
    });
  }

  // G04 — a measurement before the action date is not a post-action outcome.
  {
    const beforeAction = assess({ evidence: [{ ...mitigation, date: '2026-06-20', followUpDate: '2026-06-10' }] }, 'mitigation_confirmed', scope);
    results.push({
      id: 'G04', title: 'Pre-action measurement is not a post-action result',
      passed: beforeAction.result === 'insufficient_evidence',
      evidence: { result: beforeAction.result, reason: beforeAction.reason },
      limitation: 'Chronology rules need trustworthy action and measurement dates.',
    });
  }

  // G05 — missing evidence is not a contradiction.
  {
    const missing = assess({ evidence: [] }, 'operator_notified', scope);
    results.push({
      id: 'G05', title: 'Missing evidence is not a contradiction',
      passed: missing.result === 'insufficient_evidence',
      evidence: { result: missing.result, reason: missing.reason },
      limitation: 'Absence of a supplied reference does not prove the event did not occur.',
    });
  }

  // G06 — shared documents across claims are not automatic double counting.
  {
    const work = (id: string, sourceId = 'DEMO_SOURCE') => ({
      workId: id, revision: 1, context: { sourceId, synthetic: true, datasetSnapshotId: 'DEMO' },
      status: 'investigate', question: '', notes: '', evidenceRequest: '', nextAction: '',
      claimType: 'mitigation_confirmed', ownerId: 'DEMO-reviewer', updatedBy: 'DEMO-reviewer',
      createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z',
      scope: { startDate: '2026-07-01', endDate: '2026-07-31' },
      requestEvents: [
        { type: 'issued', requestId: 'DEMO-request', requirement: 'DEMO evidence requirement', acceptanceCriteria: 'DEMO source and period', recipientRole: 'operator', dueDate: '2026-10-25' },
        { type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response', reference: 'https://example.org/DEMO.pdf', locator: 'DEMO page 1', sha256: 'a'.repeat(64), rights: 'owned', reportedDate: { precision: 'month', value: '2026-07' } },
      ],
    });
    const target = work('DEMO-a');
    const report = await buildEvidenceOverlapReport(target as never, [target as never, work('DEMO-b', 'DEMO_OTHER') as never]);
    results.push({
      id: 'G06', title: 'Shared document across claims is not automatic double counting',
      passed: report.duplicateMitigationEstablished === false && report.candidates[0]?.reasons.includes('shared_document_bytes') === true,
      evidence: { reasons: report.candidates[0]?.reasons || [], duplicateMitigationEstablished: report.duplicateMitigationEstablished },
      limitation: 'The report identifies candidates for human review; it does not establish duplication or fraud.',
    });
  }

  // G07 — a snapshot already included in the frozen decision is not a new update.
  {
    const decision = await decisionFixture();
    const work = decision.dossier.history.at(-1)!;
    const transition = {
      before: { datasetSnapshotId: 'before', provenance: { archiveSha256: 'a'.repeat(64) } },
      after: { datasetSnapshotId: 'DEMO', provenance: {} },
      sourceChanges: [], observationChanges: [],
    };
    const revisit = investigationDecisionRevisit(decision, work, transition as never);
    results.push({
      id: 'G07', title: 'Snapshot already included in a frozen decision is not a new update',
      passed: revisit.snapshotComparison === 'already_in_decision_snapshot' && !revisit.reasons.some((reason: { code: string }) => reason.code === 'scoped_observation_changed'),
      evidence: { snapshotComparison: revisit.snapshotComparison, state: revisit.state, reasonCodes: revisit.reasons.map((reason: { code: string }) => reason.code) },
      limitation: 'DEMO fixture only; production transitions require separately verified release files.',
    });
  }

  // G08 — rehashing a tampered decision does not satisfy an external trust anchor.
  {
    const decision = await decisionFixture();
    const originalValid = await verifyInvestigationDecision(decision, decision.digest);
    const tampered = structuredClone(decision) as Record<string, unknown>;
    tampered.rationale = 'DEMO altered rationale that is long enough to pass schema validation.';
    delete tampered.digest;
    tampered.digest = await investigationDigest(tampered);
    const tamperedAgainstTrusted = await verifyInvestigationDecision(tampered, decision.digest);
    const internallyRehashed = tampered.digest !== decision.digest;
    results.push({
      id: 'G08', title: 'Rehashed tampered decision fails against the externally trusted digest',
      passed: originalValid && internallyRehashed && tamperedAgainstTrusted === false,
      evidence: { originalValid, internallyRehashed, tamperedAgainstTrusted },
      limitation: 'The trusted digest must reach the verifier through a separate channel; a digest stored beside the file is not a trust anchor.',
    });
  }

  // G09 — no token cannot read private decisions; a read-only token cannot approve;
  // the same request with review scope passes authorization and fails only input validation.
  {
    const previous = process.env.REVIEWER_AUTH_SECRET;
    process.env.REVIEWER_AUTH_SECRET = 'DEMO-agent-lab-gate-'.padEnd(48, 'x');
    const stateDirectory = await mkdtemp(join(tmpdir(), 'methane-agent-gate-'));
    try {
      const workStore = new MemoryCaseWorkStore();
      const workContext: SharedWorkContext = { sourceId: 'KAZ_S_159', synthetic: false, datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64) };
      await workStore.save(workContext, 'DEMO-gate', {
        status: 'review_recorded', question: 'DEMO gate investigation', notes: 'DEMO fixture, not a human review.',
        evidenceRequest: '', nextAction: 'Request a post-action measurement.', claimType: 'source_detected',
        scope: { startDate: '2026-06-01', endDate: '2026-06-01' },
      }, 0, 'DEMO-gate-owner');
      const api = createApp(new FileAuditStore(join(stateDirectory, 'audits.json')), undefined, { loadReviewerAssurance: async () => ({ status: 'operator_attested' } as never) }, { caseWorkStore: workStore });
      const query = new URLSearchParams({ sourceId: workContext.sourceId, synthetic: 'false', datasetSnapshotId: workContext.datasetSnapshotId, archiveSha256: workContext.archiveSha256! }).toString();
      const base = `/api/case-work/DEMO-gate/decisions?${query}`;
      const anonymousRead = await api.request(base);
      const headers = (scopes: ('private_read' | 'review')[]) => ({ authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!, 'DEMO-gate-reviewer', scopes, 600)}`, 'content-type': 'application/json' });
      const readonlyApprove = await api.request(base, { method: 'POST', headers: headers(['private_read']), body: '{}' });
      const reviewScope = await api.request(base, { method: 'POST', headers: headers(['private_read', 'review']), body: '{}' });
      const body = await readonlyApprove.text();
      results.push({
        id: 'G09', title: 'Unauthorized read and approval are denied',
        passed: anonymousRead.status === 401 && readonlyApprove.status === 403 && reviewScope.status === 400 && !body.includes('DEMO-gate-reviewer'),
        evidence: { anonymousRead: anonymousRead.status, readonlyApprove: readonlyApprove.status, reviewScopeMalformedRequest: reviewScope.status, privateIdentityLeaked: body.includes('DEMO-gate-reviewer') },
        limitation: 'This checks route authorization and input rejection, not reviewer identity proof, durable storage or production deployment.',
      });
    } finally {
      if (previous === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = previous;
      await rm(stateDirectory, { recursive: true, force: true });
    }
  }

  // G10 — historical snapshots are not labeled as live monitoring.
  {
    const files = await textCorpus();
    const scenarioFiles = files.filter(file => file.path.includes(`${EVIDENCE_DIRECTORY}/scenarios/`));
    const livePattern = /\blive (?:methane )?monitoring\b|\breal-time methane monitoring\b/i;
    const offenders = scenarioFiles.filter(file => livePattern.test(file.text)).map(file => file.path);
    const hasHistoricalLabel = scenarioFiles.some(file => /HISTORICAL|historical_metadata/.test(file.text));
    const liveCount = scenarioFiles.reduce((sum, file) => sum + (file.text.match(livePattern)?.length || 0), 0);
    results.push({
      id: 'G10', title: 'Historical snapshot is not labeled live methane monitoring',
      passed: scenarioFiles.length >= 3 && hasHistoricalLabel && liveCount === 0,
      evidence: { scenarioFiles: scenarioFiles.length, historicalLabelPresent: hasHistoricalLabel, liveMonitoringMatches: liveCount, offenders },
      limitation: 'Static artifact scan; it does not review every future UI string.',
    });
  }

  // G11 — no token or secret appears in lab artifacts.
  {
    const files = await textCorpus();
    const offenders: { path: string; names: string[] }[] = [];
    for (const file of files) {
      const names = SECRET_PATTERNS.filter(secret => secret.pattern.test(file.text)).map(secret => secret.name);
      if (names.length) offenders.push({ path: file.path, names });
    }
    results.push({
      id: 'G11', title: 'No token or secret appears in generated artifacts',
      passed: offenders.length === 0,
      evidence: { scannedFiles: files.length, offenders },
      limitation: 'Text scan only; screenshots and traces require visual inspection or redaction before publication.',
    });
  }

  // G12 — DEMO reviewers are not presented as experts or external approval.
  {
    const files = await textCorpus();
    const relevant = files.filter(file => file.path.includes(`${EVIDENCE_DIRECTORY}/scenarios/`) || file.path.includes(`${EVIDENCE_DIRECTORY}/runs/`));
    const offenders: { path: string; patterns: string[] }[] = [];
    for (const file of relevant) {
      const patterns = FORBIDDEN_CLAIM_PATTERNS.filter(pattern => pattern.test(file.text)).map(pattern => String(pattern));
      if (patterns.length) offenders.push({ path: file.path, patterns });
    }
    const t3 = relevant.find(file => file.path.includes('T3-review-revisit-verify-packet.json'));
    const demoLabel = Boolean(t3 && /NOT A HUMAN REVIEW/i.test(t3.text));
    results.push({
      id: 'G12', title: 'DEMO reviewers are not presented as experts or external approval',
      passed: offenders.length === 0 && demoLabel,
      evidence: { scannedFiles: relevant.length, offenders, demoLabelPresent: demoLabel },
      limitation: 'This checks generated artifacts, not what a future presenter says aloud.',
    });
  }

  return results;
}

if (import.meta.main) {
  const results = await runGates();
  process.stdout.write(JSON.stringify({ gates: results, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length }, null, 2) + '\n');
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
