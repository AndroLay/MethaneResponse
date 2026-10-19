# Workflow continuity — 17 October 2026

Local working-tree increment over `a82e2eee99bb79327f859f304f2f5d5939f07041`, preserving the earlier investigation workspace changes. This record covers the five approved workflow fixes; it is not a deployment, user study, physical methane validation or competition score.

## Results

| Check | Result |
|---|---|
| `bun run test:api` | 116 passed, 20 files |
| `bun run test:web` | 229 passed, 46 files |
| `bun run test:verifier` | 34 passed, 6 files |
| `bun run check` | API, web and E2E TypeScript passed |
| `bun run check:e2e` after capture-only adjustment | Passed |
| `bun run build:web` | Passed |
| `bun run check:web-bundle` | App **73,147 gzip bytes / 75,000 budget**; eight required route chunks; separate MapPanel 1,122,953 raw bytes |
| Main Chromium workflow file | **13 passed in one run** |
| Private human / mock-AI workflow file | **3 passed in one run** |
| Case continuity capture repeat | 1 passed, after normalizing focus and scroll before capture |
| Runner environment regression | 3 passed in each browser invocation |
| Read-only independent review | Reported concrete draft/context risks; fixes reviewed, no remaining blocker identified in this scope |
| `git diff --check` | Passed |

Reproduce browser checks from the repository root:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts
```

The runner starts isolated local API/Vite services and a local deterministic mock provider for the second file. Tests block non-local HTTP requests and use disposable stores and ephemeral reviewer credentials. Chromium required permission to open local sockets in this environment. No external provider, operator message, IMEO feedback submission or chain transaction was used.

## Evidence for each fix

| Fix | Reproducible coverage |
|---|---|
| Unsaved drafts | Session allowlists and incomplete metadata tests; navigation cancellation, recovery after navigation/refresh/scope return, case-filter cancellation, and credentials/inspection exclusion in Chromium |
| Manual route and guidance | Human-result guidance tests; browser asserts **Human assessment → Next: Review** and saved human method wording; existing optional AI/reviewer boundaries remain covered |
| Scoped coverage | Shared API/web eligibility selector; period/event/recipient/follow-up exclusions; browser shows 1 matching detection and 2 excluded historical references for the selected example period |
| Saved request → follow-up | Pure tests preserve existing request/status and audit lineage, reject overflow and wrong source/mode/snapshot; browser transfers a saved request, keeps `deferred`, then explicitly saves |
| Multiple investigations | v1 read-through without deletion, independent v2 revisions and context isolation; browser creates two periods, switches/resumes each, refreshes active selection, retains older selection in Cases and matches work-status filters across both |

## Review and iterations

- Initial focused tests reproduced the source-wide coverage, human-method wording, single-item overwrite and absent migration behavior. Additional tests reproduced a wrong-snapshot follow-up before its guard was added.
- Review led to claim/scope isolation for unsaved drafts, a saved-context save gate, snapshot-bound follow-up, active work propagation into Cases, matched-context selection restoration, disabled fields during a pending human save, and recoverable cleared reference fields.
- Two browser assertions initially used ambiguous accessible names after draft status was added. Explicit saved-result and Review-panel selectors resolved them; the underlying route and save completed.
- The first bundle check reported 78,205 App gzip bytes. Loading Evidence Auditor on demand reduced it below the unchanged 75,000-byte budget.
- One background build was terminated with exit 143. A fresh serial TTY build and bundle check passed. No application defect was inferred from that termination.
- Desktop scope/human and mobile case captures were visually inspected. Full-page captures normalize focus and scroll; mobile assertions check document width at 390 px.

## Captures

- [Scoped coverage, desktop](scoped-coverage-desktop.png)
- [Separate investigations and queue, mobile](multiple-investigations-mobile.png)
- [Saved human request and explicit follow-up, desktop](human-follow-up-desktop.png)
- [Saved human request and explicit follow-up, mobile](human-follow-up-mobile.png)

Human references and reasoning shown in these captures are **DEMO test metadata**, including the fictitious `example.org` receipt and test operator. The source observations are historical MARS data. These fixtures do not establish that this operator received a real notice or that any equipment was repaired. Reviewer token fields were cleared before capture.

## Limits

- Case work lives in localStorage; recovery and selected context live in sessionStorage for the tab. They are not encrypted, shared, remotely backed up or guaranteed after closing a tab. Browser storage denial/full conditions are reported. A prior recovery copy can remain when the newest write fails.
- Tokens and inspection confirmation are excluded from draft schemas. Reference URL userinfo is refused; users must keep credentials and signed-access URLs out of metadata and free-text fields. Locking private history clears human recovery copies.
- Per-item revision checks reject sequential stale-tab saves, not simultaneous transactional writes. Original v1 records remain as read-through migration inputs.
- Tests check metadata eligibility, application behavior and integrity boundaries. They do not authenticate report contents, measure physical emissions, validate model quality or demonstrate benefit to target users. Python/data and Foundry suites were not rerun because this increment does not change their implementation.
- The existing MapPanel size advisory remains; no physical phone performance or remote deployment is claimed.

`implementation-files.sha256` binds the listed implementation, tests and docs for this increment. `manifest.json` records results and capture dimensions; `SHA256SUMS` binds the evidence artifacts. Earlier evidence directories are retained unchanged.
