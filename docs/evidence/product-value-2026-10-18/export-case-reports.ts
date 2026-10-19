/** Materialize local case-study reports from the frozen inputs; no HTTP or publishing. */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuditInput, type MarsCasebook } from '../../../packages/shared/src';
import { createAudit } from '../../../apps/api/src/audit';
import { sourceFromCase } from '../../../apps/api/src/casebook';
import { scopedCaseId } from '../../../apps/api/src/scoped-source';
import { addExportIntegrity, buildReportExportPayload } from '../../../apps/web/src/report-export';
import { verifyImportedAuditReport } from '../../../apps/web/src/imported-audit-verifier';

const directory = import.meta.dir;
const inputs = JSON.parse(await readFile(join(directory, 'inputs.json'), 'utf8')) as Pick<MarsCasebook, 'cases' | 'provenance'>;
const outcomes = [];
for (const item of inputs.cases) {
  const source = sourceFromCase(item, inputs.provenance.catalogUrl, inputs.provenance);
  const startDate = source.observations!.map(row => row.date.slice(0, 10)).sort()[0]!;
  const request = AuditInput.parse({ sourceId: source.sourceId, claimType: 'mitigation_confirmed', datasetSnapshotId: inputs.provenance.snapshotId, scope: { startDate, endDate: '2026-10-14' } });
  const audit = createAudit(source, request, { provenance: inputs.provenance, caseId: scopedCaseId(`mars:${inputs.provenance.snapshotId}:${source.sourceId}`, request.scope!), externalEvidence: item.externalEvidence });
  const report = await addExportIntegrity(buildReportExportPayload({ audit, claim: request.claimType, source, snapshot: null, realMode: true, generatedAt: '2026-10-18T00:00:00Z' }));
  const verification = await verifyImportedAuditReport(report, { requireExportContext: true });
  if (verification.localDigest !== 'valid' || verification.exportContext !== 'manifest_valid' || audit.result !== 'insufficient_evidence') throw new Error(`Unexpected case report result: ${source.sourceId}`);
  const name = `${source.sourceId.toLowerCase()}-mitigation-report.json`;
  await writeFile(join(directory, name), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  outcomes.push({ sourceId: source.sourceId, file: name, scope: request.scope, result: audit.result, evidenceIds: audit.evidenceIds, verification, persistedToApi: false });
}
await writeFile(join(directory, 'case-reports.json'), JSON.stringify({ kind: 'local_historical_metadata_reports', physicalMitigationEstablished: false, outcomes }, null, 2) + '\n', { flag: 'wx' });
