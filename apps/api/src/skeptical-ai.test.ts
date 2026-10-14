import { expect, test } from 'bun:test';
import { DocumentAssessmentInput, requestModelAssessment, PROMPT_VERSION } from './ai-review';
const env = ['AI_BASE_URL','AI_API_KEY','AI_MODEL','AI_REVIEW_TOKEN'] as const;
const sample = DocumentAssessmentInput.parse({
  sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
  documents: [{ id: 'report', title: 'Authorized report', rightsDeclared: 'explicit_permission', text: 'The operator investigated a leak and filed a repair report. Sustained methane emission reduction has not yet been independently verified.' }],
});
const first = { verdict: 'supported', reason: 'A repair report was filed for this source.', citations: [{ documentId: 'report', quote: 'The operator investigated a leak and filed a repair report' }] };

function reply(content: object): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
}
async function withMockProvider(responses: object[], task: () => Promise<void>) {
  const saved = Object.fromEntries(env.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.AI_BASE_URL = 'https://trusted-provider.example/v1';
    process.env.AI_API_KEY = 'test-secret-for-mocked-service';
    process.env.AI_MODEL = 'mock-evidence-reviewer';
    process.env.AI_REVIEW_TOKEN = 'k'.repeat(48);
    globalThis.fetch = (async () => reply(responses[calls++] || { verdict: 'insufficient_evidence', reason: 'No support was established.' })) as unknown as typeof fetch;
    await task();
    expect(calls).toBe(responses.length);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) { const val = saved[key]; if (val === undefined) delete process.env[key]; else process.env[key] = val; }
  }
}

test('skeptical pass fails closed when strong claim is not supported by exact quote', async () => {
  await withMockProvider([first, { verdict: 'insufficient_evidence', reason: 'An investigation report is not confirmed physical mitigation.' }], async () => {
    const result = await requestModelAssessment(sample);
    expect(result.verdict).toBe('insufficient_evidence');
    expect(PROMPT_VERSION).toContain('skeptical');
  });
});

test('skeptical pass retains supported suggestion only when both passes agree', async () => {
  await withMockProvider([first, { verdict: 'supported', reason: 'The exact excerpt directly supports a report filing.' }], async () => {
    const result = await requestModelAssessment(sample);
    expect(result.verdict).toBe('supported');
  });
});

test('insufficient exact evidence does not call billable second pass', async () => {
  await withMockProvider([{ ...first, citations: [{ documentId: 'report', quote: 'Nonexistent report quote' }] }], async () => {
    const result = await requestModelAssessment(sample);
    expect(result.verdict).toBe('insufficient_evidence');
  });
});

test('provider response size is bounded before JSON parsing', async () => {
  const saved = Object.fromEntries(env.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  try {
    process.env.AI_BASE_URL = 'https://trusted-provider.example/v1';
    process.env.AI_API_KEY = 'test-secret-for-mocked-service';
    process.env.AI_MODEL = 'mock-evidence-reviewer';
    process.env.AI_REVIEW_TOKEN = 'k'.repeat(48);
    globalThis.fetch = (async () => new Response(' '.repeat(40_001), { status: 200 })) as unknown as typeof fetch;
    await expect(requestModelAssessment(sample)).rejects.toThrow('ai_response_too_large');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) { const val = saved[key]; if (val === undefined) delete process.env[key]; else process.env[key] = val; }
  }
});
