/**
 * Dry-run instrumentation for the practical-usefulness lab.
 *
 * IMPORTANT: every test here is a scripted Playwright flow, not an AI agent
 * episode. The records are written under runs/dry-run/ with aiAgentExecuted
 * false and scored false. They prove that the disposable browser environment,
 * the planner flow and the frozen packet are usable. They must never be
 * reported as persona performance.
 */
import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONDITION, EVIDENCE_DIRECTORY, PROTOCOL_ID, type PersonaId } from '../../scripts/agent-usefulness/protocol-r12';

const runsDirectory = join(EVIDENCE_DIRECTORY, 'runs', 'dry-run');
const screenshotsDirectory = join(EVIDENCE_DIRECTORY, 'screenshots');
const t1PacketPath = join(EVIDENCE_DIRECTORY, 'scenarios', 'T1-plan-packet.json');

type DryRunObservations = Record<string, unknown>;

const limitations = [
  'Scripted instrumentation only. No AI agent, no human participant and no persona reasoning was involved.',
  'Completing a scripted flow does not measure task usefulness, decision accuracy or time savings.',
  'The flow covers the T1 planner screen only; T2 and T3 screens were not exercised in this dry-run.',
];

async function writeRecord(episodeId: string, personaId: PersonaId, condition: string, observations: DryRunObservations, evidence: string[]) {
  await mkdir(runsDirectory, { recursive: true });
  const path = join(runsDirectory, `${episodeId}.json`);
  if (existsSync(path)) throw new Error(`Refusing to overwrite dry-run evidence: ${path}. Move the previous dry-run aside before rerunning.`);
  const record = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    episodeId,
    pairId: episodeId.split('-').slice(0, 2).join('-'),
    personaId,
    taskId: 'T1',
    condition,
    runKind: 'dry_run_scripted_instrumentation',
    actor: 'scripted-playwright-flow',
    aiAgentExecuted: false,
    humanParticipant: false,
    scored: false,
    exclusionReason: 'Scripted browser or packet inspection instrumentation; excluded from all metrics and cannot stand in for an agent episode.',
    executedAt: new Date().toISOString(),
    observations,
    evidence,
    limitations,
  };
  await writeFile(path, JSON.stringify(record, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  return path;
}

async function runPlannerFlow(page: import('@playwright/test').Page, episodeId: string) {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await expect(planner).toBeVisible();

  const slots = planner.getByLabel('Investigation slots', { exact: true });
  const countryCap = planner.getByLabel('Maximum investigations per country', { exact: true });
  const recurrence = planner.getByLabel('Recurrence weight', { exact: true });
  await slots.fill('10');
  await countryCap.fill('2');
  await expect(slots).toHaveValue('10');
  await expect(countryCap).toHaveValue('2');
  await expect(recurrence).toHaveValue('50');

  const planResponse = page.waitForResponse(response => response.url().endsWith('/api/investigations/portfolios') && response.request().method() === 'POST');
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  expect((await planResponse).status()).toBe(200);
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const summaryText = (await planner.getByTestId('planner-summary').innerText()).replace(/\s+/g, ' ').trim();

  const plans = planner.getByRole('group', { name: 'Alternative investigation plans' });
  const weighted = plans.getByRole('button', { name: /Weighted historical indicators/ });
  await expect(weighted).toContainText(/10\s*\/\s*10 slots/);
  await weighted.click();
  await expect(planner.getByRole('heading', { name: 'Weighted historical indicators', exact: true })).toBeVisible();

  const table = planner.getByRole('region', { name: 'Planned and excluded source records', exact: true });
  const selectedAtCapacity10 = (await table.locator('tbody tr td:first-child strong').allTextContents()).map(text => text.replace(/^\d+\.\s*/, ''));
  expect(selectedAtCapacity10).toHaveLength(10);
  expect(new Set(selectedAtCapacity10).size).toBe(10);

  await planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true }).click();
  const activeQueue = page.getByRole('region', { name: 'Active investigation plan', exact: true });
  await expect(activeQueue).toContainText('capacity 10');
  const activeIdsBeforeEdit = (await activeQueue.locator('.plan-queue-list li strong').allTextContents()).map(text => text.trim());
  expect(activeIdsBeforeEdit).toEqual(selectedAtCapacity10);

  await slots.fill('20');
  await expect(slots).toHaveValue('20');
  const planResponseAt20 = page.waitForResponse(response => response.url().endsWith('/api/investigations/portfolios') && response.request().method() === 'POST');
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  expect((await planResponseAt20).status()).toBe(200);
  await expect(weighted).toContainText(/20\s*\/\s*20 slots/);
  const selectedAtCapacity20 = (await table.locator('tbody tr td:first-child strong').allTextContents()).map(text => text.replace(/^\d+\.\s*/, ''));
  expect(selectedAtCapacity20).toHaveLength(20);
  expect(new Set(selectedAtCapacity20).size).toBe(20);
  await expect(activeQueue).toContainText('capacity 10');
  expect((await activeQueue.locator('.plan-queue-list li strong').allTextContents()).map(text => text.trim())).toEqual(activeIdsBeforeEdit);

  const downloadPromise = page.waitForEvent('download');
  await planner.getByRole('button', { name: 'Download reproducible plan', exact: true }).click();
  const download = await downloadPromise;
  const replayPath = join(runsDirectory, `${episodeId}-plan-replay.json`);
  if (existsSync(replayPath)) throw new Error(`Refusing to overwrite dry-run replay evidence: ${replayPath}`);
  await download.saveAs(replayPath);
  const replayBytes = await readFile(replayPath);
  const replay = JSON.parse(replayBytes.toString('utf8')) as { digest?: string; portfolios?: { strategy: string; selectedIds: string[] }[] };
  const weightedReplay = replay.portfolios?.find(plan => plan.strategy === 'weighted');
  expect(weightedReplay?.selectedIds).toEqual(selectedAtCapacity20);
  expect(replay.digest).toMatch(/^0x[a-f0-9]{64}$/);

  await mkdir(screenshotsDirectory, { recursive: true });
  const screenshot = join(screenshotsDirectory, `${episodeId}-weighted-plan.png`);
  if (existsSync(screenshot)) throw new Error(`Refusing to overwrite dry-run screenshot evidence: ${screenshot}`);
  await planner.screenshot({ path: screenshot });
  expect(pageErrors).toEqual([]);

  return {
    observations: {
      entryPath: '/dashboard/cases?sourceId=KAZ_S_159',
      plannerVisible: true,
      parameters: { capacityBeforeChange: 10, capacityAfterChange: 20, maxPerCountry: 2, recurrenceWeight: 50 },
      plannerSummary: summaryText,
      weightedPlanLabel: (await weighted.innerText()).replace(/\s+/g, ' ').trim(),
      selectedSourceIdsAtCapacity10: selectedAtCapacity10,
      selectedSourceIdsAtCapacity20: selectedAtCapacity20,
      activeCapacityAfterReplan: 10,
      activePlanIdsPreservedAfterReplan: true,
      replaySha256: createHash('sha256').update(replayBytes).digest('hex'),
      replayDigest: replay.digest,
      replaySelectedIdsMatchDisplay: true,
      pageErrors,
      observedAt: new Date().toISOString(),
    },
    evidence: [screenshot, replayPath],
  };
}

