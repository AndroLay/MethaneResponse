import { expect, test } from 'bun:test';
import { DocumentAssessmentInput, HumanReviewInput, verifyCitations, createDocumentAudit, createReviewedAudit, isAllowedAiBaseUrl } from './ai-review';
import { auditIntegrityValid } from './integrity';
import { sourceFromCase } from './casebook';
import { loadCasebook } from './casebook';
import { FileAuditStore } from './store';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const sample = { sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed' as const, claimText: 'The operator completed a repair at source KAZ_S_159 on 2026-09-10 and verified a sustained reduction in methane emissions.', consentToExternalProcessing: true as const, documents: [{ id: 'operator-log', title: 'Submitted field report', rightsDeclared: 'explicit_permission' as const, text: 'The team inspected the facility and reported an investigation was opened. Repairs have not yet been independently verified by the regulator.' }] };
test('AI provider URLs require HTTPS except for local development and reject embedded credentials', () => {
  expect(isAllowedAiBaseUrl('https://provider.example/v1')).toBe(true);
  expect(isAllowedAiBaseUrl('http://localhost:8080/v1')).toBe(true);
  expect(isAllowedAiBaseUrl('http://127.0.0.1:8080/v1')).toBe(true);
  expect(isAllowedAiBaseUrl('http://provider.example/v1')).toBe(false);
  expect(isAllowedAiBaseUrl('https://user:secret@provider.example/v1')).toBe(false);
  expect(isAllowedAiBaseUrl('not a URL')).toBe(false);
});
test('published source URLs cannot disclose embedded credentials', () => {
  const unsafe = DocumentAssessmentInput.safeParse({
    ...sample,
    documents: [{ ...sample.documents[0], sourceUrl: 'https://reviewer:secret@example.org/inspection' }],
  });
  expect(unsafe.success).toBe(false);
});
test('document assessment requires an explicit rights declaration for every excerpt', () => {
  const { rightsDeclared: _rightsDeclared, ...unverifiedDocument } = sample.documents[0];
  const unverified = DocumentAssessmentInput.safeParse({ ...sample, documents: [unverifiedDocument] });
  expect(unverified.success).toBe(false);
  if (!unverified.success) {
    expect(unverified.error.issues.some((issue) => issue.path.join('.') === 'documents.0.rightsDeclared')).toBe(true);
  }
});
test('v3 document digest retains original-file and selected-page provenance', async () => {
  const pageDigest = 'b'.repeat(64);
  const originalDigest = 'a'.repeat(64);
  const parsed = DocumentAssessmentInput.parse({
    ...sample,
    documents: [{ ...sample.documents[0], originalFileSha256: originalDigest, rightsDeclared: 'explicit_permission', selectedPages: [{ page: 2, textSha256: pageDigest }] }],
  });
  const book = await loadCasebook();
  const source = sourceFromCase(book.cases[0], book.provenance.catalogUrl, book.provenance);
  const matchingInput = { ...parsed, sourceId: source.sourceId };
  const audit = createDocumentAudit(matchingInput, source, {
    verdict: 'insufficient_evidence', reason: 'The excerpt does not establish verified mitigation.',
    citations: [{ documentId: 'operator-log', quote: 'Repairs have not yet been independently verified' }],
  }, 1, { caseId: book.cases[0].caseId, externalEvidence: [] });
  expect(audit.bundle.intelligence?.documentDigests[0]).toMatchObject({
    originalFileSha256: originalDigest,
    rightsDeclared: 'explicit_permission',
    selectedPages: [{ page: 2, textSha256: pageDigest }],
  });
  const incomplete = DocumentAssessmentInput.safeParse({
    ...sample,
    documents: [{ ...sample.documents[0], originalFileSha256: originalDigest }],
  });
  expect(incomplete.success).toBe(false);
});
test('nonexistent AI quotations force abstention', () => {
  const parsed = DocumentAssessmentInput.parse(sample);
  const result = verifyCitations(parsed, { verdict: 'supported', reason: 'This report documents a completed repair.', citations: [{ documentId: 'operator-log', quote: 'The leak was definitely repaired on Friday' }] });
  expect(result.result).toBe('insufficient_evidence');
});
test('model narrative is not persisted because it may echo private excerpt text', () => {
  const parsed = DocumentAssessmentInput.parse(sample);
  const result = verifyCitations(parsed, {
    verdict: 'supported',
    reason: sample.documents[0].text,
    citations: [{ documentId: 'operator-log', quote: 'The team inspected the facility' }],
  });
  expect(result.result).toBe('supported');
  expect(result.reason).not.toContain(sample.documents[0].text);
  expect(result.reason).toContain('authenticity');
});
test('v3 document bundle is canonically verifiable without external model', async () => {
  const book = await loadCasebook();
  const source = sourceFromCase(book.cases[0], book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const audit = createDocumentAudit(parsed, source, { verdict: 'insufficient_evidence', reason: 'The report confirms an investigation but does not verify mitigation.', citations: [{ documentId: 'operator-log', quote: 'Repairs have not yet been independently verified' }] }, 1, { caseId: book.cases[0].caseId, externalEvidence: [], provenance: book.provenance });
  expect(audit.bundle.schemaVersion).toBe(3);
  expect(auditIntegrityValid(audit)).toBe(true);
  expect(audit.bundle.intelligence?.reviewStatus).toBe('unreviewed');
  expect(audit.bundle.intelligence?.claimText).toBe(sample.claimText);
  expect(audit.bundle.intelligence?.claimTextSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit.bundle.intelligence?.assessmentInputSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit.bundle.intelligence?.claimPublication).toMatchObject({ status: 'private', authorConsent: false });
  expect(JSON.stringify(audit.bundle)).not.toContain(sample.documents[0].text);
});

test('public human review omits exact claim text unless both submitter and reviewer consent', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0];
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId, consentToPublishCitations: true });
  const draft = createDocumentAudit(parsed, source, {
    verdict: 'insufficient_evidence',
    reason: 'The excerpt does not establish the bounded physical mitigation claim.',
    citations: [{ documentId: 'operator-log', quote: 'Repairs have not yet been independently verified by the regulator' }],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [] });
  const publishedWithoutClaim = createReviewedAudit(draft, 2, 'independent-reviewer', HumanReviewInput.parse({
    status: 'approved', note: 'Public citation is approved while the exact claim remains private.', sourceInspected: true, publishCitations: true,
  }));
  expect(publishedWithoutClaim.bundle.intelligence?.claimText).toBeUndefined();
  expect(publishedWithoutClaim.bundle.intelligence?.claimTextSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(auditIntegrityValid(publishedWithoutClaim)).toBe(true);

  expect(() => createReviewedAudit(draft, 2, 'independent-reviewer', HumanReviewInput.parse({
    status: 'approved', note: 'Claim text publication was requested without submitter consent.', sourceInspected: true,
    publishCitations: true, publishClaimText: true,
  }))).toThrow('Submitter consent is required before the claim text can be published');
});

