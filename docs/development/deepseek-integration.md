# DeepSeek V4.1 Flash 1017 — backend integration

[Configuration](configuration.md#optional-document-ai) · [Benchmark protocol](../testing/ai-benchmark-annotation.md)

On 21 October 2026, the user selected this model to replace Luna.
The account API catalog returned the exact slug `deepseek-v4.1-flash-1017`.
The [official model page](https://platform.experientiallabs.ai/models/deepseek-v4.1-flash-1017)
and [API documentation](https://platform.experientiallabs.ai/docs/openai-compatibility)
confirm the base URL `https://api.experientiallabs.ai/v1` and JSON output.
The `uncensored` model, a latest alias, and fallback to another model are not used.

## Private configuration

`data/state/experiential.env` is Git-ignored and contains backend configuration only:
`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_REVIEW_TOKEN`,
`AI_MAX_OUTPUT_TOKENS=2048`, and `AI_REASONING_EFFORT=none`.
The provider key and assessment access token are separate. The file is created
with mode 0600. Do not copy its contents into screenshots, reports, ZIPs, or
`VITE_*`.

Run the API from the repository root with this configuration:

```bash
bun --env-file=./data/state/experiential.env run dev:api
```

Evidence Auditor still asks for an assessment access token. The token is not the
provider API key and does not grant human-review/anchoring access. The user obtains
the token from their own private configuration; do not print it in an agent
session.

## Transport and grounding evidence

```bash
bun --env-file=./data/state/experiential.env scripts/probe-document-ai.ts \
  --approve-provider-calls --output=/tmp/deepseek-smoke-unique.json
```

The tool runs three project DEMO examples through the same Hono route, the real
provider, and a throwaway in-memory store. The limit is six calls, with no
automatic retries and a maximum of 2048 output tokens per call for this profile.
Responses with a `finish_reason` other than `stop` are rejected even if partial
content can be parsed as JSON; older mock providers without that field remain
compatible. Results record the response model, tokens/cost if reported by the
provider, quotations, verdict, bundle hash, commit, and source-change status. New
output is created with mode 0600 and does not overwrite an existing result. DEMO
excerpts are not stored in the user's investigation history.

This smoke check demonstrates transport and software behavior on a small example;
it does not establish accuracy on real reports, an independent benchmark, or
physical confirmation of mitigation. A held-out benchmark still requires human
labels/adjudication and document permissions. Pricing/credits and retention follow
the provider account; free AI or zero retention is not promised. Do not send
private documents without consent and authorization.

## Render

The [active Render preview](../evidence/render-preview-2026-10-21/README.md) uses
temporary state and the limited public-baseline path. The provider key and a
separate assessment token are installed as private backend environment variables
on the approved MethaneResponse service. The local assessment token is available
in `data/state/experiential.env`; enter only the assessment token in the session
form, not the provider API key. Anonymous assessment is rejected. Reviewer and
signing secrets are not installed; do not send confidential documents to the
preview.
