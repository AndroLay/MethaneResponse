import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { recoveryScore, sameSourceIds, semanticVerdict, RECOVERY_SCORER_VERSION } from './recovery-scorer';
import { scoreEpisode, type GoldSet, type RunRecord } from './scorer';

const root = 'docs/evidence/agent-practical-usefulness-2026-10-21-r12';
const target = 'docs/evidence/r12-recovery-2026-10-21';
export async function auditFrozenR12() {
  const pinned: Record<string, string> = JSON.parse(await readFile(join(target, 'frozen-input-sha256.json'), 'utf8'));
  const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  for (const [file, hash] of Object.entries(pinned)) {
    if (sha(await readFile(file)) !== hash) throw new Error(`Frozen r12 changed: ${file}`);
  }
  if (sha(await readFile(join(root, 'scorer.ts'))) !== sha(await readFile('scripts/agent-usefulness/scorer.ts'))) throw new Error('Baseline scorer differs from frozen copy');
  const gold = Object.fromEntries(await Promise.all(['T1-plan', 'T2-investigate-request', 'T3-review-revisit-verify'].map(async (name, i) => [`T${i + 1}`, JSON.parse(await readFile(join(root, 'scenarios/gold', `${name}-gold.json`), 'utf8'))]))) as GoldSet;
  const runs = await Promise.all((await readdir(join(root, 'runs/sealed'))).filter(name => name.endsWith('.json')).sort().map(async name => JSON.parse(await readFile(join(root, 'runs/sealed', name), 'utf8')) as RunRecord));
  const episodes = runs.map(run => {
    const frozen = scoreEpisode(run, run, gold);
    const alternative = recoveryScore(run, run, gold);
    const categories: string[] = [];
    const obligations: string[] = [];
    if (run.status === 'failed') {
      categories.push('AGENT_OR_TOOL_FAILURE');
      obligations.push('No sealed task output. Zero recorded tools is not proof of zero calls: old bridge persisted counters only at submission and deleted temporary diagnostics. Exact P8 root cause is not recoverable.');
    } else if (run.taskId === 'T1') {
      if (!sameSourceIds(run.output?.selectedSourceIds, gold.T1.selectedSourceIds)) {
        categories.push('GENUINE_TASK_FAILURE'); obligations.push('Wrong exact allocation IDs; strategy normalization cannot repair this.');
      }
      if (run.condition === 'C0_MANUAL_PACKET') {
        categories.push('PROTOCOL_LIMITATION'); obligations.push('Read-only packet tools cannot activate a plan or execute a capacity change. A hypothetical state is not an observed runtime state.');
      } else if (alternative.changes.length) {
        categories.push('SCORER_FALSE_NEGATIVE'); obligations.push(alternative.score.taskCompletion ? 'Structured output satisfies the bounded recovery evaluator; original frozen result remains failed.' : 'Some labels/structures are equivalent, but full activation evidence is not normalized; remaining failures retained.');
      }
    } else if (run.taskId === 'T2') {
      categories.push('PROTOCOL_LIMITATION');
      obligations.push('claimTextSha256 and requestedEvidenceRequirementIds are scored but absent from advertised output fields. No absent field is synthesized.');
      if (semanticVerdict(run.output?.verdict) === gold.T2.verdict && run.output?.verdict !== gold.T2.verdict) categories.push('SCORER_FALSE_NEGATIVE');
      if (!categories.includes('SCORER_FALSE_NEGATIVE') && Array.isArray(run.output?.references)
        && run.output.references.some(value => value && typeof value === 'object' && Object.keys(value).length > 0)) {
        categories.push('SCORER_FALSE_NEGATIVE');
      }
      obligations.push('Scientific abstention is not task completion. Request fields and exact source/claim/scope remain required.');
    } else {
      categories.push('PROTOCOL_LIMITATION');
      obligations.push(run.condition === 'C1_APPLICATION_BROWSER'
        ? 'T3 opens /dashboard/reports without seeding DEMO-work/decision or authorized reviewer; servers explicitly disable reviewer configuration. Never bypass authorization.'
        : 'T3 provides JSON in prompt and submit_result only: no mutation/export/verifier tools. Trusted digest exists, executable verification is unavailable.');
    }
    const o = run.output || {};
    const scope = o.scope && typeof o.scope === 'object' ? o.scope as Record<string, unknown> : {};
    const t2Binding = run.taskId === 'T2' && run.output ? {
      sourceId: o.sourceId === gold.T2.sourceId,
      claimType: o.claimType === gold.T2.claimType,
      exactClaimText: typeof o.claimText === 'string' && sha(Buffer.from(o.claimText.trim())) === gold.T2.claimTextSha256,
      exactUtcScope: scope.startDate === gold.T2.scope.startDate && scope.endDate === gold.T2.scope.endDate && scope.observationId === gold.T2.scope.observationId,
    } : null;
    const requestFieldAudit = run.taskId === 'T2' ? gold.T2.requiredRequestFields.map(field => {
      const value = o[field];
      const present = typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value)
        ? value.length > 0 && value.every(v => typeof v === 'string' ? v.trim().length > 0 : v && typeof v === 'object' && Object.keys(v).length > 0)
        : value !== null && typeof value === 'object' && Object.keys(value).length > 0;
      return { field, present, shape: Array.isArray(value) ? 'array' : typeof value };
    }) : null;
    return { episodeId: run.episodeId, taskId: run.taskId, condition: run.condition, status: run.status, categories, obligations, t2Binding, requestFieldAudit,
      frozenCompletion: frozen.taskCompletion, frozenReasons: frozen.reasons,
      ...alternative, missingUnadvertisedFields: run.taskId === 'T2' ? ['claimTextSha256', 'requestedEvidenceRequirementIds'].filter(key => run.output?.[key] === undefined) : [] };
  });
  const baseline = JSON.parse(await readFile(join(root, 'results.json'), 'utf8'));
  const report = { schemaVersion: 1, evaluatorVersion: RECOVERY_SCORER_VERSION, kind: 'retrospective_audit_not_new_agent_trials',
    generatedAt: new Date().toISOString(), frozenFilesUnchanged: Object.keys(pinned).length,
    baseline: { status: baseline.status, sealed: baseline.sealed.records, metrics: baseline.aggregate.metrics },
    alternative: { episodes: episodes.length, completion: episodes.filter(e => e.score.taskCompletion).length,
      semanticT2VerdictAgreement: episodes.filter(e => e.taskId === 'T2' && e.score.decisionAccuracy).length, t2AvailableOutputs: runs.filter(r => r.taskId === 'T2' && r.output !== null).length,
      categoriesNonExclusive: Object.fromEntries(['SCORER_FALSE_NEGATIVE','AGENT_OR_TOOL_FAILURE','APPLICATION_DEFECT','GENUINE_TASK_FAILURE','PROTOCOL_LIMITATION'].map(c => [c, episodes.filter(e => e.categories.includes(c)).length])) },
    limits: ['No new agent episodes or paid calls executed.', 'Alternative normalization is conservative, not a replacement research score or productivity evidence.', 'P8 cause cannot be reconstructed from missing diagnostic payloads.', 'No application defect can be inferred from unseeded T3 or agent output alone.'], episodes };
  return report;
}
if (import.meta.main) {
  const report = await auditFrozenR12();
  await writeFile(join(target, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ frozenFilesUnchanged: report.frozenFilesUnchanged, alternative: report.alternative }));
}
