# Pre-video final validation — 21 October 2026

**Complete for local software acceptance and production handoff at this revision.** This does not establish Practical Usefulness, agent success, or updated public services. No video, TTS, upload, deployment, or public transaction was produced in this session.

## Actual fixes and verification

- Three persistence/verifier tests now use `tmpdir()` rather than forcing an EDQUOT-affected `/tmp`. Private-storage requirements remain strict.
- The decision test reads the pin from the reviewer UI **before** opening the export, then checks the export against it. The reviewer remains DEMO.
- The plan-revision test observes PUT, waits for UI confirmation, then uses authenticated GET to inspect the server revision. It does not rely on a detached CDP response body and still checks revision 2 and concurrent-save conflicts.
- The next smoke batch uses one test so worker restarts cannot reset the allowance. `bun run agent-lab:test` covers all tooling tests.
- Smoke schema **version 2** hides oracle values. Unit regressions reject duplicate/wrong sources, wrong counts/pins, overclaims, and false budget PASS results. Version 2 **has not run against a model** and does not modify version 1 protocol/results.

| Latest check at this revision | Result | Evidence |
|---|---:|---|
| Frozen install | PASS, no changes | install.log |
| API/web/E2E/evaluation/lab typecheck | PASS | typecheck-last.log |
| API | 301 pass, 0 fail | api-final.log |
| Web | 282 pass, 0 fail | web-final.log |
| Verifier | 66 pass, 0 fail | verifier-rerun.log |
| Python pipeline | 221 pass | python-final.log |
| Python tooling | 15 pass | python-tooling-final.log |
| Foundry | 4 pass | contracts-final.log |
| Agent tooling | 78 pass, 0 fail; no model calls | agent-tooling-complete.log |
| Deterministic gates | 12 pass, 0 fail | gates.json |
| Main browser suite | 29 pass | e2e.log |
| Documents/reviewer browser suite, final rerun | 13 pass | ai-e2e-final.log |
| Same-take TKM Anvil/backend/CLI | One integration, 34 assertions | current-browser-chain.log |
| Production build/bundle | PASS; App 74,935 gzip bytes, eight lazy workspaces | build.log, bundle-final.log |
| Baseline reproduction | Byte-identical to retained report | baseline-evaluation.json |
| Immutable r12 | 73 files unchanged | verification.json |

Reruns are not additional coverage. Main 29 and AI 13 contain **42 distinct scenarios**, including schema/UX tests, not 42 user studies. The AI suite uses a mock provider, not live DeepSeek.

## Negative results remain preserved

Frozen r12 remains **0/48 completion**, 8.33% decision accuracy, 74.3% actionability; 11 completed, 34 abstained, 3 failed. Nonexclusive retrospective classifications remain 22 scorer false negatives, three agent/tool failures, zero application defects established by r12, one genuine task failure, and 38 protocol limitations. See the recovery audit; these are not replacement scores. The historical P8 cause cannot be recovered because original diagnostic payloads were not retained. This is an evidence limit, not a gap filled with guesses or new answers.

**One new real P8 probe**, read-only T3, used Codex GPT-6 Luna Max under the existing plan. It called the verifier and submitted output matching the checker, but the trial remained **FAILED `lab_token_cap`**: 73,152 input + 398 output = 73,550 aggregate tokens, 54,016 cached input, 23.9 seconds. The 60,000 allowance could only be checked after one turn. USD cost is unknown, not claimed free. T1/T2 received no provider turn; see smoke-not-attempted.json. There was no retry, 48-episode rerun, or new backend-model API call.

The audit also found that version 1's probe schema exposed literal outcomes. The probe therefore establishes only **model → MCP → verifier → submit transport**, not decision accuracy, usability, or Practical Usefulness. Version 2 removes oracle leakage and fixes the batch guard; it was not rerun to conserve quota. Original protocol/started/result records remain intact.

Initial failures remain in api.log, verifier.log, python.log, python-tooling.log, and e2e.log (main 29 passed, AI 11 passed / 2 failed). Causes included temporary-root/quota issues, mismatched test selectors, and unavailable CDP bodies. Software tests were rerun as listed; the P8 budget failure remains a failure.

## Capture workflow and continuity

Investigation Plan → Selected Source → Evidence Assessment → Evidence Request → DEMO-reviewed Decision → Revisit → Independent Verification was checked using browser/Anvil. Desktop 1440×1000 and mobile 390×844 screenshots were visually reviewed. No new footage or physical-phone testing was performed.

- Primary take: `TKM_S_021`, snapshot `unep-mars-675417694883`, UTC scope `2020-10-29`–`2026-09-13`, DEMO claim `mitigation_confirmed`.
- Trusted pin read from the UI before download: `0x47423e67908e4420e1b19dbcfbf8e687ec7f565c0b948151ebcd804103c49663`.
- This take's exports/screenshots are in `browser/`; matching proof is `current-browser-anvil-proof.json` with `.anvil-state.json`.
- Browser state initially `not_anchored`; the identical export was explicitly restored to a disposable backend and Anvil 31337, then became `verified_latest`. This is not a browser Anchor click, public-chain transaction, human review, or repair proof.
- CLI exits: original 0 / altered 1 / altered+rehashed 1 / original 0 / forged issuer 1 / restart 0. Authorization outcomes: no-auth 401 / no-scope 403 / revoked 403 / duplicate 409. The decision was not rewritten.
- `tkm-anvil-proof.json` is a **control replay from an earlier take** and must not be paired with new screenshots. The P8 trial also uses the old pin. Use only `browser/` + `current-browser-anvil-proof.json` for v15.
- Live DeepSeek remains earlier **KAZ_S_159** evidence, not TKM. Explicitly label the case/date/DEMO-excerpt change.

## Frozen production boundaries

Human productivity, emission reductions, confirmed repairs, agent generalization, expert review, and updated public deployment are not established here. These are claim boundaries, not features to fabricate for a successful-looking demo. No migration, database, or dependency was added. MapPanel remains 1,123,502 raw bytes with a >500 kB warning. Lazy loading is not an FPS or physical-phone guarantee. GitHub Actions and Render were not updated/rechecked in this session.

**Next at this revision:** use [handoff v15](../../demo/delivery-2026-10-21-final-v15/production-handoff.md) for storyboard, narration, capture instructions, claim ledger, and QA. Do not rerun the model lab to make a video. A new capture needs a new UI pin and Anvil proof for that exact export.
