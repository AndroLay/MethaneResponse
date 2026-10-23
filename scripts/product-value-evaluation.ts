import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { AuditInput, HumanAssessmentInput, DEMO_SOURCES, evidenceUtcDay, type AuditResult } from '../packages/shared/src';
import { loadCasebook, sourceFromCase } from '../apps/api/src/casebook';
import { createAudit } from '../apps/api/src/audit';
import { createHumanAssessment } from '../apps/api/src/human-assessment';
import { resolveScopedSource } from '../apps/api/src/scoped-source';
import { compareAuditRevisions } from '../apps/web/src/audit-comparison';
import { observationPeriod } from '../apps/web/src/assessment-scope';
import { verifyImportedAuditReport } from '../apps/web/src/imported-audit-verifier';
import { addExportIntegrity, buildReportExportPayload, canonicalJson } from '../apps/web/src/report-export';

type Response = { id: string; answer: Record<string, unknown> };
type Task = { id: string; kind: 'coverage' | 'integrity' | 'lineage' | 'utc'; prompt: string; input: Record<string, unknown> };
const root = resolve(import.meta.dir, '..');
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const save = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

export function scoreResponses(key: Response[], responses: Response[]) {
  if (new Set(key.map(row => row.id)).size !== key.length) throw new Error('Duplicate rubric ID');
  const seen = new Set<string>();
  for (const row of responses) {
    if (!key.some(item => item.id === row.id)) throw new Error(`Unscheduled response: ${row.id}`);
    if (seen.has(row.id)) throw new Error(`Duplicate response: ${row.id}`);
    seen.add(row.id);
  }
  const cells = key.map(expected => {
    const actual = responses.find(row => row.id === expected.id);
    return { id: expected.id, status: !actual ? 'missing' : canonicalJson(actual.answer) === canonicalJson(expected.answer) ? 'correct' : 'incorrect', expected: expected.answer, actual: actual?.answer ?? null };
  });
  return { scheduled: key.length, correct: cells.filter(row => row.status === 'correct').length,
    missing: cells.filter(row => row.status === 'missing').length,
    criticalOverclaims: responses.filter(row => row.answer.physicalMitigationEstablished === true || row.answer.authenticityEstablished === true).length, cells };
}

