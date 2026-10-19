# Investigation workflow — local implementation and evidence

**Date:** 16 October 2026  
**Source baseline:** `a82e2eee99bb79327f859f304f2f5d5939f07041` plus the current uncommitted implementation.  
**Scope:** Evidence Auditor, saved-assessment comparison, readable report export, and stale-response handling. The accepted local-file prototype scope remains in effect.

The [implementation manifest](implementation-manifest.json) records SHA-256 for the 17 implementation/test files exercised by the final checks. Documentation and screenshot checksums are recorded separately.

## What changed

1. **Claim evidence coverage.** Overview shows requirements for detection, notification and mitigation claims. Required-type citations, claim-specific contrary records, historical observation context, administrative flags and link-only reports stay distinguishable. Selecting a claim updates the next checks without creating a saved audit. The baseline runs only on an explicit button click.
2. **Actionable next checks.** Guidance routes to observations, source-filtered references, optional document review, or the saved assessment. Unreviewed suggestions require human review. Rejected and needs-more-evidence revisions direct the user to add evidence and create a new assessment; they do not promise a second review of a terminal revision.
3. **Visible citations.** Overview shows cited record IDs, dates, types and source links as soon as a result is available. Review identifies the saved assessment's dataset snapshot.
4. **Saved-assessment comparison.** Reports and Blockchain history compare two loaded assessments for the same source, claim and real/demo mode. Differences include decision, reason, human review, note, case, dataset label/archive/input hashes, method, exact claim scope, document inputs and quoted-passage sets, plus added/removed/changed citations. A changed binding or exact claim scope has an explicit caution. Comparator selections are independent of the report currently open. This view neither recomputes nor verifies a verdict.
5. **Readable investigation brief.** Reports can download Markdown built from the same snapshot-bound payload builder used by JSON. It includes scope, allowed cited evidence, provenance, historical context, linked publisher references, next checks, canonical bundle hash and limitations. It shows at most 50 context rows and retains their total count. Missing flux and uncertainty remain unavailable. Current observations are omitted if they do not match the saved audit's dataset binding.
6. **Publication boundaries.** The brief omits exact private claim wording, private document references, free-text reasoning/reviewer notes and private assessment limitations. It never reproduces document quotations. A private assessment is visibly marked PRIVATE REVIEW DRAFT. Publication is not inferred from a local download. JSON retains the authorized audit material and remains the artifact to verify. Separate downloads have their own timestamps and outer checksums; their canonical audit bundle hash identifies the same saved assessment.
7. **Asynchronous isolation.** Changing source, claim, dataset selection, selected history revision, or private-history session invalidates earlier assessment responses. The Auditor session remounts on context changes so a late document response cannot repopulate its local panel. Verification results and pending indicators are tied to context, audit ID and hash. Locking history clears a saved private revision even when another source currently hides it.

The API and UI share one required-evidence-kind mapping. No baseline scoring rule, serialized audit schema, canonical hash format, persistence adapter, or dependency was added.

## Reproduce

From the repository root, using the existing installed dependencies:

```bash
bun --no-env-file run check
bun --no-env-file test apps/api/src apps/web/src
bun --no-env-file run build:web
bun --no-env-file run check:web-bundle
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun --no-env-file run test:e2e e2e/audit-workflow.spec.ts
env PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun --no-env-file run test:e2e e2e/ai-review-workflow.spec.ts
git diff --check
```

The browser runner creates isolated API/Vite processes and a temporary JSON audit store, clears provider/chain credentials, and blocks non-local page requests. The AI phase uses a deterministic local mock provider and temporary scoped review/read tokens. Its document fixture retains the existing source attribution and license declaration. It does not send excerpts to an external provider or submit a blockchain transaction.

## Verification scope

New unit cases cover metadata exclusions, claim-scoped contrary records, required-type reference guidance, terminal review actions, comparison changes and lineage, dataset input-byte changes, export binding, null flux, Markdown escaping, long histories and private-material omission.

Browser cases cover claim selection/action routing, source-filtered references, live citation display, Markdown download, comparison without audit creation, 390 px page bounds, late baseline/verification responses, explicit saved-revision precedence, private-history locking across source navigation, and late document responses after a claim A → B → A transition.

The document-response regression was first run against the unfixed panel and failed because `.intel-result` still contained the prior response. Its subsequent result is recorded below. An earlier comparison run also exposed an ambiguous select label; explicit accessible labels were added before rerunning.

## Recorded results

Final local runs passed:

| Check | Result |
|---|---|
| API, web and browser TypeScript checks | Passed |
| API and web unit/integration tests | 315 passed, 0 failed across 60 files; includes 18 new focused unit cases |
| Main Chromium workflow | 10 passed, including the four new investigation/comparison/race scenarios |
| Mock Document AI Chromium workflow | 2 passed; private-history lock and late-document regression included |
| E2E runner environment regressions | 3 passed in each browser invocation |
| Web production build | Passed; existing MapPanel size advisory remains |
| Compressed bundle budget | Passed; App 71,247 gzip bytes, 8 route chunks; MapPanel 1,122,953 raw bytes |
| Whitespace/error-marker diff check | `git diff --check` passed |

The final runs used Bun 1.4.3 and Chromium 153.0.8010.52 on the 16 October working tree. The repository's Bun pin remains 1.4.2; it was not changed for this run. Desktop evidence uses a 1600 px viewport; mobile is a 390 × 844 Chromium viewport on the same host, not a physical phone. The API and web tests include actual baseline/audit-store behavior; model responses in the AI browser workflow are deterministic fixtures.

An intermediate private-history test incorrectly used a review-only token and received the expected unauthorized-read response. The test now issues a separate ephemeral `private_read` token; both final AI scenarios passed. The late-document regression passed after the Auditor was keyed to its investigation context.

## Browser captures

These are inspected local Chromium captures, with checksums in [SHA256SUMS](SHA256SUMS).

- [Claim requirements and next checks — desktop](claim-evidence-coverage-desktop.png)
- [Evidence Auditor — mobile](claim-evidence-coverage-mobile.png)
- [Saved-assessment comparison — desktop](audit-comparison-desktop.png)
- [Reports and comparison — mobile](audit-comparison-mobile.png)

## Limits

These are local software checks against historical snapshots and a mock document provider. They do not measure external AI quality, target-user task success, real-device performance, hosted durability, a live Sepolia transaction, or physical methane mitigation. The Python pipeline and Solidity source are unchanged; their full suites are not part of this focused implementation run. The existing large MapPanel build advisory remains subject to the separate compressed bundle budget.
