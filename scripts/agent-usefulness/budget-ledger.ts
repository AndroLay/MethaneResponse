import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { UsageBudget } from './agent-loop';
import { freezeRunnerConfig, type RunnerConfig } from './runner-config';

type LedgerDocument = {
  schemaVersion: 1;
  protocolId: string;
  runnerConfigSha256: string;
  budget: UsageBudget;
  updatedAt: string;
};

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function parseDocument(text: string): LedgerDocument {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('usage ledger is invalid');
  const row = value as Partial<LedgerDocument>;
  const budget = row.budget;
  if (row.schemaVersion !== 1 || typeof row.protocolId !== 'string' || typeof row.runnerConfigSha256 !== 'string'
      || !budget || !Number.isSafeInteger(budget.totalTokens) || budget.totalTokens < 0
      || !Number.isFinite(budget.costUsd) || budget.costUsd < 0
      || !Number.isSafeInteger(budget.providerCalls) || budget.providerCalls < 0) throw new Error('usage ledger is invalid');
  return row as LedgerDocument;
}

export async function openUsageLedger(path: string, protocolId: string, config: RunnerConfig) {
  const runnerConfigSha256 = digest(freezeRunnerConfig(config));
  await mkdir(dirname(path), { recursive: true });
  let document: LedgerDocument;
  try {
    await access(path);
    document = parseDocument(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    document = { schemaVersion: 1, protocolId, runnerConfigSha256, budget: { totalTokens: 0, costUsd: 0, providerCalls: 0 }, updatedAt: new Date().toISOString() };
    try {
      await writeFile(path, JSON.stringify(document, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError;
      document = parseDocument(await readFile(path, 'utf8'));
    }
  }
  if (document.protocolId !== protocolId || document.runnerConfigSha256 !== runnerConfigSha256) {
    throw new Error('usage ledger belongs to a different protocol or runner configuration');
  }

  const budget = { ...document.budget };
  return {
    path,
    budget,
    async persist() {
      document = { ...document, budget: { ...budget }, updatedAt: new Date().toISOString() };
      const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(document, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        await rename(temporary, path);
      } catch (error) {
        await unlink(temporary).catch(() => {});
        throw error;
      }
    },
  };
}
