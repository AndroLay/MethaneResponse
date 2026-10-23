# P5/P6 — agent-assisted follow-up execution, 18 October 2026

[Evidence index](../README.md) · [Execution plan](../../plans/2026-10-18-p5-p6-agent-execution.md)

This narrative is maintained in English. Original task instructions, prompts, and answers are retained verbatim; the [English reading guide](../english-reading-guide.md) explains their methods and limits without changing the frozen study.

**Scope:** agent evaluation as requested by the user. This continues the [previous engineering increment](../p5-p6-agent-evaluation-2026-10-18/README.md), which has not been rewritten. Results support conclusions only for the tasks and inputs actually run. Agents do not represent a human pilot, expert audit, application-provider benchmark, or emissions impact.

**Final status: P5 and P6 complete for agent scope.** All sessions/predictions were run and saved; results were analyzed and reviewed from an engineering perspective. CLI findings were fixed and checked against the same pilot files. This completes the [agent execution plan](../../plans/2026-10-18-p5-p6-agent-execution.md). The human/provider research gates in the original plan remain unmet. Completing the evaluation does not prove benefit or AI eligibility.

| Result | Actual value | Meaning |
|---|---|---|
| P5 | 2 agents, 6 repeated sessions, 48/48 tasks recorded | 40 correct, 8 partly correct; no human participants |
| P5 assistance | 32 none, 6 navigation hints, 10 substantive hints | Retained in the denominator; 10 substantive hints were on T4 |
| Paired P5 time | 15 of 24 pairs passed the filter; median manual-minus-app **−33.914 seconds** | The app was slower in this agent wall-time subset; this is not a human time saving |
| CLI recheck after fix | 25 pilot JSON files, 50/50 checks matched expectations | Originals accepted in the corresponding mode; all tampered files rejected. Raw manual audit without a checksum is intentionally rejected in strict mode |
| P6 | 72 test claims from 12 sources; two agent contexts | Each scored 71/72 correct; rules scored 72/72 on this task grammar |
| P6 decision | No additional AI benefit demonstrated | Retain rules for this structured task; AI activation eligibility is not granted |

Full data: [P5 analysis](p5-analysis.json), [scoring](p5-scoring.json), [scoring method](p5-scoring-method.json), [P6 analysis](diagnostic-analysis.json), [findings and follow-up](findings.md), and [final verification](verification.json).

## P5 — manual and application workflows

Tasks/sources were frozen in [p5-freeze.json](p5-freeze.json): two agents, six repeated sessions, two conditions per session, four tasks per condition. **Two agents are not six independent participants.** Counterbalancing across sessions does not remove agent learning. Cases LBY_S_143 and CAN_S_002 used historical metadata with AI off.

T1 finds date/flux/uncertainty; T2 gives a triage rationale; T3 assesses whether a mitigation reference is sufficient; T4 checks the original export and a modified copy. The manual condition received a metadata packet and export prepared by the facilitator. T4 measures verification only. Agent wall time includes model/tool latency and cannot be described as human-user time saved.

Initial instructions withheld the answer key from the agent using the app. During the sessions, the facilitator told both agents about the CLI limitation so the verifier change could be scheduled after the sessions. **This is a protocol deviation:** T4 after that information is considered to have received substantive assistance. Data before and after the message are both recorded; this is not presented as an independent pilot.

### Results by task

Each accuracy cell uses a denominator of **6 sessions**, including partial results. Medians use all six actual times in each condition, including partial/assisted tasks. This differs from the 15-pair filter in the summary above.

| Task | Manual: correct / partial | App: correct / partial | Median manual (seconds) | Median app (seconds) |
|---|---|---|---:|---:|
| T1 | 6 / 0 | 6 / 0 | 7.804 | 40.671 |
| T2 | 6 / 0 | 6 / 0 | 6.221 | 34.307 |
| T3 | 3 / 3 | 4 / 2 | 6.728 | 71.168 |
| T4 | 6 / 0 | 3 / 3 | 23.046 | 36.998 |

Five T4 tasks in each condition received a substantive hint. No T4 pair qualified for the unassisted time analysis. Zero critical exit beliefs means neither agent said feedback, missing observations, or a score/hash was physical evidence; this does not measure human understanding. Confidence was not collected because these were not human responses.

The eight partial results were retained: two app T3 scopes began one day after the observation; three manual T3 answers assumed/implied an unknown action chronology; and three app T4 runs found that the old CLI accepted a changed context. Later correct sessions and the patch recheck were not used to replace those results.

### What the application added

In this session, the application provided source search, historical observations, a priority heuristic, scope selection, rules coverage, audit/export creation, and a browser verifier. The manual packet was curated metadata that was easy to read, with an export supplied by the facilitator. This comparison does not measure the burden of finding/combining data in the original MARS portal and does not prove the application is faster than that portal. No ranking against other competition submissions can be drawn from these results.

[Runtime binding](p5-runtime-binding-check.json) checked 201 API/web/shared/contract files against the initial archive; no runtime drift occurred during the session. The CLI change was made **after all T4 tasks finished**. [Before](cli-context-before-fix.json) and [after](cli-context-after-fix.json) use different verifier hashes and are not combined as results from one build. Hash/checksum is local binding, not independent attestation of execution timing.

## P6 — record-content diagnostic

