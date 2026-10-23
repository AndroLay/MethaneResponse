# Simulating Three Integrations Through Agent Roles

Follow the `adaptive-engineering/references/persistent-plans.md` adapter. Root is the sole repository writer; other agents read code, design scenarios, and run isolated checks. Preserve the existing working tree.

## Goal and boundaries

The user confirmed three areas: an external AI provider, public deployment, and a Sepolia receipt. This request is handled through an AI role simulation with real local runtime checks. The simulation does not create a hosting account, provider credentials, funding, or a public Sepolia transaction. External gates still require evidence from the actual target; fixtures do not satisfy them.

Starting snapshot: local `main` at `a82e2eee99bb79327f859f304f2f5d5939f07041`, including existing working-tree changes. Historical P1–P6 packages are not rewritten.

## Roles and expectations before execution

| Peran | Skenario | Ekspektasi |
|---|---|---|
| Requesting analyst | Own DEMO document, limited claim, consent, and token | Provider request is bound to the claim; result remains a private suggestion/unreviewed item |
| Skeptical reviewer | Two passes disagree or a citation is fabricated | Abstain; do not turn the result into confirmation of physical repair |
| Faulty provider | HTTP failure, malformed JSON/schema, redirect, oversized response | Fail in a controlled way; create no false audit revision or resend to a redirect target |
| Unauthorized visitor | No token/consent/rights; attempts to read a private result | Reject before calling provider; disclose no citation or token |
| Service operator | Local production API, health/CORS, writer lock, backup, crash/restart | State survives on the same volume; second process is rejected; this is not proof of durable cloud storage |
| Issuer and verifier | Anvil deployment/anchor, crash, revert, revision, modified export | Local receipt is independently validated; historical versions are distinguished; tampering is rejected |

Roles do not count as people or independent experts. Fixture provider responses are predetermined to test the protocol, not assess model quality.

## Milestones

- [x] An agent reviewed the provider and deployment/chain; stale deployment documentation and an RPC acknowledgment gap were addressed.
- [x] Add a local HTTPS provider → production API path using DEMO data/tokens and an isolated environment. Root owns the new files in `scripts/`; no new dependency or credential change.
- [x] An agent ran 13 provider scenarios/115 assertions and the operator/chain checks separately; final results are retained in the evidence package. No application runtime defect was found; fixture mistakes were corrected and the final run was repeated.
- [x] Typecheck, 34 focused tests, build/bundle, one chain + two casework + one publication check passed. Four HTTP checks matched the locally served production build; this was not browser rendering or public hosting.
- [x] Another agent reviewed assertions and results; source/checksum bindings and documentation are stored with the [evidence](../evidence/integration-role-simulation-2026-10-18/README.md). The fixture command stops its own process.

## Acceptance commands

- `bun --no-env-file test scripts/integration-role-runtime.test.ts` through the isolated-environment runner added in this increment.
- `bun run test:case-work-operations` and `bun run test:publication-operations`.
- `bun run test:chain-integration --evidence /tmp/methane-integration-roles/chain.json`.
- `bun run check`, relevant unit checks, `bun run build:web`, and `bun run check:web-bundle`.

New artifacts: `docs/evidence/integration-role-simulation-2026-10-18/`. Results explicitly record commands, exit status, role identity, local/fixture scope, source hash, and external gates. If the application did not change, do not claim that the full suite was rerun.

## Status

**Complete within the scope of engineering simulation through agents.** A total of 39 focused/operations tests, typecheck/build/bundle, and four HTTP build checks passed. No external provider, public deployment, or new Sepolia receipt was used; the original gates remain pending. The user's direction covers agents and local tests. The earlier Sepolia operation retains its recorded limited approval; this simulation does not extend it to another deployment target.
