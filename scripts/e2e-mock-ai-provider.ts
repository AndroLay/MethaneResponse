const host = '127.0.0.1';
const port = Number(process.env.METHANE_E2E_MOCK_AI_PORT || 43140);
const expectedApiKey = process.env.METHANE_E2E_MOCK_PROVIDER_KEY;
const exactQuote = 'A maintenance log records replacement of compressor valve KV-17 on 20 August 2026.';

if (!expectedApiKey) throw new Error('The E2E mock provider requires an ephemeral API key.');

let totalRequests = 0;
let firstPassRequests = 0;
let skepticalPassRequests = 0;
let sourceIdMatches = true;
let claimTypeMatches = true;
let exactInputQuoteMatches = true;
let skepticalQuoteMatches = true;

Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok', provider: 'deterministic-e2e-fixture' });
    }
    if (request.method === 'GET' && url.pathname === '/metrics') {
      return Response.json({
        totalRequests,
        firstPassRequests,
        skepticalPassRequests,
        sourceIdMatches,
        claimTypeMatches,
        exactInputQuoteMatches,
        skepticalQuoteMatches,
      });
    }
    if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions') {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (request.headers.get('authorization') !== `Bearer ${expectedApiKey}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = await request.json().catch(() => null) as {
      model?: string;
      temperature?: number;
      response_format?: { type?: string };
      messages?: Array<{ role?: string; content?: string }>;
    } | null;
    if (!payload || payload.model !== 'methane-response-e2e-mock-v1'
      || payload.temperature !== 0 || payload.response_format?.type !== 'json_object') {
      return Response.json({ error: 'invalid_test_request' }, { status: 400 });
    }
    const systemPrompt = payload.messages?.find(message => message.role === 'system')?.content || '';
    const userContent = payload.messages?.find(message => message.role === 'user')?.content || '';
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(userContent) as Record<string, unknown>;
    } catch {
      return Response.json({ error: 'invalid_user_payload' }, { status: 400 });
    }

    totalRequests += 1;
    sourceIdMatches &&= input.sourceId === 'KAZ_S_159';
    claimTypeMatches &&= input.claimType === 'mitigation_confirmed';
    const skepticalPass = systemPrompt.includes('Review only the quoted evidence');
    let modelOutput: Record<string, unknown>;

    if (skepticalPass) {
      skepticalPassRequests += 1;
      const quotations = Array.isArray(input.quotations) ? input.quotations : [];
      skepticalQuoteMatches &&= quotations.some(value => Boolean(value && typeof value === 'object'
        && (value as Record<string, unknown>).documentId === 'submitted-excerpt-01'
        && (value as Record<string, unknown>).quote === exactQuote));
      if (!skepticalQuoteMatches) return Response.json({ error: 'expected_exact_grounded_quote' }, { status: 400 });
      modelOutput = {
        verdict: 'insufficient_evidence',
        reason: 'The test excerpt reports an action but has no independent follow-up methane measurement.',
      };
    } else {
      firstPassRequests += 1;
      const documents = Array.isArray(input.documents) ? input.documents : [];
      exactInputQuoteMatches &&= documents.some(value => Boolean(value && typeof value === 'object'
        && (value as Record<string, unknown>).id === 'submitted-excerpt-01'
        && typeof (value as Record<string, unknown>).text === 'string'
        && ((value as Record<string, unknown>).text as string).includes(exactQuote)));
      if (!exactInputQuoteMatches) return Response.json({ error: 'expected_test_excerpt' }, { status: 400 });
      modelOutput = {
        verdict: 'supported',
        reason: 'The synthetic fixture reports that a valve replacement occurred.',
        citations: [{ documentId: 'submitted-excerpt-01', quote: exactQuote }],
      };
    }

    if (!sourceIdMatches || !claimTypeMatches) return Response.json({ error: 'unexpected_case_or_claim' }, { status: 400 });
    return Response.json({ choices: [{ message: { content: JSON.stringify(modelOutput) } }] });
  },
});
