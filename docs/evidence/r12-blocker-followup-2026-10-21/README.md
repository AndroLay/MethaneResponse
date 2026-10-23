# R12 blocker follow-up — 21 October 2026

**Scope:** tooling fixes and local software proof after recovery. This is not a new 48-episode run, human study, model benchmark, video, or public service. The user chose **validation and the production package first**.

## 1. Blocker status at this revision

| Item | Actual result | Production consequence |
|---|---|---|
| Runner lost diagnostics without submission | Programmed clients exercised runner → MCP → Chromium: successful submission; interrupted exit 7 remained FAILED with one `read_page` in metadata; contract violations were rejected without changing answers | Diagnostics/transport tested; no claim that P8 agents will finish |
| Scoring required unavailable fields/operations | Opt-in `agent-task-contract/13` advertises JSON schemas. Preflight rejects hidden scoring fields, unavailable operations, and missing seed/digest/reviewer setup before starting a provider | New trials only; r12 protocol/gold/scorer/results unchanged |
| T3 verifier unavailable through tools | `verify_export` checks one export against an operator pin, only with explicitly configured T3 fixtures | Read-only; no agent-selected file/digest, shell, RPC, provider, review rights, or manual-condition mutation rights |
| Blockchain proof previously used KAZ only | **Resolved for TKM.** The latest TKM browser export was restored unchanged to an isolated backend file store and anchored to EvidenceRegistry on Anvil | S09 can retain the same source/decision; not a browser transaction or public chain |
| Exact causes of the three old P8 failures | **Not reconstructable:** required original payload/logs were not retained | Preserve unknown; new tests cannot fill missing history |
| Practical Usefulness in r12 | **Unproven.** Frozen completion remains 0/48 | No time-saving claim, replacement composite score, pilot, or measured benefit |
| New TKM AI | Not called; existing live KAZ evidence remains separately labeled by case/date | Not a filming blocker if case changes are explicit; never invent TKM output |
| Footage, male narration, MP4, upload/deployment/public chain | Outside this session under the user's decision | Not produced here; production starts from v14 after authorization |

## 2. Implementation

- `scripts/agent-usefulness/task-contract-v13.ts` and tests: explicit output schema, exact-claim hash, duplicate/membership checks, request fields, trust pin. These are structural/invariant checks, **not a task-truth evaluator**. No replacement research protocol/scorer was frozen. Do not launch r12 using this schema.
- `codex-cli-runner.ts`: opt-in preflight before subprocess/provider, schemas in new-trial prompts, FAILED results for contract violations. Raw answers remain intact.
- `trusted-export-tool.ts` and tests: read-only operator file, symlink rejection, 16 MiB limit, summaries excluding dossier/reviewer/token/error bodies. Agents cannot change the digest. Output is always `chainStatus: NOT_VERIFIED`: this tool checks integrity/dossier, not blockchain connectivity.
- `codex-mcp-server.ts`, `bridge-diagnostics.ts`: conditionally expose the T3 verifier and allowlist its name in metadata. Old configurations without fixtures retain their previous surface.
- `codex-cli-runner.test.ts`: three round trips with **programmed** subprocess clients, real bridge, and real Chromium. No model or synthetic usage is counted as an agent episode.
- `scripts/run-retained-decision-proof.ts`, `retained-decision-chain.test.ts`: isolated environment, loopback Anvil, ephemeral random signer funded with DEMO balances, scoped DEMO software-reviewer directory, actual Hono/FileAuditStore and EvidenceRegistry. No database or testnet funds required. Reviewer assurance uses the real directory loader.
- `scripts/tsconfig.evaluation.json`: includes new runner/proof files in typechecking.

No frontend/API runtime, Solidity contract, dataset, r12 data, or service credential changed. User edits were preserved. No dependency, deployment, provider call, or public transaction was added.

## 3. Verification actually performed

