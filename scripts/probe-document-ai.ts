/** Explicitly authorized live transport/grounding smoke; never an accuracy benchmark.
 * Only project-authored DEMO excerpts leave the machine. At most six model calls.
 */
import { open } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createApp } from '../apps/api/src/app';
import { MemoryAuditStore } from '../apps/api/src/store';
import { auditIntegrityValid } from '../apps/api/src/integrity';
import { aiConfigured } from '../apps/api/src/ai-review';

if (!process.argv.includes('--approve-provider-calls')) throw new Error('Explicit --approve-provider-calls is required');
if (!aiConfigured()) throw new Error('Configure the private backend provider environment first');
const output = process.argv.find(value => value.startsWith('--output='))?.slice('--output='.length);
if (!output) throw new Error('Supply --output=/absolute/private/path.json (must not exist)');
// Reserve the output before any chargeable request; fail on an existing/unwritable target.
const reportFile = await open(output, 'wx', 0o600);
const scenarios = [
  {
    name: 'DEMO-supported-detection', claimType: 'source_detected', expected: 'supported',
    claimText: 'The submitted DEMO document states that methane was detected at source KAZ_S_159 on 2026-09-10.',
    text: 'DEMO DOCUMENT authored by MethaneResponse for software validation, not real observational evidence. Methane was detected at source KAZ_S_159 on 2026-09-10. This invented statement is for testing document entailment only; it is not a measurement or an independent field report.',
  },
  {
    name: 'DEMO-insufficient-mitigation', claimType: 'mitigation_confirmed', expected: 'insufficient_evidence',
    claimText: 'Physical methane mitigation at source KAZ_S_159 has been independently confirmed.',
    text: 'DEMO DOCUMENT authored by MethaneResponse for software validation, not real observational evidence. The operator sent an administrative response concerning source KAZ_S_159. No repair completion, follow-up measurement, or independent mitigation verification is documented. The absence of additional measurements cannot establish zero emissions.',
  },
  {
    name: 'DEMO-contradicted-notification', claimType: 'operator_notified', expected: 'contradicted',
    claimText: 'The submitted DEMO notification ledger records that the operator of source KAZ_S_159 was notified on 2026-09-10.',
    text: 'DEMO DOCUMENT authored by MethaneResponse for software validation, not a real notification ledger. For source KAZ_S_159, the complete ledger explicitly records: The operator was not notified on 2026-09-10. This invented negative entry tests textual contradiction only, not notification facts in the historical MARS dataset.',
  },
] as const;
const originalFetch = globalThis.fetch;
const calls: Array<Record<string, unknown>> = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (calls.length >= 6) throw new Error('Live smoke call budget exceeded');
  const entry: Record<string, unknown> = {};
  calls.push(entry);
  const response = await originalFetch(input, init);
  entry.status = response.status;
  if (response.ok) {
    // Only numeric usage, public model/provider metadata; never headers/prompts/credentials.
    const body = await response.clone().json() as Record<string, any>;
    entry.model = body.model;
    entry.provider = typeof body.provider === 'string' ? body.provider : undefined;
    entry.finishReason = body.choices?.[0]?.finish_reason;
    const usage = body.usage ?? {};
    entry.usage = Object.fromEntries(['prompt_tokens', 'completion_tokens', 'total_tokens', 'cost']
      .filter(key => typeof usage[key] === 'number').map(key => [key, usage[key]]));
  }
  return response;
}) as typeof fetch;
const results: Array<Record<string, unknown>> = [];
try {
  const app = createApp(new MemoryAuditStore());
  for (const scenario of scenarios) {
    const start = performance.now();
    const response = await app.request('/api/intelligence/assessments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_REVIEW_TOKEN}` },
      body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: scenario.claimType, claimText: scenario.claimText,
        consentToExternalProcessing: true, documents: [{ id: 'demo-owned', title: scenario.name,
          rightsDeclared: 'owned', text: scenario.text }] }),
    });
    const body = await response.json();
    const audit = body.audit;
    results.push({ name: scenario.name, httpStatus: response.status,
      expected: scenario.expected, actual: audit?.bundle?.result,
      integrityValid: audit ? auditIntegrityValid(audit) : false,
      elapsedMs: Math.round(performance.now() - start),
      passed: response.status === 201 && audit?.bundle?.result === scenario.expected && auditIntegrityValid(audit),
      ...(audit ? { audit } : { error: body.error }),
    });
  }
} finally { globalThis.fetch = originalFetch; }
const report = { kind: 'live-provider-smoke', generatedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeModified: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  requestedModel: process.env.AI_MODEL, calls, results,
  limitations: ['Project-authored DEMO documents, not real field evidence.',
    'Transport, exact citations and API bundle smoke only; not an independent accuracy benchmark.',
    'Provider response model is recorded as reported; weights and physical outcomes were not verified.',
    'In-memory throwaway audit store; these DEMO assessments never enter the real audit history.'] };
await reportFile.writeFile(JSON.stringify(report, null, 2) + '\n');
await reportFile.close();
const passed = results.filter(result => result.passed).length;
console.log(JSON.stringify({ output, passed, total: results.length, providerCalls: calls.length,
  model: process.env.AI_MODEL, accuracyBenchmark: false }));
if (passed !== scenarios.length) process.exitCode = 1;
