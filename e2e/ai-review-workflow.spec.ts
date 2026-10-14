import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';
import { unexpectedCredentialEnvironmentNames } from './environment-assertions';

const fixtureTitle = 'SYNTHETIC E2E FIXTURE — not source evidence';
const fixtureQuote = 'A maintenance log records replacement of compressor valve KV-17 on 20 August 2026.';
const fixtureExcerpt = `${fixtureTitle}. ${fixtureQuote} This generated test text contains no independent follow-up methane measurement and is not an operator record.`;

type ExportedReview = {
  latestAudit?: {
    auditId?: string;
    sourceId?: string;
    claimType?: string;
    result?: string;
    revision?: number;
    bundleHash?: string;
    anchored?: boolean;
    synthetic?: boolean;
    bundle?: {
      reason?: string;
      intelligence?: {
        reviewStatus?: string;
        quotations?: Array<{ documentId: string; quote: string }>;
        documentDigests?: Array<{ title: string }>;
        review?: { reviewerId?: string; note?: string; sourceInspected?: boolean; parentBundleHash?: string };
        citationPublication?: { status?: string; authorConsent?: boolean };
      };
    };
  };
  sourceDataset?: { snapshotId?: string };
};

test('local mock AI citations receive a separate scoped review and remain private until publication consent', async ({ page }) => {
  expect(unexpectedCredentialEnvironmentNames([
    'METHANE_E2E_AI_ACCESS_TOKEN',
    'METHANE_E2E_REVIEWER_SECRET',
  ])).toEqual([]);
  const aiAccessToken = process.env.METHANE_E2E_AI_ACCESS_TOKEN;
  const reviewerSecret = process.env.METHANE_E2E_REVIEWER_SECRET;
  expect(aiAccessToken).toBeTruthy();
  expect(reviewerSecret).toBeTruthy();
  const reviewerToken = issueReviewerToken(reviewerSecret!, 'e2e-reviewer', ['review'], 600);

  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  const statusResponse = await page.request.get(new URL('/api/intelligence/status', 'http://127.0.0.1:4179').toString());
  const capability = await statusResponse.json();
  expect(capability).toMatchObject({
    documentModelConfigured: true,
    humanReviewConfigured: true,
    chainConfigured: false,
    chainWriteConfigured: false,
    modelMode: 'server-side-document-assessment',
  });
  expect(JSON.stringify(capability)).not.toContain(aiAccessToken);
  expect(JSON.stringify(capability)).not.toContain(reviewerSecret);

  // A malformed body is rejected only after the API accepts the ephemeral test token.
  // This checks the runner-to-server environment boundary without invoking the provider.
  const tokenProbe = await page.request.post('http://127.0.0.1:4179/api/intelligence/assessments', {
    headers: { authorization: `Bearer ${aiAccessToken}` },
    data: {},
  });
  expect(tokenProbe.status(), 'ephemeral assessment token reaches the isolated API process').toBe(400);

  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await expect(page.getByText('KAZ_S_159 · Evidence inventory')).toBeVisible();
  await expect(page.getByText('DOCUMENT AI AVAILABLE', { exact: true })).toBeVisible();

  await page.getByLabel('Source document title').fill(fixtureTitle);
  await page.getByLabel('Document processing rights').selectOption('owned');
  await page.getByLabel('Authorized document excerpt').fill(fixtureExcerpt);
  await page.getByLabel('Assessment access token (session only)').fill(aiAccessToken!);
  await page.getByLabel(/I am authorized to process this text and consent to transmission/).check();

  await page.getByRole('button', { name: 'Assess documented claim' }).click();
  await expect(page.getByText(/AI suggestion · insufficient evidence/i)).toBeVisible();
  const mockAiPort = process.env.METHANE_E2E_MOCK_AI_PORT || '43140';
  const earlyMetricsResponse = await page.request.get(`http://127.0.0.1:${mockAiPort}/metrics`);
  expect(earlyMetricsResponse.ok()).toBe(true);
  const earlyMetrics = await earlyMetricsResponse.json();
  expect(earlyMetrics, 'the API should make a grounded first pass and a skeptical second pass').toMatchObject({
    totalRequests: 2,
    firstPassRequests: 1,
    skepticalPassRequests: 1,
    sourceIdMatches: true,
    claimTypeMatches: true,
    exactInputQuoteMatches: true,
    skepticalQuoteMatches: true,
  });
  const evidenceRegion = page.getByRole('region', { name: 'Evidence and predictive' });
  await expect(evidenceRegion.getByText('The exact submitted passages were not conclusive for this claim; human review is required.')).toBeVisible();
  await expect(evidenceRegion.locator('blockquote')).toContainText(fixtureQuote);
  await expect(evidenceRegion.locator('blockquote')).toContainText(fixtureTitle);

  await page.getByLabel('Human reviewer token (session only)').fill(reviewerToken);
  await page.getByLabel('Review note').fill('Request an independent follow-up measurement before evaluating the outcome.');
  await page.getByRole('button', { name: 'Request more evidence' }).click();
  await expect(page.getByText(/Human review: more evidence requested · insufficient evidence/i)).toBeVisible();
  await expect(page.getByText(/Revision 2 · 1 exact validated quotation/)).toBeVisible();
  await expect(page.getByText(/report private/)).toBeVisible();

  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Reports' }).click();
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const download = await downloadReady;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadedPath!, 'utf8')) as ExportedReview;
  const audit = exported.latestAudit;
  expect(exported.sourceDataset?.snapshotId).toBe('unep-mars-675417694883');
  expect(audit).toMatchObject({
    sourceId: 'KAZ_S_159',
    claimType: 'mitigation_confirmed',
    result: 'insufficient_evidence',
    revision: 2,
    anchored: false,
    synthetic: false,
    bundle: {
      intelligence: {
        reviewStatus: 'needs_more_evidence',
        review: {
          reviewerId: 'e2e-reviewer',
          note: 'Request an independent follow-up measurement before evaluating the outcome.',
          sourceInspected: false,
        },
        citationPublication: { status: 'private', authorConsent: false },
      },
    },
  });
  expect(audit?.bundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(audit?.bundle?.intelligence?.review?.parentBundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(audit?.bundle?.intelligence?.review?.parentBundleHash).not.toBe(audit?.bundleHash);
  expect(audit?.bundle?.intelligence?.quotations).toEqual([
    expect.objectContaining({ documentId: 'submitted-excerpt-01', quote: fixtureQuote }),
  ]);
  expect(audit?.bundle?.intelligence?.documentDigests).toEqual([
    expect.objectContaining({ title: fixtureTitle }),
  ]);
  expect(audit?.bundle?.reason).toContain('Reviewer requested additional evidence');
  expect(JSON.stringify(exported)).not.toContain(fixtureExcerpt);

  const privateReportPath = `/api/audits/${encodeURIComponent(audit!.auditId!)}`;
  expect((await page.request.get(privateReportPath)).status()).toBe(404);
  expect((await page.request.get(privateReportPath, {
    headers: { authorization: `Bearer ${aiAccessToken}` },
  })).status()).toBe(404);
  expect((await page.request.get(privateReportPath, {
    headers: { authorization: `Bearer ${reviewerToken}` },
  })).status()).toBe(404);

  const providerMetricsResponse = await page.request.get(`http://127.0.0.1:${mockAiPort}/metrics`);
  expect(providerMetricsResponse.ok()).toBe(true);
  expect(await providerMetricsResponse.json()).toMatchObject({
    totalRequests: 2,
    firstPassRequests: 1,
    skepticalPassRequests: 1,
    sourceIdMatches: true,
    claimTypeMatches: true,
    exactInputQuoteMatches: true,
    skepticalQuoteMatches: true,
  });

  await page.getByRole('button', { name: 'Blockchain' }).click();
  await page.getByLabel('Choose a JSON audit report').setInputFiles(downloadedPath!);
  await expect(page.getByText('Audit bundle SHA-256 digest matches.', { exact: true })).toBeVisible();
  await expect(page.getByText('No blockchain receipt is included in this file.', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
