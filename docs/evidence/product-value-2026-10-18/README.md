# Strengthening product value — 18 October 2026

[Plan](../../plans/2026-10-18-product-value-strengthening.md) · [User workflow guide](../../product/user-workflow.md) · [Three case studies](../../research/three-historical-decision-cases-2026-10-18.md)

The [English reading guide](../english-reading-guide.md) explains this historical comparison. Its original frozen protocol remains verbatim. Newly prepared packets now generate English instructions; use a new output directory rather than overwriting this study.

## Usable outcomes

1. **Clearer scope.** Observation-range and event-day presets use UTC normalization; users review them and then apply. The baseline is disabled while a scope change is unapplied. Draft scope is restored per investigation/tab context; storage failures are marked. Presets do not guess action/follow-up dates.
2. **Verification in Reports without a CLI.** Users download JSON and select it on the same page. Export context is required by default. The legacy option is explicit, results are cleared when the option changes, and the file must be selected again. Bundle hash, export context, and receipt remain separate. The code helper retains a legacy default for compatibility; the UI explicitly applies the strict policy.
3. **Three complete historical case studies.** Kazakhstan emphasizes action/event order; Libya, the lack of follow-up measurements; Canada, uncertainty and the prohibition on extrapolating avoided emissions. Each includes facts, evidence gaps, a decision, a follow-up role, and an evidence request.

The internal 18/20 target is a direction for improvement, **not a score awarded by the tests**. This package does not promise a score or a win.

## Tool-assisted comparison

Inputs, protocol, rubric, and 118 production files were frozen before two executions in [input-freeze.json](input-freeze.json). The [protocol](protocol.md) defines 16 cells: nine metadata-coverage checks across three historical cases, five DEMO integrity challenges, one DEMO lineage case, and one DEMO UTC normalization case. The manual baseline operator received identical data, policy, shared JSON/hash, and permission to use the same CLI verifier. According to the operator report, they did not read the rubric, replay the app, or scorer before submitting results.

| Measure | Application function replay | AI operator using a manual workflow with tools |
|---|---|---|
| Scheduled / missing cells | 16 / 0 | 16 / 0 |
| Exact match to frozen rubric | 16/16 | 11/16 |
| Integrity decision differences | — | None; five mismatches were boolean versus string-enum values |
| Match after **post-hoc** format mapping | 16/16 | 16/16 |
| Overclaims on the two scored boolean fields | 0 | 0 |

**Conclusion: decisions were equivalent on this small task.** The prompt named `localDigest` but did not explain the field enum. The operator wrote `true`/`false`; the app uses `valid`/`invalid`. This is a research format-contract weakness, not evidence that the manual workflow checked files incorrectly. The [primary analysis](comparison.json) and [original manual results](manual-results.json) are retained. [Format sensitivity analysis](format-sensitivity.json) is labeled post hoc and does not replace the initial result. Do not present 16 versus 11 as an application accuracy advantage.

The operator used the Python standard library. According to the operator notes, attempts to run the CLI through `tsx`/`pnpm exec` failed and triggered a blocked fetch; no dependency was added. An alternative hash helper was allowed by the protocol. The [helper and original log](manual-replay/manual_checks.py) are preserved; root reran the helper after moving the fixture directory and got an identical log. This does not make a limited helper equivalent to the application's full validator coverage.

`criticalOverclaims` counts only two structured fields (`physicalMitigationEstablished`, `authenticityEstablished`), not all free text. Root separately reviewed tools/deviations and case studies. A manual-helper comment that treats a timestamp without a timezone as UTC was read as a parser convention; the upstream timezone has not been verified.

**Demonstrated benefit:** claim coverage, rationale, revision, and file checks can be handled in one product workflow. **Not demonstrated:** human time/cost advantage, usability by target users, or scientific superiority. The earlier P5 result remains unchanged: 15/24 pairs passed the time filter; median manual-minus-app was −33.914 seconds, meaning the app was slower in those agent wall-time pairs. It is not combined with the new result.

## Three inspectable historical outputs

