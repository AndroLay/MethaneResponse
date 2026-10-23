# Configuration

[Local setup](local-setup.md) · [API](../architecture/api-reference.md) · [Trust and transparency](../product/trust-and-transparency.md)

Example references: [.env.example](../../.env.example) for the API and [apps/web/.env.example](../../apps/web/.env.example) for the web app. Secret values are not included in documentation. The local baseline runs without creating a `.env` file.

## API runtime and datasets

| Variable | Default/role |
|---|---|
| `HOST` | `0.0.0.0`; use `127.0.0.1` for a local-only bind if desired |
| `PORT` | `3001` |
| `WEB_ORIGIN` | `http://localhost:5173`, the origin allowed by CORS |
| `AUDIT_STORE_PATH` | Code default: `data/state/audits.json` from the repository root; an explicit relative path is resolved from the process working directory |
| `MARS_CASEBOOK_PATH` | Code default: `data/real/mars_casebook_2026-10-15.json` |
| `INTELLIGENCE_SNAPSHOT_PATH` | Code default: `data/processed/intelligence-snapshot.json` |
| `INTELLIGENCE_INPUT_PATH` | Code default: `apps/web/public/data/mars-snapshot.json.gz`; its match to the intelligence data is checked |
| `NODE_ENV` | `production` enables additional restrictions for baseline/legacy credentials |
| `ADMIN_API_TOKEN` | Separate admin token; required by default for production baseline writes |
| `ENABLE_PUBLIC_BASELINE_AUDITS` | Only `true` allows baseline writes without an admin in production; rate limits still apply |

Paths in the root `.env.example` use the `apps/api` context because `bun run dev:api` changes to that directory. Absolute paths can avoid ambiguity. CORS does not replace authorization. The API launcher requires Linux `flock` and creates a stable lock plus casework state/marker files beside the audit path. Use the [team runbook](shared-casework.md) for permissions, backup, and restore; do not run the `index.ts` entry point directly.

## Reviewers and human assessment

| Variable | Role |
|---|---|
| `REVIEWER_AUTH_SECRET` | Server secret for issuing/verifying short-lived reviewer capabilities; at least 32 UTF-8 bytes |
| `REVIEWER_DIRECTORY_PATH` | Private operator-owned JSON directory; do not place it in `apps/web/public` or public data |
| `REQUIRE_ATTESTED_HUMAN_REVIEWERS` | `true` requires a current operator attestation for the claim category during protected human reads/decisions |
| `HUMAN_REVIEW_TOKEN` + `HUMAN_REVIEWER_ID` | Shared-token compatibility for development; separate token of at least 32 characters and a server-side ID |
| `ALLOW_LEGACY_SHARED_REVIEWER_TOKEN` | Production compatibility opt-in; does not grant the `anchor` scope |

Token scopes: `private_read`, `review`, and `anchor`. The local [issue-reviewer-token.ts](../../scripts/issue-reviewer-token.ts) tool uses the same server secret. The following example **writes a sensitive credential to stdout**; run it only in an appropriate private terminal, not in CI logs:

```bash
bun --env-file=apps/api/.env scripts/issue-reviewer-token.ts DEMO-reviewer private_read,review 3600
```

`DEMO-reviewer` is an example identifier, not an actually registered reviewer. A token does not prove identity or competence. **P1 shared casework always rejects legacy tokens and directory approvals that are not currently `operator_attested`, even if audit strict mode is disabled.** Reading requires `private_read`; writing requires both `private_read,review` scopes. The directory format, status, revocation, and conflict declarations are described in [trust and transparency](../product/trust-and-transparency.md).

By default, compatibility mode can accept unverified/expired subjects with the corresponding assurance label. To revoke an approval for a token that is still valid, keep the entry and set `disabled: true`; removing the entry or emptying the path is not revocation in compatibility mode. If a configured directory is invalid/unreadable, protected human access is denied.

## Optional document AI

`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, and `AI_REVIEW_TOKEN` are required to use the assessment path. Remote providers use HTTPS; the code permits HTTP only for `localhost`, `127.0.0.1`, or `[::1]` as a local/test provider. `AI_REVIEW_TOKEN` must be at least 32 characters and differ from the admin/shared-reviewer token. The API appends `/chat/completions` to the base URL. The code uses a compatible provider interface; no account/provider is enabled in the repository.

The provider receives excerpts only after a declaration of processing rights and consent. The provider secret remains on the server. An assessment token entered by a user in the UI does not open private history. The API does not store full excerpts, but selected quotations and metadata in a private audit may still be sensitive. See the [document workflow](../product/user-workflow.md#optional-document-ai).

On 21 October 2026, the user replaced Luna with
`deepseek-v4.1-flash-1017` through ExperientialLabs. Follow the
[DeepSeek integration guide](deepseek-integration.md). The rules/manual path remains available.
`AI_MAX_OUTPUT_TOKENS` limits output per call: default 2048, range
128–4096. `AI_REASONING_EFFORT` is optional and may contain only a capability
supported by the provider; the DeepSeek profile uses `none` for short assessments.
One assessment may use two calls; the token limit is not an account cost limit.

## Web and proxy

| Variable | Role |
|---|---|
| `VITE_API_BASE_URL` | Public API origin for a separate web build; empty means relative `/api` requests |
| `METHANE_API_PROXY_TARGET` | HTTP(S) API origin for Vite development; default `http://localhost:3001`; no path/credential/query |

Every `VITE_*` value can end up in the browser bundle. Use public information only; provider keys, signing keys, admin/reviewer tokens, and credentialed RPC URLs must not be placed there. E2E isolation variables are managed by the runner and are not everyday application settings.

## Blockchain receipts and hosting

`SEPOLIA_RPC_URL` and `AUDIT_REGISTRY_ADDRESS` configure Sepolia reads (chain 11155111). Signing is enabled only when `ENABLE_CHAIN_WRITES=true` and `SEPOLIA_PRIVATE_KEY` is valid; it is off by default. `CHAIN_CONFIRMATIONS` defaults to 2, with a range of 1–64. RPC/key values are not needed for baseline/checksum verification. Enabling signing does not replace approval of the public target/operation.

`CHAIN_NETWORK=local` selects Anvil chain 31337 with separate variables: `LOCAL_CHAIN_RPC_URL` (loopback only), `LOCAL_REGISTRY_ADDRESS`, and `LOCAL_CHAIN_PRIVATE_KEY`. This mode is rejected in production; it does not fall back to the Sepolia signer. The default `CHAIN_NETWORK` is Sepolia.

The file store provides durable intents and atomic completion under a single-writer launcher. Before submission, target status shows the chain/registry/issuer and signing readiness; pending transactions are reconciled read-only. Details, crash limits, and backup are in the [blockchain runbook](blockchain-recovery.md).

The root `render.yaml` provides a preview option with the audit file in `/tmp`; the filesystem may be lost on restart/redeploy. This guide does not change credentials, directories, deployment, or external services. See [deployment status](../release/deployment.md).
