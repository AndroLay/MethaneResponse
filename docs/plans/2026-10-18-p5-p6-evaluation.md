# P5–P6: Local Execution and Agent-Assisted Evaluation

**User direction, 18 October:** leave P4 pending; continue P5/P6 and use agents to operate the application. Execution follows the [six-package plan](2026-10-17-six-package-completion.md), using the executing-plans skill and persistent-plans adapter. The primary agent wrote all changed files; two agents performed separate checks without modifying the repository.

## Boundaries and decisions

- P4 remains pending human review; do not modify the frozen v1/v2 packages.
- Agents may test workflows and produce provisional assessments. Report results as agent evaluation, not human participants, independent gold, or AI provider quality.
- Human sessions, an authorized corpus with two annotators/adjudicators, and provider target/cost authorization are not available. Do not create substitute results or send documents outside.
- Preserve all existing changes at HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` plus the working tree. Do not change dependencies, deployment, or the public summary projection.

## Milestones and acceptance

| Work | Status | Checks |
|---|---|---|
| Confirm P5/P6 scope and available sources | verified | Protocol, runner, evaluator, and casebook data inspected; user requested agents |
| P5: two-case package, tasks/answer key, counterbalanced assignments, and paired analysis | locally verified | Denominator, missing-task, assistance, differing-build, exit-misconception, and agent-mode tests; 19 pilot tests |
| P6: bind rules comparator to the same inputs; record failures/latency/abstention and benefit decision | locally verified | Hash mismatch, provider failure, legacy telemetry, and benefit-vs-absolute-gate regressions; 26 evaluator tests plus runner/freeze |
| Agent operates the app and checks metadata claims | locally verified | One browser agent: KAZ T1–T4 + ARG T1–T2; second agent: 12 provisional metadata claims; manual/timing/human/provider conditions not run |
| Freeze package, local results, limits, and ledger | locally verified | [Evidence](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md); `check:all` exit 0/675 tests; 290 source files and 139 data assets bound; human/provider studies pending |

**Concrete gaps:** P5 had a protocol but no aggregator; the P6 baseline evaluator checked claim IDs but did not bind input hashes; the runner dropped results when one provider failed and did not record latency. Metadata coverage is not automatically equivalent to assessing document meaning: the comparator must state its basis.

**Intended outcome:** directly runnable packages, tested local analysis, traceable agent results, and an accurate status for human/provider studies. Technical completion does not change the original research criteria.

## Results and next steps

All engineering work above is complete locally. Agent review found legacy telemetry, manifest wording, and cell imbalance issues; all three were fixed, tested RED→GREEN, and confirmed by reinspection. No dependency or public summary projection changed. Historical P4 artifacts were not rewritten.

To complete the original research, a facilitator needs paired user sessions and an authorized corpus, rights, annotators/adjudicators, and provider. The user can use the current agent results as rehearsal and functional checks, within the stated limits. A new freeze is required before collecting data in the next sessions.