test('document rights declaration is covered by the canonical audit hash', async () => {
  const book = await loadCasebook();
  const source = sourceFromCase(book.cases[0], book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const audit = createDocumentAudit(parsed, source, {
    verdict: 'insufficient_evidence', reason: 'The excerpt does not establish physical mitigation.', citations: [],
  }, 1, { caseId: book.cases[0].caseId, externalEvidence: [], provenance: book.provenance });
  const tampered = structuredClone(audit);
  tampered.bundle.intelligence!.documentDigests[0]!.rightsDeclared = 'owned';

  expect(audit.bundle.intelligence?.documentDigests[0]?.rightsDeclared).toBe('explicit_permission');
  expect(auditIntegrityValid(audit)).toBe(true);
  expect(auditIntegrityValid(tampered)).toBe(false);
});

test('review is a new immutable bundle version; original stays verifiable', async () => {
  const book = await loadCasebook();
  const source = sourceFromCase(book.cases[0], book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const draft = createDocumentAudit(parsed, source, { verdict: 'supported', reason: 'The submitted quote documents a report of investigation, not a physical repair.', citations: [{ documentId: 'operator-log', quote: 'The team inspected the facility' }] }, 1, { caseId: book.cases[0].caseId, externalEvidence: [] });
  const reviewed = createReviewedAudit(draft, 2, 'independent-analyst', { status: 'rejected', note: 'Insufficient independent mitigation documentation', sourceInspected: false, publishCitations: false });
  expect(auditIntegrityValid(draft)).toBe(true);
  expect(auditIntegrityValid(reviewed)).toBe(true);
  expect(reviewed.bundle.intelligence?.reviewStatus).toBe('rejected');
  expect(reviewed.bundle.intelligence?.review?.parentBundleHash).toBe(draft.bundleHash);
  expect(reviewed.bundleHash).not.toBe(draft.bundleHash);
  expect(reviewed.anchored).toBe(false);
});

test('requesting more evidence creates a distinct abstaining review revision', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0];
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const draft = createDocumentAudit(parsed, source, {
    verdict: 'supported',
    reason: 'The excerpt supports an operator response, but physical mitigation is not established.',
    citations: [{ documentId: 'operator-log', quote: 'The team inspected the facility' }],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [] });

  const decision = HumanReviewInput.parse({
    status: 'needs_more_evidence',
    note: 'Request an independently verifiable post-repair observation.',
  });
  const reviewed = createReviewedAudit(draft, 2, 'independent-analyst', decision);

  expect(reviewed.result).toBe('insufficient_evidence');
  expect(reviewed.bundle.intelligence?.reviewStatus).toBe('needs_more_evidence');
  expect(reviewed.bundle.intelligence?.review?.parentBundleHash).toBe(draft.bundleHash);
  expect(reviewed.bundleHash).not.toBe(draft.bundleHash);
  expect(auditIntegrityValid(reviewed)).toBe(true);
  expect(auditIntegrityValid(draft)).toBe(true);
});