for (const personaId of ['P1', 'P8'] as const) {
  const episodeId = `${personaId}-T1-${CONDITION.C1}`;
  test(`Dry-run instrumentation ${personaId}/T1/C1 — scripted planner flow (not an agent)`, async ({ page }) => {
    const { observations, evidence } = await runPlannerFlow(page, episodeId);
    await writeRecord(episodeId, personaId, CONDITION.C1, observations, evidence);
  });
}

for (const personaId of ['P1', 'P8'] as const) {
  const episodeId = `${personaId}-T1-${CONDITION.C0}`;
  test(`Dry-run instrumentation ${personaId}/T1/C0 — frozen packet readability (not an agent)`, async () => {
    expect(existsSync(t1PacketPath), `Run prepare.ts first; ${t1PacketPath} is missing.`).toBe(true);
    const bytes = await readFile(t1PacketPath);
    const packet = JSON.parse(bytes.toString('utf8')) as {
      taskId?: string; label?: string; candidateCount?: number; candidates?: unknown[];
      policy?: string; requiredOutputFields?: string[]; dataset?: { datasetSnapshotId?: string };
      task?: { sourceAId?: string; sourceBId?: string; startingCapacity?: number; changedCapacity?: number; maxPerCountry?: number };
      limitations?: string[];
    };
    expect(packet.taskId).toBe('T1');
    expect(packet.label).toContain('REAL HISTORICAL METADATA');
    expect(packet.candidates?.length).toBe(packet.candidateCount);
    expect(packet.candidateCount).toBeGreaterThan(0);
    expect(packet.policy).toContain('investigation-allocation/1');
    expect(packet.requiredOutputFields).toEqual([
      'selectedStrategy', 'selectedSourceIds', 'includedRationale', 'excludedRationale',
      'activationStateBeforeCapacityChange', 'activationStateAfterCapacityChange',
    ]);
    expect(packet.dataset?.datasetSnapshotId).toBeTruthy();
    expect(packet.limitations?.join(' ')).toMatch(/do not establish zero emissions/i);
    expect(packet.task?.sourceAId).toBeTruthy();
    expect(packet.task?.sourceBId).toBeTruthy();
    expect(packet.task?.startingCapacity).toBe(10);
    expect(packet.task?.changedCapacity).toBe(20);
    expect(packet.task?.maxPerCountry).toBe(2);
    const task = packet.task!;
    const candidateIds = new Set((packet.candidates || []).flatMap(candidate => {
      if (typeof candidate !== 'object' || candidate === null || !('sourceId' in candidate) || typeof candidate.sourceId !== 'string') return [];
      return [candidate.sourceId];
    }));
    expect(candidateIds.has(task.sourceAId!)).toBe(true);
    expect(candidateIds.has(task.sourceBId!)).toBe(true);

    const observations = {
      entryPath: t1PacketPath,
      packetSha256: createHash('sha256').update(bytes).digest('hex'),
      candidateCount: packet.candidateCount,
      datasetSnapshotId: packet.dataset?.datasetSnapshotId,
      sourceAId: task.sourceAId,
      sourceBId: task.sourceBId,
      capacityChange: [task.startingCapacity, task.changedCapacity],
      policyVersionPresent: true,
      requiredOutputFieldCount: packet.requiredOutputFields?.length,
      readableWithoutApplication: true,
      observedAt: new Date().toISOString(),
    };
    await writeRecord(episodeId, personaId, CONDITION.C0, observations, [t1PacketPath]);
  });
}
