import { InvestigationDecision, verifyInvestigationDecision } from './investigation-decision';

/** Render user text as inert Markdown, including in HTML-enabled readers. */
function text(value: unknown): string {
  const valueText = typeof value === 'string' && value.trim() ? value : 'Not recorded';
  return valueText.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\`*_{}\[\]()#+.!|~>-])/g, '\\$1').replace(/\r?\n/g, ' ');
}

const dispositions = {
  accept_assessment: 'Accept the assessment',
  request_more_evidence: 'Request further evidence',
  reject_assessment: 'Reject the assessment',
};
const claims = {
  source_detected: 'Was this source detected?',
  operator_notified: 'Was the specified recipient notified?',
  mitigation_confirmed: 'Was mitigation completed and confirmed?',
};

/** A readable derivative of a verified frozen decision, never a replacement trust anchor. */
export async function investigationBrief(raw: unknown, expectedDigest: string): Promise<string> {
  const decisionRaw = raw && typeof raw === 'object' && 'decision' in raw ? raw.decision : raw;
  if (!/^0x[a-f0-9]{64}$/.test(expectedDigest) || !await verifyInvestigationDecision(decisionRaw, expectedDigest)) {
    throw new Error('Decision failed trusted-digest or dossier validation; no brief was produced.');
  }
  const decision = InvestigationDecision.parse(decisionRaw);
  const dossier = decision.dossier, work = dossier.history.at(-1)!;
  const assessment = dossier.assessments.find(a => a.bundleHash === work.assessmentLink!.bundleHash)!.bundle;
  const human = assessment.humanAssessment as Record<string, unknown> | undefined;
  const ai = assessment.intelligence as Record<string, unknown> | undefined;
  const lines = [
    '# MethaneResponse — Investigation handoff', '',
    '> PRIVATE WORKING MATERIAL. Check permission and redact personal or confidential information before sharing.', '',
    'This is a readable derivative of a frozen decision verified against a separately supplied digest. Keep the original JSON and trusted pin. Editing this Markdown does not update the decision or its commitment.', '',
    '## Decision at a glance', '',
    `- **Source:** ${text(dossier.context.sourceId)}`,
    `- **Dataset snapshot:** ${text(dossier.context.datasetSnapshotId)}`,
    `- **Archive SHA-256:** ${text(dossier.context.archiveSha256)}`,
    `- **Record context:** ${dossier.context.synthetic ? 'DEMO synthetic source' : 'Historical source metadata; working statements and reviewer identity require separate validation'}`,
    `- **Work item:** ${text(dossier.workId)}`,
    `- **Frozen decision revision:** ${decision.revision}`,
    `- **Work revision at freeze:** ${work.revision}`,
    `- **Decision:** ${dispositions[decision.disposition]}`,
    `- **Reviewer identifier recorded:** ${text(decision.reviewerId)}`,
    `- **Reviewed at (UTC):** ${text(decision.reviewedAt)}`, '',
    '## Claim under review', '',
    `- **Question:** ${claims[work.claimType]}`,
    `- **Exact assessment claim:** ${text(human?.claimText ?? ai?.claimText)}`,
    `- **Investigation question:** ${text(work.question)}`,
    `- **Period (UTC, inclusive):** ${text(work.scope!.startDate)} through ${text(work.scope!.endDate)}`,
    `- **Observation restriction:** ${text(work.scope!.observationId)}`,
    `- **Notification recipient restriction:** ${text(work.scope!.recipient)}`, '',
    'The claim type is a question being examined, not a finding that mitigation occurred.', '',
    '## Assessment and rationale', '',
    `- **Recorded assessment result:** ${text(assessment.result)}`,
    `- **Assessment method:** ${human ? 'Recorded reviewer assessment' : ai ? 'Model-assisted assessment with recorded review' : 'Rules baseline'}`,
    `- **Assessment reason:** ${text(assessment.reason)}`,
    `- **Decision rationale:** ${text(decision.rationale)}`, '',
    '## Actionable follow-up', '',
    `- **Assignee:** ${text(work.assignee)}`,
    `- **Work due date:** ${text(work.dueDate)}`,
    `- **Next action:** ${text(work.nextAction)}`,
    `- **Evidence to request:** ${text(work.evidenceRequest)}`,
    `- **Acceptance criteria:** ${text(work.acceptanceCriteria)}`, '',
    'Missing assignments or deadlines are shown as Not recorded. Exporting does not send a request or contact an operator.', '',
    '### Structured evidence requests', '',
  ];
  const events = work.requestEvents || [], requests = events.filter(e => e.type === 'issued');
  if (!requests.length) lines.push('No structured request was recorded. The free-text follow-up above may still be incomplete.', '');
  for (const event of requests) {
    lines.push(`#### Request ${text(event.requestId)}`, '',
      `- **Recipient role:** ${text(event.recipientRole)}`,
      `- **Due date:** ${text(event.dueDate)}`,
      `- **Required material:** ${text(event.requirement)}`,
      `- **Acceptance criteria:** ${text(event.acceptanceCriteria)}`);
    const responses = events.filter(e => e.type === 'response_received' && e.requestId === event.requestId);
    if (!responses.length) lines.push('- **Responses at freeze:** None recorded');
    for (const response of responses) {
      if (response.type !== 'response_received') continue;
      lines.push(`- **Response identifier:** ${text(response.responseId)}`,
        `  - Reference: ${text(response.reference)}`,
        `  - Locator: ${text(response.locator)}`,
        `  - Original-file SHA-256: ${text(response.sha256)}`,
        `  - Reported document date: ${response.reportedDate.precision === 'unknown' ? 'Unknown' : text(response.reportedDate.value)} (precision: ${response.reportedDate.precision})`,
        `  - Declared processing rights: ${text(response.rights)}`);
      const review = events.find(e => e.type === 'response_reviewed' && e.responseId === response.responseId);
      lines.push(`  - Review: ${review?.type === 'response_reviewed' ? text(review.decision) : 'Not recorded'}`);
      if (review?.type === 'response_reviewed') lines.push(`  - Review rationale: ${text(review.rationale)}`);
    }
    lines.push('');
  }
  lines.push('## Provenance and verification', '',
    `- Decision digest: \`${decision.digest}\``,
    `- Dossier digest: \`${dossier.digest}\``,
    `- Assessment bundle digest: \`${work.assessmentLink!.bundleHash}\``,
    `- Previous decision digest: ${text(decision.previousDigest)}`,
    `- Accepted plan: ${work.planLink ? `${text(work.planLink.planId)}, revision ${work.planLink.revision}, strategy ${text(work.planLink.strategy)}` : 'Not recorded'}`,
    '- Verification performed by this exporter: canonical decision integrity and dossier replay against the supplied pin.',
    '- Blockchain verification: NOT PERFORMED by this exporter. A receipt in an envelope is not independently verified here.',
    '- Reviewer identity: a recorded identifier is not independent identity verification; DEMO reviewers remain software fixtures.', '',
    'To replay the JSON from the repository root, substitute the actual file path:', '',
    '```bash',
    `bun run verify:investigation-decision path/to/decision.json --expected-digest ${decision.digest}`,
    '```', '',
    '## Limits and next review', '',
    '- This brief describes the frozen decision only. Later responses and revisit signals require the current investigation export; they do not rewrite this decision.',
    '- Historical satellite observations are discrete estimates, not a live feed or continuous monitoring.',
    '- Feedback does not establish repair. Missing later observations do not establish zero emissions.',
    '- AI advice, reviewer records and cryptographic integrity do not establish physical mitigation or emissions reduction.',
    '- User productivity and institutional effectiveness have not been established by this export.',
    ...dossier.limitations.map(limit => `- ${text(limit)}`), '',
  );
  return lines.join('\n');
}
