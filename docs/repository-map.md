# Repository map

[Documentation index](README.md) · [Architecture](architecture/overview.md) · [Local setup](development/local-setup.md)

Bun manages the TypeScript workspaces in `apps/*` and `packages/*`. The Python pipeline and Solidity contracts have their own toolchains. The tables below suggest where to start exploring; they are not exhaustive file lists.

For usefulness/AI evaluation, start with the [P5/P6 package](evidence/p5-p6-agent-evaluation-2026-10-18/README.md): `services/data-pipeline/pilot_study.py` processes paired tasks privately; `evaluate_evidence_ai.py` scores predictions against input hashes and separates thresholds, usefulness, and activation; `scripts/freeze-ai-assessment-inputs.ts` and `scripts/run-ai-benchmark.ts` handle frozen inputs and the authorized runner. Agent results are distinguished from human studies and provider runs.

## Main structure

```text
MethaneResponse/
├── apps/
│   ├── web/                 React + Vite; interface and public assets
│   └── api/                 Bun + Hono; validation and audit storage
├── packages/shared/         Zod schemas, types, evidence rules, DEMO fixtures
├── services/data-pipeline/  Python import, transformation, analysis, evaluation
├── data/
│   ├── real/                MARS archives/provenance and real casebook
│   ├── fixtures/            Synthetic data for demos/tests
│   ├── processed/           Analysis; some fixed-version artifacts are tracked in Git
│   ├── raw/                 Local input workspace
│   └── state/               Local runtime audit files; ignored by Git
├── contracts/               Solidity EvidenceRegistry and Foundry tests
├── scripts/                 Verifiers, runners, and preparation/evaluation tools
├── e2e/                     Playwright browser scenarios
├── docs/                    Current guides, research, plans, and evidence
└── .github/workflows/       Pemeriksaan CI
```

Runtime directories such as `data/state/` may appear when the application runs. Dependencies and build outputs (`node_modules`, `.venv`, `dist`, Foundry output) are not implementation sources.

## Web: from route to feature

| File/module | Role |
|---|---|
| [main.tsx](../apps/web/src/main.tsx) · [App.tsx](../apps/web/src/App.tsx) | Bootstrap, dashboard shell, routing, active source, and API connection |
| [LandingPage.tsx](../apps/web/src/LandingPage.tsx) | Product introduction and workspace links |
| [MapPanel.tsx](../apps/web/src/MapPanel.tsx) | MapLibre, sources/plumes, layers, camera, and fallback |
| [progressive-mars-loader.ts](../apps/web/src/progressive-mars-loader.ts) · [mars-snapshot-loader.ts](../apps/web/src/mars-snapshot-loader.ts) | Progressive snapshot loading and integrity checks |
| [CasesWorkspace.tsx](../apps/web/src/CasesWorkspace.tsx) · [CaseDetailsDialog.tsx](../apps/web/src/CaseDetailsDialog.tsx) | Source table, work queue, and details |
| [EvidenceAuditorWorkflow.tsx](../apps/web/src/EvidenceAuditorWorkflow.tsx) | Overview → Observations → Assessment → Review → Report |
| [AssessmentScopeEditor.tsx](../apps/web/src/AssessmentScopeEditor.tsx) · [EvidenceCoveragePanel.tsx](../apps/web/src/EvidenceCoveragePanel.tsx) | Period/event scope and evidence-eligibility preview |
| [HumanAssessmentPanel.tsx](../apps/web/src/HumanAssessmentPanel.tsx) · [AssessmentTrustPanel.tsx](../apps/web/src/AssessmentTrustPanel.tsx) | Manual assessment, references, reviewer, and consent |
| [CaseWorkPanel.tsx](../apps/web/src/CaseWorkPanel.tsx) · [case-work.ts](../apps/web/src/case-work.ts) · [session-draft.ts](../apps/web/src/session-draft.ts) | Browser investigation and per-tab drafts |
| [SharedCaseWorkPanel.tsx](../apps/web/src/SharedCaseWorkPanel.tsx) · [shared-work-api.ts](../apps/web/src/shared-work-api.ts) · [team-session.ts](../apps/web/src/team-session.ts) | Team editor/queue/history, CAS client, in-memory token, and reconnect |
| [AuditHistoryPanel.tsx](../apps/web/src/AuditHistoryPanel.tsx) · [AuditRevisionComparison.tsx](../apps/web/src/AuditRevisionComparison.tsx) | Revision history and comparison |
| [report-export.ts](../apps/web/src/report-export.ts) · [investigation-brief.ts](../apps/web/src/investigation-brief.ts) | JSON and Markdown export |
| [ImportedAuditVerifier.tsx](../apps/web/src/ImportedAuditVerifier.tsx) · [TransparencyPanel.tsx](../apps/web/src/TransparencyPanel.tsx) | Import verification and public summary |
| [MarsPublisherInsights.tsx](../apps/web/src/MarsPublisherInsights.tsx) | Top 50 and country responses from publisher releases |

See the [UI notes](development/ui-implementation.md) for routes and the [map architecture](architecture/real-map.md) for data/layer loading.

## API and shared contracts