[Freeze](diagnostic-freeze.json), [agent instructions](p6-agent-instructions.md), [inputs](diagnostic-inputs.json), [reference](diagnostic-reference.json), and [rules](diagnostic-rules.json) were created before scoring. There are 96 **DEMO-authored probes**: train12/dev12/test72 on 2/2/12 disjoint sources and documents. The base metadata is real; test statements were deliberately authored for evaluation and are **not publisher claims discovered in the field**. The four pilot sources were excluded.

Rules read the same documents and propositions as the agents. They check source/timestamp/flux as written and abstain on event/repair evidence that is not supplied. This is a structured comparator that knows the task grammar; source-disjointness does not remove template bias. The application coverage baseline has a different basis and is not scored as semantic accuracy as though it were equivalent.

Agent citations were replayed through the application's actual `verifyCitations`. Exact match only proves that the quote occurs in the text; **semantic citation precision was not measured**. Scoring used separate agent contexts from the same model family, so errors may be correlated. The comparison uses record-derived references, not human gold. The application provider and its two-pass inference were not run; per-claim time and billed cost are unavailable.

### Results and decision

| Test metric | Rules | Agent 1 | Agent 2 |
|---|---:|---:|---:|
| Correct / 72 | 72 | 71 | 71 |
| Macro-F1 | 1.0000 | 0.9861 | 0.9861 |
| False supported | 0 | 0 | 0 |
| Insufficient verdict / 72 | 24 | 23 | 23 |
| Failed/missing predictions | 0 | 0 | 0 |
| Exact quotation match | See rules replay | 96/96 | 144/144 |

Test references are balanced: 24 supported, 24 contradicted, 24 insufficient. Agent-minus-rules accuracy difference was **−1.389 percentage points** for each agent; source-cluster bootstrap 95% interval **[−4.167; 0]**, 400 resamples, seed `20261018`. Agent macro-F1 interval is approximately [0.9582; 1.0000]; 12 clusters and the shared task template limit generalization. Rules know the challenge grammar; a perfect score here does not guarantee semantic reasoning on free-form documents.

Both agents agreed on 72/72 (Cohen's κ=1), but made the same error on claim `BHR_S_001-probe-5`: source flag `No` does not establish whether a particular recipient received notification before the observation timestamp. The reference is insufficient; both agents chose contradicted. One agent's rationale also discussed repair, which does not answer the notification claim. An exact matching quote did not catch this error.

References, raw predictions, prompt, and rules were not changed after the error was observed. Annotation guidance now clarifies flag and chronology limits; no improvement on a held-out set is claimed after that guidance change. Evaluation decision: **do not grant AI activation eligibility based on these results**; retain rules as the main comparator for this structured task. The evaluation did not change the provider configuration on the user's host.

The final replay rebound **216 assessments** (72 rules + 144 agent) to the original claim and document payload, then rechecked raw→grounded, quote, verdict, and count. This checks evaluation-pipeline integrity, not semantic relevance of rationales/quotes.

## Reproduction

For a new evaluation run, create a new package; do not overwrite this freeze/results. `prepare-diagnostic.py` refuses existing outputs. `diagnostic-test-inputs.json` filters the already-frozen inputs to test.

```bash
bun --no-env-file test scripts/verify-agent-diagnostic.test.ts scripts/verify-audit.test.ts
cd services/data-pipeline
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run --locked python -m pytest tests/test_agent_metadata_diagnostic.py tests/test_agent_diagnostic_bindings.py -q
```

The grounding replay takes three arguments: test input JSON, prediction array JSON, and a new output path. It does not call a provider:

```bash
bun --no-env-file scripts/verify-agent-diagnostic.ts \
  docs/evidence/p5-p6-agent-completion-2026-10-18/diagnostic-test-inputs.json \
  docs/evidence/p5-p6-agent-completion-2026-10-18/diagnostic-rules.json \
  /tmp/new-rules-grounding.json
```

The analysis script refuses to overwrite reports. To recalculate, copy this package to a separate location with the same repository structure and remove **only analysis outputs in that copy**; do not delete original evidence. Final integrity check uses `checksums.sha256` from this folder.

Application exports can be checked with `bun run verify:audit <file.json> --require-context`. Legacy raw audits can still be checked without the flag, subject to their stated context limits. Export checksums are unsigned, can be recomputed, and do not authenticate the issuer or a physical event.

`evaluation-source.zip` freezes source **after the fix**, using an allowlist that excludes environment/state/private corpus; [manifest](manifest.json) binds source, dataset, and evaluation material. The pre-pilot archive remains referenced by `p5-freeze.json`. Earlier analysis reports are retained as `diagnostic-analysis-initial.json` and `diagnostic-analysis-binding-v1.json`; the final report adds a binding replay, not a re-score to raise the result.

## License and publication limits

Metadata: **UNEP IMEO: MARS, CC BY-NC-SA 4.0**, [dataset terms](https://creativecommons.org/licenses/by-nc-sa/4.0/). Modifications: selection of one quantified record per source, JSON format, and authoring of DEMO challenge claims. Full provenance is stored in the freeze and [data/real](../../../data/real/README.md). Reuse derived metadata under the dataset license. No linked report body, document with restricted rights, human participant identity, credentials, or private user state is included in this package.
