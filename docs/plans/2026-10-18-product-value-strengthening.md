# Strengthening Product Value and Investigation Workflow

**Status:** verified within local scope · 18 October 2026. Root is the repository's sole writer; agents assist with read-only analysis and review.

**Authorization:** the user approved three deliverables and left implementation choices open. Tests are authorized. Execution follows the `adaptive-engineering/references/persistent-plans.md` adapter; no commit/deployment/external publication was performed.

**Goal:** improve usefulness and evidence for Climate Impact, Innovation, and Practical Usefulness. The 18/20 target is an internal scoring aspiration, not a test result or guarantee of a judge's score.

**Baseline:** HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` with 201 retained working-tree changes. P5/P6 and integration-role-simulation packages remain frozen. Slow/partial P5 findings are not replaced with new results.

## Implemented design

1. Use the existing scope editor: presets for UTC observation ranges and a single event day, preview before Apply, an unapplied-draft indicator, and a baseline block while the period remains a draft. Presets assist input; they do not determine action/mitigation dates.
2. Put file verification directly in Reports. The default mode requires the complete export-context checksum, with an explicit option for legacy files. Show bundle integrity, context, and limitations separately. Local file checks do not require the CLI.
3. Freeze tasks/rubric before comparison. Give the manual baseline the same data/provenance/rules and hash tool; report functional outcomes and steps, not time saved for people. Do not artificially limit the manual condition or claim that the original MARS baseline was tested.
4. Three historical case studies: snapshot facts, decision problem, available and missing evidence, rules results for an explicit scope, and the next evidence request. Do not reproduce third-party report contents.

## Milestones and acceptance

- [x] **M1 — scope and verifier workflow.** Files: `AssessmentScopeEditor.tsx`, scope helper/tests, `EvidenceAuditorWorkflow.tsx`, `ImportedAuditVerifier.tsx`, `imported-audit-verifier.ts`/tests, Reports in `App.tsx`, CSS, and E2E. Use RED→GREEN for new behavior; Chromium desktop/mobile covers presets/apply, draft guard, complete export/import, and tampering.
- [x] **M2 — functional comparison.** Files: new package `docs/evidence/product-value-2026-10-18/`, harness/tooling tests as needed. Hash inputs/protocol/rubric before execution; retain raw baseline and app results, and do not hide failures. Agents do not count as human respondents.
- [x] **M3 — three case studies and documentation.** Files: case studies in `docs/research/`; product workflow, status, evidence index, and plan index. Replay all numerical facts from the fixed dataset. Document existing and new limits.
- [x] **M4 — review and final evidence.** Run focused tests → typecheck → browser → build/bundle. Independently review changes/results. Freeze file hashes, raw logs, selected screenshots, and commands in a new package. Run the full gate only when proportionate to cross-component changes; do not describe old results as a rerun.

## Conclusion limits

This work included no new expert/human participant, external AI provider, public deployment, or Sepolia transaction. Case studies produce transparent, traceable decisions, not proof of emissions reduction. A checksum without a trusted publisher does not prove authenticity. Scores must follow results; they are not raised automatically.

## Verification results

- Full `bun run check:all` exited 0: 193 API + 253 web + 54 tooling + 212 Python + 4 Foundry = **716 tests**; typecheck/build/bundle passed (App 71,724 gzip bytes).
- Four local Chromium scenarios passed, including desktop/mobile, preset/draft recovery, strict Reports verifier, and investigation regression. Browser sandbox remained enabled.
- Frozen comparison: app 16/16 exact; manual 11/16 exact because five boolean values were compared with enums (the prompt did not explain enum types). Raw results were retained. Post-hoc format analysis was 16/16; this is **decision parity**, not superior accuracy or human time savings.
- Three historical mitigation-scope reports returned insufficient_evidence with valid bundle/context; case studies attribute UNEP summaries without reproducing PDFs.
- Independent review found that scope drafts were lost during navigation; this was fixed and covered by a regression. Limits around legacy helper mode, storage failure, and structured overclaim metrics are documented. Hashes for 118 production files and 204 prior-package checksums matched.

[Results package and replay commands](../evidence/product-value-2026-10-18/README.md). No material finding remains that requires a code change within this scope. Human review and external integrations remain as recorded in the prior ledger. No commit/push/deployment was performed.