test('approval requires an inspected source and at least one exact validated quotation', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0];
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const draft = createDocumentAudit(parsed, source, {
    verdict: 'insufficient_evidence',
    reason: 'No exact passage was returned from the supplied document excerpt.',
    citations: [],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [] });

  const review = HumanReviewInput.parse({
    status: 'approved', note: 'Reviewed the available source context and assessment.', sourceInspected: true,
  });
  expect(() => createReviewedAudit(draft, 2, 'independent-reviewer', review)).toThrow('at least one exact validated quotation');
  expect(draft.bundle.intelligence?.reviewStatus).toBe('unreviewed');
});

test('v3 draft and human review revisions remain available after reopening the file store', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0];
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const parsed = DocumentAssessmentInput.parse({ ...sample, sourceId: source.sourceId });
  const directory = await mkdtemp(join(tmpdir(), 'methane-v3-store-'));
  const path = join(directory, 'audits.json');
  try {
    const firstProcess = new FileAuditStore(path);
    const draft = await firstProcess.create(sourceCase.caseId, source.sourceId, parsed.claimType, revision => createDocumentAudit(
      parsed,
      source,
      { verdict: 'insufficient_evidence', reason: 'The excerpt does not document a verified mitigation outcome.', citations: [{ documentId: 'operator-log', quote: 'Repairs have not yet been independently verified' }] },
      revision,
      { caseId: sourceCase.caseId, externalEvidence: [], provenance: book.provenance, observationIds: sourceCase.plumes.map(item => item.plumeId) },
    ));
    const reopened = new FileAuditStore(path);
    expect((await reopened.get(draft.auditId))?.bundleHash).toBe(draft.bundleHash);
    const reviewed = await reopened.create(sourceCase.caseId, source.sourceId, parsed.claimType, revision => createReviewedAudit(
      draft,
      revision,
      'independent-reviewer',
      { status: 'rejected', note: 'More independently verifiable mitigation evidence is required.', sourceInspected: false, publishCitations: false },
    ));
    const restartedAgain = new FileAuditStore(path);
    expect((await restartedAgain.list(source.sourceId, parsed.claimType)).map(item => item.revision).sort()).toEqual([1, 2]);
    expect((await restartedAgain.get(draft.auditId))?.bundle.intelligence?.reviewStatus).toBe('unreviewed');
    expect((await restartedAgain.get(reviewed.auditId))?.bundle.intelligence?.reviewStatus).toBe('rejected');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
