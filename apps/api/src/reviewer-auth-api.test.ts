import { expect, test } from 'bun:test';
import { DocumentAssessmentInput, createDocumentAudit } from './ai-review';
import { createApp } from './app';
import { sourceFromCase, loadCasebook } from './casebook';
import { issueReviewerToken } from './reviewer-auth';
import { MemoryAuditStore } from './store';

test('private audit verification and reviewer actions enforce separate capabilities', async () => {
  const names = ['REVIEWER_AUTH_SECRET', 'HUMAN_REVIEW_TOKEN', 'HUMAN_REVIEWER_ID', 'ADMIN_API_TOKEN'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const secret = 'reviewer-test-secret-' + 'r'.repeat(48);
  try {
    process.env.REVIEWER_AUTH_SECRET = secret;
    for (const name of names.slice(1)) delete process.env[name];
    const book = await loadCasebook();
    const item = book.cases[0];
    const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
    const input = DocumentAssessmentInput.parse({
      sourceId: source.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{ id: 'review-note', title: 'Authorized review note', rightsDeclared: 'explicit_permission', text: 'The operator described an inspection, but no independent measurement verifies sustained emission reduction.' }],
    });
    const store = new MemoryAuditStore();
    const draft = await store.create(item.caseId, source.sourceId, input.claimType, revision => createDocumentAudit(input, source, {
      verdict: 'insufficient_evidence', reason: 'The excerpt does not establish sustained mitigation.',
      citations: [{ documentId: 'review-note', quote: 'no independent measurement verifies sustained emission reduction' }],
    }, revision, { caseId: item.caseId, externalEvidence: [], provenance: book.provenance }));
    const api = createApp(store);
    const reviewToken = issueReviewerToken(secret, 'reviewer-alice', ['review'], 600);
    const readToken = issueReviewerToken(secret, 'auditor-bob', ['private_read'], 600);
    const anchorToken = issueReviewerToken(secret, 'anchor-carol', ['anchor'], 600);

    const hidden = await api.request(`/api/audits/${draft.auditId}/verify`);
    expect(hidden.status).toBe(404);
    expect(hidden.headers.get('cache-control')).toContain('no-store');
    expect(hidden.headers.get('vary')?.toLowerCase()).toContain('authorization');
    expect((await api.request(`/api/audits/${draft.auditId}/verify`, { headers: { authorization: `Bearer ${reviewToken}` } })).status).toBe(404);

    const allowedRead = await api.request(`/api/audits/${draft.auditId}/verify`, { headers: { authorization: `Bearer ${readToken}` } });
    expect(allowedRead.status).toBe(200);
    expect(allowedRead.headers.get('cache-control')).toContain('no-store');

    const reviewed = await api.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers: { authorization: `Bearer ${reviewToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'needs_more_evidence', note: 'Request a field measurement with a traceable observation record.' }),
    });
    expect(reviewed.status).toBe(201);
    expect((await reviewed.json()).audit.bundle.intelligence.review.reviewerId).toBe('reviewer-alice');

    const wrongScope = await api.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers: { authorization: `Bearer ${anchorToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', note: 'The selected evidence remains insufficient.' }),
    });
    expect(wrongScope.status).toBe(401);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('production legacy reviewer compatibility never grants the anchor capability', async () => {
  const names = [
    'NODE_ENV', 'ALLOW_LEGACY_SHARED_REVIEWER_TOKEN', 'REVIEWER_AUTH_SECRET', 'HUMAN_REVIEW_TOKEN',
    'HUMAN_REVIEWER_ID', 'ADMIN_API_TOKEN', 'AI_REVIEW_TOKEN',
  ] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const legacyToken = 'legacy-production-reviewer-' + 'k'.repeat(40);
  try {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LEGACY_SHARED_REVIEWER_TOKEN = 'true';
    process.env.HUMAN_REVIEW_TOKEN = legacyToken;
    process.env.HUMAN_REVIEWER_ID = 'legacy-reviewer';
    for (const name of ['REVIEWER_AUTH_SECRET', 'ADMIN_API_TOKEN', 'AI_REVIEW_TOKEN'] as const) delete process.env[name];

    const book = await loadCasebook();
    const item = book.cases[0];
    const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
    const excerpt = 'The operator described an inspection, but no independent measurement verifies sustained emission reduction.';
    const input = DocumentAssessmentInput.parse({
      sourceId: source.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{ id: 'review-note', title: 'Authorized review note', rightsDeclared: 'explicit_permission', text: excerpt }],
    });
    const store = new MemoryAuditStore();
    const draft = await store.create(item.caseId, source.sourceId, input.claimType, revision => createDocumentAudit(input, source, {
      verdict: 'insufficient_evidence', reason: 'The excerpt does not establish sustained mitigation.',
      citations: [{ documentId: 'review-note', quote: excerpt }],
    }, revision, { caseId: item.caseId, externalEvidence: [], provenance: book.provenance }));
    const api = createApp(store);
    const headers = { authorization: `Bearer ${legacyToken}`, 'content-type': 'application/json' };

    expect((await api.request(`/api/audits/${draft.auditId}/verify`, { headers })).status).toBe(200);
    const review = await api.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers, body: JSON.stringify({ status: 'needs_more_evidence', note: 'Request a traceable follow-up measurement.' }),
    });
    expect(review.status).toBe(201);
    const revised = (await review.json()).audit;
    const anchor = await api.request(`/api/audits/${revised.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${legacyToken}` },
    });
    expect(anchor.status).toBe(401);
    const reconcile = await api.request(`/api/audits/${revised.auditId}/reconcile`, {
      method: 'POST', headers, body: JSON.stringify({}),
    });
    expect(reconcile.status).toBe(401);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
