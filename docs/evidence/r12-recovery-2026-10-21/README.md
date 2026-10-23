# r12 recovery — 21 October 2026

**Evidence type:** retrospective audit and new local software regressions. This is not a new 48-episode agent run, human pilot, judge assessment, or productivity study. No paid provider, deployment, public transaction, or video was produced in this recovery session.

## 1. Preserved baseline

The [original r12 results](../agent-practical-usefulness-2026-10-21-r12/results.json) remain unchanged: 48 sealed attempts; 11 completed, 34 abstained, 3 failed; **task completion 0/48**, decision accuracy 8.33%, actionability 74.3%, false-supported 0/15, critical-overclaim 0/45; composite unavailable. Passing 12 deterministic gates does not establish completion of 48 tasks.

`frozen-input-sha256.json` records **73 files** before these changes. The audit rechecked all of them and confirmed that the source scorer matches the frozen scorer. Gold labels, agent answers, protocol, source manifest, and r12 results were unchanged. The r10/r11/attempt directories and user modifications were preserved. There was no best-of rerun.

## 2. Root causes and classification

[audit.json](audit.json) contains episode classifications, frozen reasons, alternative normalization, remaining obligations, and field audits. Categories are **nonexclusive**; their counts must not be added to obtain 48.

| Category | Episodes affected | Finding |
|---|---:|---|
| SCORER_FALSE_NEGATIVE | 22 | Seven T1 browser outputs used different labels/structures; 15 T2 outputs had reference objects rejected by the string-list scorer, including verdict variations. This does not make every affected task a PASS. |
| AGENT_OR_TOOL_FAILURE | 3 | P8 T1/T2/T3 browser attempts returned `codex_result_missing` and null output. Model usage was recorded, but the old bridge saved step counters only at submission and removed its work directory. |
| APPLICATION_DEFECT | 0 confirmed from r12 | The retained evidence does not establish an application defect. Zero is not proof of a bug-free application. Planner guidance and a demo fixture were improved; these are not 38 product bug fixes. |
| GENUINE_TASK_FAILURE | 1 | P4-T1-manual replaced `TKM_S_047` with `IND_S_042`. A wrong ID still fails even when the strategy label is similar. |
| PROTOCOL_LIMITATION | 38 | Eight manual T1 episodes lacked activation; 15 T2 episodes were scored against unadvertised fields; 15 T3 episodes lacked the setup, tools, or authorization required for their obligations. |

### T1 — allocation and active state

- All seven nonfailed browser outputs had the **exact set of ten source IDs**. Seven manual outputs also matched; one had the wrong ID described above.
- `Weighted historical indicators` is the UI label for `weighted`. Rationale objects remain inspectable, but a label alone does not establish correct IDs or allocation.
- The adapter accepts **four** browser outputs with sufficient structured before/after state: P1, P2, P4, P5. It checks unique IDs, active state, capacity 10, editing to 20, nonreplacement, and conflicting flags. Three outputs remain only partly normalized because prose or active-plan identity is incomplete.
- `abstained` was not changed to completed. Hypothetical manual activation is not a runtime operation. A new browser regression checks that the active ten-source queue remains identical after editing capacity to 20, and changes only after explicit activation.
- Agents tried `Excluded sources` as a button/tab, whereas the UI uses the `Planner rows to inspect` select. New guidance clarifies navigation; it does not establish that the dropdown was broken.

### T2 — verdict and request

- **All 15 available outputs** preserved source, claim type, exact claim text, and three scope components. The audit calculated claim-text SHA-256 values for comparison; these were **not inserted into agent answers**.
- Four verdicts were exactly `insufficient_evidence`; eleven expressed equivalent abstention. The adapter accepts bounded aliases/patterns, never equating `supported`, `contradicted`, or a repair claim with abstention.
- All 15 contained nonempty representations of the nine advertised request fields. This checks **presence and shape**, not independent quality validation of every reference or all five evidence requirements. P1/P8 manual and P3 browser were inspected: they request action records, dated source-linked post-action measurements, methods/uncertainty, and acceptance criteria.
- The frozen scorer required `claimTextSha256` and `requestedEvidenceRequirementIds`, absent from advertised output fields. All 15 lacked requirement IDs; only one supplied a top-level hash. These fields remain missing and are not inferred from prose.
- The old `stringList` rejected string/object-array `requestedEvidence` and object-array `references`. The audit records this without claiming 100% actionability or removing reference checks.
- Correct scientific abstention is not automatically successful task execution. Outstanding obligations remain visible. No T2 became a full PASS.

### T3 — trust and environment

- The packet **contained** a trusted digest; generating a replacement was not the missing prerequisite.
- C1 opened `/dashboard/reports` without seeding `DEMO-work` or a historical decision. The r12 configuration explicitly cleared reviewer secrets/directory/tokens. An empty UI was not the intended fixture.
- C0-T3 received JSON and `submit_result`, without mutation, revisit, export, or CLI tools. The task required unavailable operations.
- T3 results remain failed/blocked. No reason code, digest, reviewer, or verification PASS was inserted. Authorization was not bypassed.
- Frozen scorer/3 measured reason-code equality for accuracy but omitted it from T3 completion. The adapter strengthens this; no historical T3 becomes a PASS.
- A future lab needs a **new protocol**, explicit fixture setup, a narrowly scoped DEMO software reviewer, and an available verifier. C0 needs equivalent obligations/tools or must be marked noncomparable. Do not rewrite r12 to conceal this limitation.

### P8 — diagnostic findings and limits

