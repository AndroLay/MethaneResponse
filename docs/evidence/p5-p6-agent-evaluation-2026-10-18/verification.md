# P5/P6 engineering verification — 18 October

## Actual results

| Check | Result | Limit |
|---|---|---|
| `bun run check:all` | **exit 0**; 193 API, 247 web, 41 verifier/tooling, 190 Python, 4 Foundry: **675 tests passed** | Local engineering, not a human/provider study |
| API/web/E2E/evaluation typecheck | Passed within the gate | Freeze/runner/tests/reproducer are now covered by `check:evaluation` |
| Production build + bundle budget | Passed; App 71,689 gzip bytes /75,000; 8 required route chunks | Does not measure user networks/devices |
| Twelve provisional agent claims | Actual TypeScript `assess` with scoped source metadata: 12 policy-label matches | Four sources, two labels; not counted as accuracy against an independent gold set |
| Agent browser walkthrough | KAZ T1–T4 and ARG T1–T2; original export passed, two tampered exports rejected | One agent, not blind; manual condition/timing/confidence were not run |
| Manual verifier samples LBY/CAN | Two raw baseline exports passed CLI digest check; receipt absent | Packet for a future session; not participant results |
| Read-only agent review | Three additional findings fixed; agent confirmed code/protocol changes | Agent did not report rerunning the full gate |

All test fixtures are disposable/synthetic and used for software checks. No provider or participant metrics were derived from fixtures.

## Recorded RED → GREEN

- New P5 tool: initial import test failed because the module did not exist; implementation then passed. Initial standalone `pytest` invocation also needed the module path; tests now add the local path, and focused commands use `python -m pytest`.
- P6 evaluator: eight new regressions failed before the binding/basis/telemetry/activation fixes, then passed.
- Runner: two regressions failed before complete-attempt mode and input source URL, then passed; shared-directory guard also passed.
- Partition freeze: regression failed before source/document split binding, then passed.
- Final review: missing-telemetry and cell-skew regressions failed before fixes, then **45 focused Python tests passed**.
- New typecheck found an old fixture missing the default consent field; the fixture was parsed/completed according to the contract without weakening types.

Gate log during the session: `/tmp/methane-p56-full-gate.log`. Focused logs: `/tmp/methane-p56-python-green.log`, `/tmp/methane-p6-typescript-green.log`, `/tmp/methane-p56-typecheck.log`; RED logs also remain in `/tmp`. Temporary logs are not required to use this package; summary counts and source/artifact hashes are preserved.

## Repeat the checks

```bash
bun run check:evaluation
bun test scripts/run-ai-benchmark.test.ts scripts/freeze-ai-assessment-inputs.test.ts
cd services/data-pipeline
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run --locked python -m pytest \
  tests/test_pilot_study.py tests/test_evaluate_evidence_ai.py
```

From the root, use a new output path to avoid overwriting:

```bash
bun docs/evidence/p5-p6-agent-evaluation-2026-10-18/repeat-agent-metadata.ts /tmp/new-agent-metadata-result.json
```

`prepare-packet.py` freezes the source allowlist into a deterministic ZIP and writes the manifest once; it refuses existing outputs. The archive excludes environment files, private state/corpus, report bodies, and visual assets whose redistribution rights are unclear. Active data is hash-bound and obtained separately under its license.

## Decision and remaining limits

Engineering and agent evaluation for this increment are complete locally. **The full P5/P6 research is not complete.** There is no evidence from 5–8 users, two annotators/adjudicators, a permitted source-disjoint document gold set, or a provider benchmark. The model is not declared eligible for activation. P4 remains pending. No deployment, external publication, participant contact, public transaction, or provider processing of third-party reports occurred.
