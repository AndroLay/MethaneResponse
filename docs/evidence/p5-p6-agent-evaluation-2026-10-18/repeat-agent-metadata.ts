/** Offline comparison of provisional agent metadata labels with actual TS coverage.
 * This is not the provider benchmark and never creates gold labels.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuditScope, type ClaimType, type ResultLabel } from '../../../packages/shared/src';
import { assess, createAudit } from '../../../apps/api/src/audit';
import { loadCasebook, sourceFromCase } from '../../../apps/api/src/casebook';

const base = import.meta.dir;
const dataset = resolve(base, '../../../data/real/mars_casebook_2026-10-15.json');
const claimBytes = await readFile(resolve(base, 'p6-agent-claims.json'));
const packet = JSON.parse(claimBytes.toString()) as {
  datasetFileSha256: string;
  claims: { claimId: string; sourceId: string; claimType: ClaimType; provisionalLabel: ResultLabel; scope: unknown }[];
};
const datasetHash = createHash('sha256').update(await readFile(dataset)).digest('hex');
if (datasetHash !== packet.datasetFileSha256) throw new Error('Frozen dataset changed');
const book = await loadCasebook(dataset);
const records = packet.claims.map(claim => {
  const item = book.cases.find(c => c.sourceId === claim.sourceId);
  if (!item) throw new Error('Missing frozen case');
  const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
  const scope = AuditScope.parse(claim.scope);
  const result = assess(source, claim.claimType, scope);
  return { claimId: claim.claimId, provisionalAgentLabel: claim.provisionalLabel,
    rulesCoverageResult: result.result, reason: result.reason, evidenceIds: result.evidenceIds };
});
const report = {
  analysis: 'agent_metadata_policy_conformance', providerCalls: 0, humanGoldCount: 0,
  p6IndependentBenchmarkEligible: false,
  claimFileSha256: createHash('sha256').update(claimBytes).digest('hex'), datasetFileSha256: datasetHash,
  claimCount: records.length, sourceCount: book.cases.length,
  policyLabelMatches: records.filter(r => r.rulesCoverageResult === r.provisionalAgentLabel).length,
  records,
  limitations: [
    'The actual app TypeScript rules were run with date/event scope on the pinned metadata.',
    'Agreement with agent-derived provisional labels is policy conformance, not accuracy against independent human gold.',
    'Metadata coverage does not read the exact natural-language proposition or report body; it is not a document-assessment comparator.',
  ],
};
const output = process.argv[2];
if (!output) throw new Error('Supply a new output JSON path');
await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });

// Optional facilitator exports for the manual packet: actual baseline, not human decisions.
if (process.argv[3]) {
  const outputDirectory = resolve(process.argv[3]);
  for (const sourceId of ['LBY_S_143', 'CAN_S_002']) {
    const item = book.cases.find(c => c.sourceId === sourceId)!;
    const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
    const claim = packet.claims.find(c => c.sourceId === sourceId && c.claimType === 'mitigation_confirmed')!;
    const audit = createAudit(source, { sourceId, claimType: 'mitigation_confirmed', scope: AuditScope.parse(claim.scope) }, { provenance: book.provenance });
    await writeFile(resolve(outputDirectory, `${sourceId}-baseline.json`), `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  }
}
process.stdout.write(JSON.stringify({ recordedClaims: records.length, providerCalls: 0, independentBenchmark: false }) + '\n');