| Check | Result | Evidence |
|---|---|---|
| `bun run check` | PASS: API, web, E2E, evaluation, agent-lab | `typecheck-final.txt`; evaluation/lab rechecked after final changes in `typecheck-followup.txt` |
| `bun test scripts/agent-usefulness` | **73 pass, 0 fail**, 19 files; zero new model/provider calls | `lab-output.txt` |
| `gates-r12.ts` | **12 pass, 0 fail** | `gates.json`; not 12 episodes |
| Production Chromium | **One scenario passed**, 35.3 s; build passed | `browser-output.txt`, `browser/`; no video recorded |
| Anvil/Hono/CLI retained export | **One integration passed, 34 assertions** | `chain-output.txt`, `tkm-anvil-proof.json` |
| r12 immutable inputs | All 73 files match original recovery pins | `verification.json` |
| Archived recovery/v13 artifacts | Unchanged | `verification.json` |
| Patch whitespace | `git diff --check` PASS | `diff-check.txt` |

Full API/Python/Foundry suites were not rerun; production backend behavior was exercised through the browser and local proof. The proof ran `forge build`, not `forge test`. Earlier 282 web tests and four recovery browser workflows remain evidence of their earlier revision, not new checks. The lazy MapPanel >500 kB warning remains; physical-phone performance is unverified.

**Retained development failures:** the initial assertion incorrectly expected a nonnull `anvil_setBalance` result; it now checks the actual balance. Typechecking required an explicit JSON-RPC envelope for nonstandard Anvil RPC. A privacy assertion matched “dossier” in a disclaimer rather than a leaked property; it now checks properties. `chain-attempt-1.txt`, `typecheck-attempt-1.txt`, and `lab-attempt-1.txt` remain retained and are not PASS results.

## 4. Primary-take binding and integrity

- Source `TKM_S_021`, snapshot `unep-mars-675417694883`, archive SHA `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`.
- Claim `mitigation_confirmed`, UTC period `2020-10-29`–`2026-09-13`. Claim/response are DEMO fixtures, not actual company statements or repair evidence.
- Browser reviewer `connected-demo-mitigation`, decision revision 1, `request_more_evidence`. Enrollment is a software fixture, not verified human identity/expertise.
- Pin read from `browser/decision-desktop.png`, then checked against the export: `0x7f150071975c7acf393707578f782d654bcb6b5fa18ffd3414dd6dca96af803b`. [trusted-digest.json](trusted-digest.json) records its origin.
- `tkm-anvil-proof.json.record.decision` exactly equals `browser/frozen-investigation-decision.json.decision`. The initial UI was unanchored. The proof explicitly restored the export in a disposable environment; it did not add an import endpoint or click the disabled Anchor control.
- Unauthenticated 401, missing-anchor-scope 403, and revoked 403 used no nonce. Successful anchor and duplicate 409 followed; total nonce count was two: deployment plus anchor.
- CLI exit sequence: original 0, altered with old pin 1, altered+rehashed with new pin 1, original again 0, forged receipt issuer 1, restored chain/store after restart 0.
- Browser revisit reason `new_authorized_response`; old decision unchanged. This is a DEMO response, not a new plume or zero-emission proof.
- `.anvil-state.json` contains public DEMO ledger transactions/storage, not signer or reviewer secrets/tokens. Anvil and temporary servers were stopped; later RPC checks need local restore/replay.

Earlier/initial takes remain diagnostic evidence. **Use only the final `tkm-anvil-proof.json` with this directory's `browser/` folder.** Never combine an older receipt with a newer UI digest.

## 5. Next production step at this revision

Start with [production handoff v14](../../demo/delivery-2026-10-21-final-v14/production-handoff.md). Its storyboard remains 280 seconds. Narration/shot lists keep TKM continuous through chain proof and label KAZ AI as a separate historical example. Desktop screenshots were visually checked; video/audio and physical-phone performance were not reviewed.

New footage, male narration, editing, and MP4 **were not produced here**. For a new take, read the pin from the reviewer UI, then supply `--decision <export> --trusted-digest <separate-pin>` to the proof runner. Never copy this take's pin/receipt into another export. An honest video does not require rerunning 48 episodes.
