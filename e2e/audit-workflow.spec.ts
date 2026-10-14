import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type ExportedAudit = {
  sourceDataset?: { snapshotId?: string };
  latestAudit?: {
    sourceId?: string;
    claimType?: string;
    result?: string;
    synthetic?: boolean;
    bundleHash?: string;
    bundle?: { reason?: string };
  };
};

test('historical MARS case can be audited, exported, verified, and tampering is rejected', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // Keep the E2E deterministic and offline: only the local Vite/API stack is allowed.
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard/map?sourceId=KAZ_S_159');
  await expect(page.getByRole('button', { name: 'Map Explorer' })).toBeVisible();
  await expect(page.getByText('KAZ_S_159', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/unep-mars-675417694883/)).toBeVisible();

  await page.getByRole('button', { name: 'Zoom to source on globe' }).click();
  await page.getByRole('button', { name: /View full case/ }).click();
  const caseDialog = page.getByRole('dialog');
  await expect(caseDialog).toBeVisible();
  await expect(caseDialog).toContainText('KAZ_S_159');
  await caseDialog.getByRole('tab', { name: 'Observations' }).click();
  await expect(caseDialog.getByRole('table')).toBeVisible();
  await expect(caseDialog.getByRole('table')).toContainText('kg/h');
  await caseDialog.getByRole('button', { name: 'Review evidence' }).click();

  await expect(page.getByText('KAZ_S_159 · Evidence inventory')).toBeVisible();
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  await page.getByRole('button', { name: 'Run evidence audit' }).click();
  await expect(page.getByText(/No evidence of the required type\. Absence does not prove the claim is false\./)).toBeVisible();

  await page.getByRole('button', { name: 'Reports' }).click();
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toMatch(/kaz_s_159-audit\.json$/i);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();

  const exported = JSON.parse(await readFile(downloadedPath!, 'utf8')) as ExportedAudit;
  expect(exported).toMatchObject({
    sourceDataset: { snapshotId: 'unep-mars-675417694883' },
    latestAudit: {
      sourceId: 'KAZ_S_159',
      claimType: 'mitigation_confirmed',
      result: 'insufficient_evidence',
      synthetic: false,
    },
  });
  expect(exported.latestAudit?.bundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(exported.latestAudit?.bundle?.reason).toContain('No evidence of the required type');

  await page.getByRole('button', { name: 'Blockchain' }).click();
  const reportInput = page.getByLabel('Choose a JSON audit report');
  await reportInput.setInputFiles(downloadedPath!);
  await expect(page.getByText('Audit bundle SHA-256 digest matches.', { exact: true })).toBeVisible();
  await expect(page.getByText('No blockchain receipt is included in this file.', { exact: true })).toBeVisible();

  const tampered = structuredClone(exported);
  tampered.latestAudit!.bundle!.reason = `${tampered.latestAudit!.bundle!.reason} tampered`;
  await reportInput.setInputFiles({
    name: 'tampered-audit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(tampered)),
  });
  await expect(page.getByText('Audit bundle verification failed.', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
