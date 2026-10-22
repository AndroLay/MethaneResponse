import { readFile, rename, writeFile } from 'node:fs/promises';

export type BridgeDiagnostic = {
  schemaVersion: 1;
  stage: 'initializing' | 'ready' | 'tool_started' | 'tool_finished' | 'submitted' | 'closed' | 'initialization_failed' | 'bridge_failed';
  steps: number;
  submitted: boolean;
  toolNames: string[];
  failureCount: number;
};
const stages = new Set(['initializing', 'ready', 'tool_started', 'tool_finished', 'submitted', 'closed', 'initialization_failed', 'bridge_failed']);
const names = new Set(['read_page', 'navigate', 'click', 'fill', 'select', 'set_details', 'read_manual_packet', 'verify_export', 'submit_result', 'unknown_tool']);

/** Metadata only: no prompt, answer, page text, URL, credentials or error bodies. */
export async function writeBridgeDiagnostic(resultPath: string, diagnostic: BridgeDiagnostic) {
  const path = `${resultPath}.diagnostics.json`;
  await writeFile(`${path}.pending`, JSON.stringify(diagnostic), { mode: 0o600 });
  await rename(`${path}.pending`, path);
}

export async function readBridgeDiagnostic(resultPath: string): Promise<BridgeDiagnostic | null> {
  try {
    const row = JSON.parse(await readFile(`${resultPath}.diagnostics.json`, 'utf8'));
    if (row.schemaVersion !== 1 || !stages.has(row.stage) || !Number.isSafeInteger(row.steps) || row.steps < 0
      || typeof row.submitted !== 'boolean' || !Number.isSafeInteger(row.failureCount) || row.failureCount < 0 || !Array.isArray(row.toolNames)) return null;
    return { schemaVersion: 1, stage: row.stage, steps: row.steps, submitted: row.submitted,
      toolNames: row.toolNames.slice(-90).map((name: unknown) => typeof name === 'string' && names.has(name) ? name : 'unknown_tool'), failureCount: row.failureCount };
  } catch { return null; }
}
