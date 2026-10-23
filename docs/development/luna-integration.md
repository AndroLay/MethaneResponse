# Luna integration — superseded historical decision

**21 October 2026:** the user replaced this model with DeepSeek V4.1 Flash 1017.
Use the [DeepSeek guide](deepseek-integration.md) for active configuration.
The following is retained as a record of the earlier decision, not current status.

[Backend configuration](configuration.md#optional-document-ai) · [Evaluation protocol](../testing/ai-benchmark-annotation.md)

On 20 October 2026, the user selected **Luna** from a lab named by the user.
The endpoint, model identifier, API documentation, and credentials were to be
provided later. No call was made to that model, and there was no evidence of
compatibility or accuracy. This model is not the same as the development agent
that happens to be named Luna. No replacement model was downloaded or run.

## Available backend contract

The current implementation uses `POST {AI_BASE_URL}/chat/completions` with Bearer
authentication, `model`, `temperature: 0`, `response_format: {type: "json_object"}`,
and `messages`. It reads the response from `choices[0].message.content` as JSON
containing `verdict`, `reason`, and `citations[{documentId, quote}]`.

**Do not assume that the Luna provider supports this contract.** Once its
documentation is available, first check the endpoint, authentication, structured
output, context limits, data-retention policy, and cost. If the contract differs,
add a backend adapter and tests; do not change the model or move the key to the
frontend to work around the incompatibility.

| Private configuration | Required value |
|---|---|
| `AI_BASE_URL` | HTTPS API base URL from provider documentation; no embedded credential |
| `AI_MODEL` | Exact provider model identifier, not a guessed display name |
| `AI_API_KEY` | Provider credential, stored privately on the backend |
| `AI_REVIEW_TOKEN` | Separate assessment token, at least 32 characters |

Do not fill these with active placeholders or include them in `VITE_*`, Git, ZIPs,
screenshots, or logs. The rules baseline and manual review remain available
without a provider. Existing mock tests demonstrate the software workflow, not a
successful Luna integration.

## Acceptance sequence once access is available

1. Confirm excerpt processing rights and consent; set call count/cost limits
   before contacting the provider. One assessment may use two calls because it
   includes a second check.
2. Check the response schema, size limits, and timeout using the project's DEMO
   test excerpts. Record the actual model version identifier and result; do not
   treat a smoke test as an accuracy benchmark.
3. Confirm quotations match the document exactly, fabricated/missing quotations
   produce abstention, and inconsistent results from two checks produce
   `insufficient_evidence`.
4. Test authorized review, revision/export, and the verifier. AI does not
   authorize anchoring or prove a physical outcome.
5. To make quality claims, use a licensed held-out benchmark and independent
   adjudication, compared with the rules on the same input. The
   `scripts/run-ai-benchmark.ts` tool still requires approval for provider calls;
   human labels and permissions must not be supplied by an agent in place of a
   human.

Track status separately: **configured → transport tested → grounding tested →
independently evaluated**. All live Luna stages remain pending.
