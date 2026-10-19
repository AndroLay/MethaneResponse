import { claimRequirements, getInvestigationPlan } from './investigation-plan';
import { assessmentPresentation } from '@methane/shared';
import type { buildReportExportPayload } from './report-export';

type BriefInput = ReturnType<typeof buildReportExportPayload> & {
  exportIntegrity?: { sha256: string };
};

function text(value: unknown): string {
  return String(value ?? 'Not recorded').replace(/[\r\n]+/g, ' ').replace(/[\\`*_[\]<>#|]/g, '\\$&');
}

function reference(title: string, value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) {
      const safeUrl = url.href.replace(/[()<>]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
      return `[${text(title)}](${safeUrl})`;
    }
  } catch { /* A non-public fixture reference stays plain text. */ }
  return `${text(title)} · reference: ${text(value)}`;
}

/** A readable companion built from the same snapshot-bound payload as the JSON verifier artifact. */
export function buildInvestigationBrief(report: BriefInput): string {
  const audit = report.latestAudit;
  const dataset = report.sourceDataset && typeof report.sourceDataset === 'object' ? report.sourceDataset as Record<string, unknown> : {};
  const observations = report.historicalContext?.observations || report.observations;
  const ordered = [...observations].sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  const intelligence = audit?.bundle.intelligence;
  const publicClaim = intelligence?.reviewStatus === 'approved' && intelligence.claimPublication?.status === 'public' && intelligence.claimPublication.authorConsent === true;
  const publicAssessment = intelligence?.reviewStatus === 'approved' && intelligence.citationPublication?.status === 'public' && intelligence.citationPublication.authorConsent === true && (!intelligence.claimText || publicClaim);
  const humanAssessment = audit?.bundle.humanAssessment;
  const privateAssessment = Boolean(humanAssessment || audit?.bundle.scope?.recipient || (intelligence && !publicAssessment));
  const evidence = privateAssessment ? [] : audit?.bundle.citedEvidence || [];
  const plan = getInvestigationPlan({ sourceId: report.selectedSourceId, evidence, externalEvidence: report.externalEvidence, observations: report.observations }, report.claim, audit);
  const lines = [
    `# MethaneResponse investigation brief · ${text(report.selectedSourceId)}`,
    '',
    report.synthetic ? '**SYNTHETIC DEMO — no real-world mitigation is established.**' : '**Historical source evidence — research prototype.**',
    ...(privateAssessment ? ['', '**PRIVATE REVIEW DRAFT — publication is not authorized. Private document details and free-text reasoning are omitted from this brief.**'] : []),
    '',
    `Generated: ${text(report.generatedAt)}`,
    '',
    '## Decision and scope',
    '',
    `- Source: ${text(report.selectedSourceId)}`,
    `- Claim: ${text(claimRequirements[report.claim].title)}`,
    `- Assessment: ${audit ? text(assessmentPresentation(audit.bundle).resultLabel) : 'Not assessed'}`,
    ...(audit ? [`- Assessment basis: ${text(assessmentPresentation(audit.bundle).basisLabel)}`, `- ${assessmentPresentation(audit.bundle).physicalLabel}`] : []),
    `- Method: ${humanAssessment ? 'Human evidence assessment' : intelligence ? `Document assessment · ${text(intelligence.modelVersion)}` : audit ? 'Deterministic reference-coverage baseline' : 'Source context only'}`,
    `- Human review: ${humanAssessment ? 'Human determination · private; source inspection is self-attested' : intelligence ? text(intelligence.reviewStatus.replaceAll('_', ' ')) : 'No human review recorded'}`,
    ...(!privateAssessment && audit?.bundle.scope ? [`- Period: ${text(audit.bundle.scope.startDate)} to ${text(audit.bundle.scope.endDate)}`, `- Observation: ${text(audit.bundle.scope.observationId)}`, `- Intended recipient: ${text(audit.bundle.scope.recipient)}`] : []),
    ...(intelligence?.claimText && publicClaim ? [`- Exact claim assessed: ${text(intelligence.claimText)}`] : intelligence?.claimText ? ['- Exact claim wording omitted: not approved for public sharing.'] : []),
    ...(audit ? [`- Revision: ${audit.revision} · saved ${text(audit.generatedAt)}`, `- Audit ID: ${text(audit.auditId)}`] : []),
    '',
    privateAssessment ? 'The saved document assessment remains private. Review the JSON report in an authorized session; free-text reasoning, document references and reviewer notes are omitted from this brief.' : text(audit?.reason || 'No saved assessment exists for this source context.'),
    '',
    '## Source and dataset binding',
    '',
    `- Dataset snapshot: ${text(dataset.snapshotId)}`,
    `- Source archive SHA-256: ${text(dataset.archiveSha256)}`,
    `- Dataset license: ${text(dataset.license)}`,
    `- Source context: ${text(report.sourceContextStatus.replaceAll('_', ' '))}`,
    ...(typeof dataset.sourceUrl === 'string' ? [`- ${reference('Dataset source', dataset.sourceUrl)}`] : []),
    '',
    '## Evidence cited by the saved assessment',
    '',
  ];
  if (evidence.length) for (const item of evidence) lines.push(
    `- ${reference(item.title, item.reference)}`,
    `  - ID: ${text(item.id)} · type: ${text(item.kind.replaceAll('_', ' '))} · date: ${text(item.date)}`,
  );
  else lines.push(privateAssessment ? 'Private document references are omitted. Their absence here does not mean the saved audit has no citations.' : 'No accepted citation is attached. A linked report or feedback flag does not fill this gap.');
  if (intelligence) lines.push('', `Document inputs: ${intelligence.documentDigests.length}. Quoted passages: ${intelligence.quotations.length}. Citation publication status: ${text(intelligence.citationPublication?.status || 'private')}.`,
    'Review the JSON report and document permissions before sharing assessment material. This brief does not reproduce the document quotations.');
  lines.push('', '## Historical observation context', '', 'These records provide historical context. They are not evidence that a mitigation claim is true.');
  if (report.sourceContextStatus === 'omitted_dataset_mismatch') lines.push('', 'Current observations were omitted because their source or dataset binding differs from the saved assessment.');
  else if (ordered.length) {
    lines.push('', `Showing ${Math.min(50, ordered.length)} of ${ordered.length} available context records, newest first.`, '', '| Observation ID | Date | Reported flux (kg/h) | Publisher uncertainty (kg/h) |', '|---|---|---:|---:|');
    for (const observation of ordered.slice(0, 50)) lines.push(`| ${text(observation.id)} | ${text(observation.date)} | ${Number.isFinite(observation.fluxKgHr) && observation.fluxKgHr !== null ? observation.fluxKgHr : 'Not reported'} | ${Number.isFinite(observation.uncertaintyKgHr) && observation.uncertaintyKgHr != null ? observation.uncertaintyKgHr : 'Not reported'} |`);
    lines.push('', 'Uncertainty is the publisher-reported quantity; this brief does not reinterpret it as a confidence interval. Observations are periodic, not continuous monitoring.');
  } else lines.push('', 'No observation rows are attached to this export. This is not a statement of zero emissions.');
  lines.push('', '## Linked publisher references', '', 'Link-only references: contents are not included or independently assessed by this export.');
  if (report.externalEvidence.length) for (const item of report.externalEvidence) lines.push(`- ${reference(item.title, item.url)} · ${text(item.publisher)} · ${text(item.reportDate)} · license: ${text(item.license)}`);
  else lines.push('- No publisher report link is attached.');
  lines.push('', '## Recommended next checks', '', `### ${text(plan.title)}`, '', text(plan.detail), '');
  for (const [index, step] of plan.steps.entries()) lines.push(`${index + 1}. **${text(step.title)}.** ${text(step.detail)}`);
  lines.push('', '## Integrity and limitations', '',
    ...(audit ? [`- Canonical audit bundle SHA-256: ${text(audit.bundleHash)}`, `- Chain receipt: ${audit.anchored ? 'Recorded in the JSON report; independently verify its event and issuer.' : 'Not anchored.'}`] : []),
    ...(report.exportIntegrity ? [`- Underlying JSON payload checksum: ${text(report.exportIntegrity.sha256)}`] : []),
    '- This editable Markdown brief is a readable companion. Verify the JSON artifact with the report verifier.',
    '- Separate downloads have their own export timestamps and outer checksums. Compare the canonical audit bundle hash to identify the same saved assessment.',
    '- An unsigned hash checks content against a supplied digest. It does not establish document authenticity, reviewer identity or physical truth.',
    '- A contract receipt can support integrity and chronology; it cannot prove a repair or emissions reduction.',
    ...new Set([report.disclaimer, ...(!privateAssessment ? audit?.bundle.limitations || [] : []), ...(!privateAssessment ? intelligence?.limitations || [] : [])].map(item => `- ${text(item)}`)),
    '',
  );
  return lines.join('\n');
}
