import { expect, test } from 'bun:test';
import { DocumentAssessmentInput, requestModelAssessment, PROMPT_VERSION } from './ai-review';
const env = ['AI_BASE_URL','AI_API_KEY','AI_MODEL','AI_REVIEW_TOKEN','AI_MAX_OUTPUT_TOKENS','AI_REASONING_EFFORT'] as const;
const sample = DocumentAssessmentInput.parse({
  sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
  claimText: 'The operator completed a repair at source KAZ_S_159 on 2026-09-10 and verified a sustained reduction in methane emissions.',
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

test('provider receives the exact bounded claim in both evidence passes', async () => {
  const statement = 'The operator completed a repair at source KAZ_S_159 on 2026-09-10 and verified a sustained reduction in methane emissions.';
  const requestBodies: Array<Record<string, unknown>> = [];
  const saved = Object.fromEntries(env.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.AI_BASE_URL = 'https://trusted-provider.example/v1';
    process.env.AI_API_KEY = 'test-secret-for-mocked-service';
    process.env.AI_MODEL = 'mock-evidence-reviewer';
    process.env.AI_REVIEW_TOKEN = 'k'.repeat(48);
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return reply(calls++ === 0 ? first : { verdict: 'insufficient_evidence', reason: 'The evidence does not establish the bounded claim.' });
    }) as unknown as typeof fetch;
    await requestModelAssessment(sample);
    expect(requestBodies).toHaveLength(2);
    expect(JSON.stringify(requestBodies)).toContain(statement);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) { const val = saved[key]; if (val === undefined) delete process.env[key]; else process.env[key] = val; }
  }
});

test('configured DeepSeek snapshot and generation budget reach both provider passes', async () => {
  const saved = Object.fromEntries(env.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const requests: Array<Record<string, unknown>> = [];
  try {
    process.env.AI_BASE_URL = 'https://api.experientiallabs.ai/v1';
    process.env.AI_API_KEY = 'test-only-provider-credential';
    process.env.AI_MODEL = 'deepseek-v4.1-flash-1017';
    process.env.AI_REVIEW_TOKEN = 't'.repeat(48);
    process.env.AI_MAX_OUTPUT_TOKENS = '2048';
    process.env.AI_REASONING_EFFORT = 'none';
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.experientiallabs.ai/v1/chat/completions');
      requests.push(JSON.parse(String(init?.body)));
      return reply(requests.length === 1 ? first : { verdict: 'supported', reason: 'Explicit quote support for the requested proposition.' });
    }) as unknown as typeof fetch;
    await requestModelAssessment(sample);
    expect(requests).toHaveLength(2);
    for (const request of requests) expect(request).toMatchObject({
      model: 'deepseek-v4.1-flash-1017', max_tokens: 2048, reasoning_effort: 'none',
      response_format: { type: 'json_object' },
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) { const value = saved[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('missing exact claim abstains without invoking the configured provider', async () => {
  const noClaim = DocumentAssessmentInput.parse({
    sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
    documents: [{ id: 'report', title: 'Authorized report', rightsDeclared: 'explicit_permission', text: 'The operator investigated a leak and filed a repair report. Sustained methane emission reduction has not yet been independently verified.' }],
  });
  await withMockProvider([], async () => {
    const result = await requestModelAssessment(noClaim);
    expect(result.verdict).toBe('insufficient_evidence');
    expect(result.citations).toEqual([]);
    expect(result.reason).toContain('claim statement');
  });
});

test('skeptical pass fails closed when strong claim is not supported by exact quote', async () => {
  await withMockProvider([first, { verdict: 'insufficient_evidence', reason: 'An investigation report is not confirmed physical mitigation.' }], async () => {
    const result = await requestModelAssessment(sample);
    expect(result.verdict).toBe('insufficient_evidence');
    expect(PROMPT_VERSION).toContain('v3');
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

test('a truncated provider response is rejected even if its partial content parses as JSON', async () => {
  const saved = Object.fromEntries(env.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    process.env.AI_BASE_URL = 'https://trusted-provider.example/v1';
    process.env.AI_API_KEY = 'test-only-provider-credential';
    process.env.AI_MODEL = 'mock-evidence-reviewer';
    process.env.AI_REVIEW_TOKEN = 't'.repeat(48);
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(first) } }] }));
    }) as unknown as typeof fetch;
    await expect(requestModelAssessment(sample)).rejects.toThrow('ai_incomplete_response');
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of env) { const value = saved[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
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