All three failures recorded model usage and `codex_result_missing`. `steps: 0` and `toolNames: []` **do not prove no tool was called**: the old bridge wrote counters only at submission. Temporary last-message/stderr files were not retained; targeted searches found no recoverable payload. The surviving P8-T3 `error-context.md` repeats the missing-usable-MCP-turn error, not a definitive browser/model cause. Dry-run screenshots are not sealed-attempt recordings.

The updated runner records atomic metadata before/after tools and at startup, ready, submission, close, and failure, including exit code and final-prose presence. Tests cover stub exit 0 without submission, final prose without submission, actual Chromium initialization failure, and invalid diagnostics. Missing submissions still fail. **Whether P8 would now finish remains untested here:** no new agent call was made.

## 3. Implementation and new verification

No database migration/schema, contract, provider setting, credential, or deployment changed. Reviewer permissions were not broadened.

| Area | Files / change |
|---|---|
| Runner metadata | `scripts/agent-usefulness/bridge-diagnostics.ts`, `codex-cli-runner.ts`, `codex-mcp-server.ts`, and regressions |
| Browser tools | `browser-tools.ts`: stable textbox names, visible controls, bounded budgets, `set_details` |
| Separate evaluation | `recovery-scorer.ts`, `recovery-scorer.test.ts`, `recovery-audit.ts`; `agent-usefulness-recovery/4` |
| Planner | `apps/web/src/InvestigationPlanner.tsx`; preview/active-queue and Inspect rows guidance |
| Browser regressions | `e2e/audit-workflow.spec.ts`, `e2e/ai-review-workflow.spec.ts`; `playwright.config.ts` adds a DEMO reviewer fixture |
| Production | v13 handoff, demo index, evidence in this directory |

| Check | Recorded result / evidence |
|---|---|
| `bun run check` | PASS: API, web, E2E, evaluation, agent-lab TypeScript; `check-output.txt` |
| `bun test scripts/agent-usefulness` | **60 pass / 0 fail**, 17 files; stub/local Chromium, **no model**; `lab-tests-output.txt` |
| `bun run test:web` | **282 pass / 0 fail**, 61 files; `web-tests-output.txt` |
| `gates-r12.ts` | **12 pass / 0 fail** newly run; `gates.json`. Gates are not episodes. |
| Main Chromium production build | One exact-membership 10→20 scenario and queue/globe/evidence handoff; `browser-main-output.txt` |
| Review Chromium production build | Three distinct scenarios: connected dossier, human-only path, mock-AI citations/private review; `browser-review-output.txt`, `browser-final-output.txt`. A corrected-fixture rerun is not extra coverage. |
| Retained TKM CLI | **Five expected outcomes**: original PASS, altered+rehashed FAIL, original PASS, missing digest FAIL, require-chain without configuration FAIL; `verifier-proof.json` |
| Production build/budget | Vite build passed; App 74,935/75,000 gzip bytes, eight route chunks, MapPanel 1,123,502 raw bytes; `bundle-output.txt`. Large lazy-map warning remains. |
| Freeze/replay guard | All 73 r12 files unchanged; source scorer matches frozen scorer. Wrong IDs, duplicates, false-active/replacement allocation, missing digest/code remain rejected. |
| Desktop/mobile rendering | New 1440×1000 and 390×844 screenshots visually inspected; not physical-phone, complete accessibility, or FPS testing. |

**Retained development failures:** a new test found `getClientRects` exposed inputs in closed disclosures. Tooling now checks visibility and ancestor `details`. A mitigation-only reviewer fixture could not save a plan requiring `source_detected`; the new fixture explicitly has both scopes while the old reviewer remains restricted. `browser-fixture-scope-failure.txt` is retained, not counted as PASS.

The initial demo combined `source_detected` with a follow-up question. Its captures/JSON were moved to `initial-demo-check/` and are **not proof for the final mitigation claim**. The corrected fixture consistently binds mitigation claim, TKM source, UTC period, DEMO reviewer, and follow-up request.

Full API/Python/Foundry suites were not rerun because those modules did not change. Hono was exercised through browser flows and gates. No public provider/chain/deployment or human study was run. Local checks do not make older public-service evidence current.

## 4. Video evidence and outstanding work at this revision

Primary exports: `connected-investigation.json` (three work revisions), `frozen-investigation-decision.json` (five work revisions, three events), `revisited-investigation-decision.json` (new response, review recommended, frozen decision unchanged). They bind TKM, snapshot `unep-mars-675417694883`, UTC scope 2020-10-29–2026-09-13, claim `mitigation_confirmed`, reviewer `connected-demo-mitigation`, decision `request_more_evidence`, and **not_anchored**. Exact hashes/timestamps belong to these exports; do not copy them into a new take.

**Locally ready:** planner, request fields, authorized DEMO review, frozen decision, response-triggered revisit, original/rehash verification. Screenshots/exports are available. DEMO responses, dates, and file hashes are fixtures, not actual company reports.

**Outstanding at this historical revision:** Practical Usefulness was unproven; the old P8 cause unknown; no live-AI TKM, TKM Anvil receipt, new final footage, male narration/captions/mix/render/playback, or deployment existed here. Existing live-model/Anvil evidence used KAZ. The safe fallback was a separate KAZ segment labeled by case/date/environment. Later follow-up evidence must be read separately.

[Production handoff v13](../../demo/delivery-2026-10-21-final-v13/production-handoff.md) contains a **280-second** storyboard, 575-word English narration, shot/claim/capture ledgers, cursor/zoom/transition/audio instructions, QA, and production commands. No MP4 was made/uploaded here. `verification.json` binds local source/artifacts. Reruns are not a new agent study or a probability of winning.