| Source | Metadata-analysis scope | Result | File check |
|---|---|---|---|
| [KAZ_S_159](kaz_s_159-mitigation-report.json) | 2024-06-07 → 2026-10-14 | insufficient_evidence | Bundle and context valid |
| [LBY_S_143](lby_s_143-mitigation-report.json) | 2025-12-23 → 2026-10-14 | insufficient_evidence | Bundle and context valid |
| [CAN_S_002](can_s_002-mitigation-report.json) | 2026-04-10 → 2026-10-14 | insufficient_evidence | Bundle and context valid |

[Full check results](case-reports.json). The case-study scopes above are broader than the comparator task, which deliberately limited scope to the first event. They are recorded separately. Reports were created locally through the production function, not added to the API audit store or published. A link-only UNEP report is not typed evidence of action/follow-up in the baseline. `insufficient_evidence` describes the application metadata-check limit; it does not deny UNEP confirmation.

## Checks performed

- `bun run check:all`: **716 tests** — 193 API, 253 web, 54 tooling, 212 Python, 4 Foundry; typecheck/build/bundle gate passed. App entry: 71,724 gzip bytes. [Log](logs/check-all.log).
- Chromium sandbox enabled, isolated local web/API servers: **4 scenarios** — scope presets/draft/Reports verifier, work resume, export/verification/tamper, and separate investigations. Desktop 1600×1000 and mobile viewport 390×844; no page errors in new scenarios and no horizontal overflow. [Log](logs/browser.log), [desktop](screenshots/report-verification-desktop.png), [mobile](screenshots/report-verification-mobile.png).
- Two scorer tests preserve denominator/missing results and reject duplicate/extra IDs; these are included in the 54 tooling tests above. The 16-cell comparison replay is not 16 additional tests in `check:all`.
- Three case-study reports returned `manifest_valid`/valid bundle. Manual helper replay produced the same log. Casebook, input, code, and prior-package hashes were checked at closure.

The scope-helper, strict-verifier, and verifier-component changes have recorded red→green stages. The initial browser attempt was blocked because the built-in browser was unavailable, then the filesystem sandbox rejected Chromium sockets; execution used system Chromium while keeping browser sandboxing enabled. The initially assumed end date was also corrected after inspecting the actual fixture (`2026-07-11`, not the assumed date). Failed logs are retained and are not counted as successes.

## Rerun

```sh
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep 'scope presets|unsaved work|historical MARS case|analyst case work resumes'
bun run evaluate:product-value prepare /tmp/NEW_PRODUCT_VALUE_PACKET
# Give inputs.json + protocol.md to a separate operator; save the response to manual-results.json.
bun run evaluate:product-value run /tmp/NEW_PRODUCT_VALUE_PACKET
bun run evaluate:product-value analyze /tmp/NEW_PRODUCT_VALUE_PACKET
```

Do not overwrite this frozen package. `prepare` requires a new directory; outputs use exclusive creation. The freeze stores a casebook checksum and verifies input/code at run/analyze; casebook recheck at closure is also recorded in [verification.json](verification.json). To repeat scoring on old inputs, copy input/rubric/protocol/freeze to a new directory with matching code, then run/analyze in the copy. Do not change the rubric after seeing results and claim performance improved.

[manifest.json](manifest.json) binds the source ZIP, dataset, active documents, and package materials. [checksums.sha256](checksums.sha256) detects changes relative to this package; a checksum without a trusted sender does not authenticate the publisher. The dataset snapshot and adaptation summary follow CC BY-NC-SA 4.0 with UNEP IMEO attribution; sources are available in the input provenance. No third-party report contents are reproduced.

## Limits that remain

Sparse observations are not continuous monitoring. No plume does not mean zero methane. Feedback is not proof of repair. A hash and receipt are not physical truth. One AI operator is not a human participant. No new experts/participants, external provider, public deployment, or Sepolia transaction was involved in this increment. Screenshot artifacts are viewport emulation, not physical-phone tests. The development browser and build gate were verified separately; production-hosted browser testing has not been done.