| File/module | Role |
|---|---|
| [index.ts](../apps/api/src/index.ts) | Bun entry point, host/port, and file store |
| [app.ts](../apps/api/src/app.ts) | Routes, validation, authorization, and orchestration |
| [audit.ts](../apps/api/src/audit.ts) · [scoped-source.ts](../apps/api/src/scoped-source.ts) | Rules baseline and source/scope/snapshot resolution |
| [human-assessment.ts](../apps/api/src/human-assessment.ts) | Human-assessment bundle and revision lineage |
| [ai-review.ts](../apps/api/src/ai-review.ts) | Optional model and citation checks |
| [reviewer-auth.ts](../apps/api/src/reviewer-auth.ts) · [reviewer-directory.ts](../apps/api/src/reviewer-directory.ts) | Scoped tokens and operator-directory attestation |
| [evidence-check.ts](../apps/api/src/evidence-check.ts) | Restricted HTTPS retrieval and content digest |
| [store.ts](../apps/api/src/store.ts) | File/in-memory store, revision ordering, and version 2 envelope for audits/durable intents/publication events with a single writer |
| [publication.ts](../apps/api/src/publication.ts) | Consent migration, event validation, withdrawal CAS, and public status projection without private actors |
| [case-work.ts](../apps/api/src/case-work.ts) · [case-work-file.ts](../apps/api/src/case-work-file.ts) | Separate team state, CAS/history, private atomic files, and initialization marker |
| [canonical.ts](../apps/api/src/canonical.ts) · [integrity.ts](../apps/api/src/integrity.ts) · [audit-visibility.ts](../apps/api/src/audit-visibility.ts) | Canonical JSON, hashing, and access |
| [casebook.ts](../apps/api/src/casebook.ts) · [intelligence-data.ts](../apps/api/src/intelligence-data.ts) | Reading and validating pinned artifacts |
| [anchor-intent.ts](../apps/api/src/anchor-intent.ts) | Operation identity, target, pending/confirmed/reverted state, and receipt matching |
| [chain.ts](../apps/api/src/chain.ts) | Local preparation/signing, single broadcast, canonical intent/receipt checks, and viem |
| [shared/index.ts](../packages/shared/src/index.ts) | Domain schemas, inputs, scope, and evidence-coverage selectors |
| [shared/trust.ts](../packages/shared/src/trust.ts) · [shared/transparency.ts](../packages/shared/src/transparency.ts) | Assurance and public-summary allowlist |

The HTTP contract is documented in the [API reference](architecture/api-reference.md). TypeScript tests are generally colocated with modules as `*.test.ts`/`*.test.tsx`.

## Pipeline, data, and contracts

| Location | Use |
|---|---|
| [ingest_mars.py](../services/data-pipeline/ingest_mars.py) · [build_web_snapshot.py](../services/data-pipeline/build_web_snapshot.py) | Build MARS artifacts; follow [provenance](../data/real/README.md) |
| [build_intelligence.py](../services/data-pipeline/build_intelligence.py) | Source summaries, priorities, and snapshot analysis |
| [record_recurrence.py](../services/data-pipeline/record_recurrence.py) · [prospective_recurrence.py](../services/data-pipeline/prospective_recurrence.py) | Recurrence-record model, ledger, and fixed-horizon evaluation |
| [build_publisher_indicators.py](../services/data-pipeline/build_publisher_indicators.py) | Top 50 and country responses; [rebuild instructions](../data/real/mars_publisher_archives/README.md) |
| [build_plume_geometries.py](../services/data-pipeline/build_plume_geometries.py) | Monthly geometry shards bound to a snapshot |
| [evaluate_baseline.py](../services/data-pipeline/evaluate_baseline.py) · [evaluate_evidence_ai.py](../services/data-pipeline/evaluate_evidence_ai.py) | Rules conformance and labeled AI-output evaluation |
| [apps/web/public/data](../apps/web/public/data/) | Static snapshots, manifests, shards, indicators, and geometry for the browser |
| [data/processed](../data/processed/) | Versioned API, model, and prospective-ledger artifacts |
| [EvidenceRegistry.sol](../contracts/src/EvidenceRegistry.sol) | Append-only hash commitments, separate from local audits |

Fixed-version derived artifacts are not edited to replace analysis results. Use the corresponding builder and provenance. Prospective ledgers use new versioned paths and are not overwritten. DEMO fixtures remain separate from real data. See [data flow](architecture/data-flow.md) for transformation details.

## Configuration and tools

[package.json](../package.json) and [bun.lock](../bun.lock) configure the Bun workspace. [.bun-version](../.bun-version) pins Bun; [pyproject.toml](../services/data-pipeline/pyproject.toml)/[uv.lock](../services/data-pipeline/uv.lock) configure Python; [foundry.toml](../contracts/foundry.toml) configures Solidity.

[.env.example](../.env.example) documents API configuration; [apps/web/.env.example](../apps/web/.env.example) contains only web settings that may be public. [playwright.config.ts](../playwright.config.ts), the [E2E runner](../scripts/run-e2e.sh), and [check-local.sh](../scripts/check-local.sh) coordinate checks. [start-api.ts](../scripts/start-api.ts) / [api-writer-lock.ts](../scripts/api-writer-lock.ts) enforce the writer lock; [case-work-maintenance.ts](../scripts/case-work-maintenance.ts) provides offline backup/restore. [render.yaml](../render.yaml) is a preview option; its presence does not mean the service is deployed.

P2: [AnchorControls.tsx](../apps/web/src/AnchorControls.tsx) and [chain-client.ts](../apps/web/src/chain-client.ts) manage target/status/reconciliation in Verification Center. [chain-integration.test.ts](../scripts/chain-integration.test.ts) runs against a disposable local network; the [runbook](development/blockchain-recovery.md) explains public authorization and recovery.