async function prepare(directory: string) {
  // A new directory is mandatory: frozen inputs and prior outcomes cannot be overwritten.
  await mkdir(directory);
  const bookPath = join(root, 'data/real/mars_casebook_2026-10-15.json');
  const book = await loadCasebook(bookPath);
  const tasks: Task[] = [];
  const rubric: Response[] = [];
  const cases = book.cases.filter(item => ['KAZ_S_159', 'LBY_S_143', 'CAN_S_002'].includes(item.sourceId));
  for (const item of cases) {
    const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
    const day = evidenceUtcDay(item.plumes[0]!.tileDate)!;
    const scope = { startDate: day, endDate: day, observationId: item.plumes[0]!.plumeId, recipient: 'DEMO intended recipient — not a claim of actual delivery' };
    for (const claimType of ['source_detected', 'operator_notified', 'mitigation_confirmed'] as const) {
      const id = `${item.sourceId}:${claimType}`;
      tasks.push({ id, kind: 'coverage', prompt: 'Apply the documented metadata coverage policy to this exact UTC event/scope. Return {result,evidenceIds,physicalMitigationEstablished}; sort citation IDs. Do not treat source flags or linked report titles as typed event evidence.', input: { source, request: { sourceId: source.sourceId, claimType, scope }, metadata: { provenance: book.provenance } } });
      rubric.push({ id, answer: { result: claimType === 'source_detected' ? 'supported' : 'insufficient_evidence', evidenceIds: claimType === 'source_detected' ? [item.plumes[0]!.plumeId] : [], physicalMitigationEstablished: false } });
    }
  }
  const source = DEMO_SOURCES[0]!;
  const demo = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
  const original = await addExportIntegrity(buildReportExportPayload({ audit: demo, claim: 'source_detected', source, snapshot: null, realMode: false, generatedAt: '2026-10-18T00:00:00Z' }));
  const editedBundle = structuredClone(original); editedBundle.latestAudit!.bundle.reason += ' DEMO edit';
  const editedContext = structuredClone(original); editedContext.disclaimer += ' DEMO edit';
  const replaced = structuredClone(demo);
  replaced.reason += ' DEMO replacement'; replaced.bundle.reason = replaced.reason;
  replaced.bundleHash = `0x${hash(canonicalJson(replaced.bundle))}`;
  const rehashed = await addExportIntegrity(buildReportExportPayload({ audit: replaced, claim: 'source_detected', source, snapshot: null, realMode: false, generatedAt: '2026-10-18T00:00:00Z' }));
  for (const [name, report, valid] of [
    ['intact', original, true], ['bundle-edit', editedBundle, false], ['context-edit', editedContext, false], ['legacy', demo, false], ['self-rehashed', rehashed, true],
  ] as const) {
    const id = `DEMO:integrity:${name}`;
    tasks.push({ id, kind: 'integrity', prompt: 'Check bundle digest, summary agreement and complete export context checksum (strict). Return {localDigest,authenticityEstablished}. A self-consistent rehash is not sender authenticity; no trusted receipt/sender digest is provided.', input: { report } });
    rubric.push({ id, answer: { localDigest: valid ? 'valid' : 'invalid', authenticityEstablished: false } });
  }
  const request = HumanAssessmentInput.parse({ sourceId: source.sourceId, datasetSnapshotId: 'DEMO', claimType: 'operator_notified', scope: { startDate: '2026-09-01', endDate: '2026-09-30', recipient: 'DEMO intended operator' }, claimText: 'DEMO simulated evidence exercise: notice was delivered to the named recipient.', result: 'insufficient_evidence', rationale: 'DEMO simulated determination: no eligible delivery reference was supplied.', evidence: [], sourceInspected: true, publicSummaryConsent: false, conflictDeclaration: 'not_declared', nextEvidenceRequest: 'DEMO request: obtain a dated delivery register.' });
  const resolved = await resolveScopedSource(request, async () => { throw new Error('DEMO requires no external snapshot'); }, async () => null);
  const before = createHumanAssessment(request, resolved, 'DEMO-agent-simulated-reviewer', 1);
  const after = createHumanAssessment({ ...request, parentAuditId: before.auditId, rationale: 'DEMO correction: request recipient acknowledgement as well as the dated register.', nextEvidenceRequest: 'DEMO request: register plus recipient acknowledgement.' }, resolved, 'DEMO-agent-simulated-reviewer', 2, before);
  tasks.push({ id: 'DEMO:lineage', kind: 'lineage', prompt: 'Compare the two DEMO revisions. Return {recordedParent,reasonChanged,oldVersionPreserved}. Check the parent hash and both canonical bundle digests. This simulates review mechanics; no human participant or real reviewer exists.', input: { before, after } });
  rubric.push({ id: 'DEMO:lineage', answer: { recordedParent: true, reasonChanged: true, oldVersionPreserved: true } });
  tasks.push({ id: 'DEMO:utc', kind: 'utc', prompt: 'Normalize timestamps to UTC calendar days and return {startDate,endDate,count} for all valid events; exclude impossible dates.', input: { events: [{ id: 'DEMO-offset', date: '2026-09-30T23:30:00-12:00' }, { id: 'DEMO-late', date: '2026-10-02' }, { id: 'DEMO-invalid', date: '2026-09-31' }] } });
  rubric.push({ id: 'DEMO:utc', answer: { startDate: '2026-10-01', endDate: '2026-10-02', count: 2 } });
  await save(join(directory, 'inputs.json'), { schemaVersion: 1, comparisonId: 'product-value-functional-v1', provenance: book.provenance, cases, tasks });
  await save(join(directory, 'rubric.json'), rubric);
  await writeFile(join(directory, 'protocol.md'), `# Frozen functional-comparison protocol

English documentation edition for newly prepared packets. Existing frozen packets,
answers, rubrics and results must not be overwritten or rescored by this translation.

Frozen before assessment. ${tasks.length} scheduled cells: nine metadata-coverage
checks from three historical cases and seven DEMO challenges (five integrity, one
revision, one UTC). Every required field must match for a correct answer. Missing
answers fail; duplicate or unscheduled IDs are rejected.

## Tool-assisted manual baseline

One independent AI operator reads inputs.json, the metadata policies in
packages/shared/src/evidence-policy.ts and assessment-semantics.ts, and the source/
claim schemas in packages/shared/src/index.ts. Supply identical data/provenance,
structured answer sheets, original revision logs and general SHA-256/JSON tools.
The same CLI verifier (scripts/verify-audit.ts --require-context) is permitted.
This compares workflows, not a prohibition on manual hashing or automation.
Do not inspect rubric.json, application outputs, scorer or harness implementation
before submission. Record tools and deviations; do not coach answers.

## Application

Replay the same inputs using createAudit, the real browser verifier with
requireExportContext:true, compareAuditRevisions and UTC presets. This tests
production functions; browser interaction results are separate. It does not compare
the entire MARS portal or claim every input passed end to end through the UI.

## Measures and limits

Report every cell, correctness, missing answers and physical/authenticity overclaims.
Do not infer human time, cost, productivity or scientific superiority. If both
workflows are correct, report parity: integration does not imply baseline incapacity.
Agents are not human participants; DEMO scenarios are not new methane events.
Earlier P5 results remain separate: 15/24 eligible pairs, median manual-minus-app
-33.914 seconds. Do not overwrite them. An internal score target cannot set results.

## Answer format

JSON {operator,toolsUsed,deviations,responses:[{id,answer:{...requestedFields}}]}.
Fields inside answer must match the requested fields exactly. Free-text notes
outside answer are allowed.
`, { flag: 'wx' });
  const files = ['inputs.json', 'rubric.json', 'protocol.md'];
  const bindings = Object.fromEntries(await Promise.all(files.map(async name => [name, hash(await readFile(join(directory, name)))])));
  const base = JSON.parse(await readFile(join(root, 'docs/evidence/integration-role-simulation-2026-10-18/manifest.json'), 'utf8'));
  const runtimePaths = [...new Set([...Object.keys(base.sourceFiles).filter(name => /^(apps\/(api|web)\/src|packages\/shared\/src)\//.test(name) && !name.endsWith('.test.ts')), 'apps/web/src/assessment-scope.ts'])].sort();
  const productionFiles = Object.fromEntries(await Promise.all(runtimePaths.map(async name => [name, hash(await readFile(join(root, name)))])));
  await save(join(directory, 'input-freeze.json'), { frozenAt: new Date().toISOString(), files: bindings, productionFiles, casebook: { path: 'data/real/mars_casebook_2026-10-15.json', sha256: hash(await readFile(bookPath)) }, harnessSha256: hash(await readFile(import.meta.path)), scheduled: tasks.length });
}

async function verifyFreeze(directory: string) {
  const freeze = JSON.parse(await readFile(join(directory, 'input-freeze.json'), 'utf8'));
  for (const [name, expected] of Object.entries(freeze.files)) if (hash(await readFile(join(directory, name))) !== expected) throw new Error(`Frozen input drift: ${name}`);
  for (const [name, expected] of Object.entries(freeze.productionFiles)) if (hash(await readFile(join(root, name))) !== expected) throw new Error(`Production source drift: ${name}`);
  if (hash(await readFile(import.meta.path)) !== freeze.harnessSha256) throw new Error('Harness drift after input freeze');
}

async function run(directory: string) {
  await verifyFreeze(directory);
  const packet = JSON.parse(await readFile(join(directory, 'inputs.json'), 'utf8')) as { tasks: Task[] };
  const responses: Response[] = [];
  for (const task of packet.tasks) {
    const data = task.input as any;
    let answer: Record<string, unknown>;
    if (task.kind === 'coverage') {
      const audit = createAudit(data.source, AuditInput.parse(data.request), data.metadata);
      answer = { result: audit.result, evidenceIds: audit.evidenceIds, physicalMitigationEstablished: audit.bundle.assessmentSemantics?.physicalVerification !== 'not_established_by_application' };
    } else if (task.kind === 'integrity') {
      const result = await verifyImportedAuditReport(data.report, { requireExportContext: true });
      answer = { localDigest: result.localDigest, authenticityEstablished: false };
    } else if (task.kind === 'lineage') {
      const comparison = compareAuditRevisions(data.before, data.after);
      const digestValid = (audit: AuditResult) => `0x${hash(canonicalJson(audit.bundle))}` === audit.bundleHash;
      answer = { recordedParent: comparison.recordedParent, reasonChanged: comparison.differences.some(row => row.field === 'Reason'), oldVersionPreserved: digestValid(data.before) && digestValid(data.after) };
    } else answer = observationPeriod(data.events)!;
    responses.push({ id: task.id, answer });
  }
  await save(join(directory, 'app-results.json'), { operator: 'deterministic production-function replay', responses, limitations: ['Not a timed human study', 'Browser interaction tested separately', 'Authenticity is not established without an independently trusted commitment'] });
}

async function analyze(directory: string) {
  await verifyFreeze(directory);
  const key = JSON.parse(await readFile(join(directory, 'rubric.json'), 'utf8')) as Response[];
  const app = JSON.parse(await readFile(join(directory, 'app-results.json'), 'utf8'));
  const manual = JSON.parse(await readFile(join(directory, 'manual-results.json'), 'utf8'));
  await save(join(directory, 'comparison.json'), { kind: 'agent-functional-comparison-not-human-research', inputFreezeSha256: hash(await readFile(join(directory, 'input-freeze.json'))), app: scoreResponses(key, app.responses), equippedManual: scoreResponses(key, manual.responses), timingClaim: false, humanResearchGatePassed: false, limitations: ['One AI operator versus deterministic replay, not equal human arms', 'Small authored challenge set, no held-out generalization', 'Legacy P5 negative speed evidence remains separate', 'No claim of climate outcomes, novelty ranking or judge score'] });
}

if (import.meta.main) {
  const [command, directory, ...extra] = process.argv.slice(2);
  if (!directory || extra.length || !['prepare', 'run', 'analyze'].includes(command || '')) throw new Error('Usage: bun --no-env-file scripts/product-value-evaluation.ts prepare|run|analyze NEW_PACKET_DIRECTORY');
  if (command === 'prepare') await prepare(resolve(directory));
  if (command === 'run') await run(resolve(directory));
  if (command === 'analyze') await analyze(resolve(directory));
}
