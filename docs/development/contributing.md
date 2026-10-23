# Change and documentation maintenance guide

[Repository map](../repository-map.md) · [Architecture](../architecture/overview.md) · [Testing](../testing/README.md)

Read [AGENTS.md](../../AGENTS.md) before changing the repository. Preserve existing local changes, supported older contracts, DEMO labels, and data provenance and licensing.

## Choosing where to make a change

| Change | Starting point | Related reference |
|---|---|---|
| Workspace, interaction, navigation | `apps/web/src/App.tsx` and workspace components | [UI](ui-implementation.md), [workflow](../product/user-workflow.md) |
| Claim, scope, schema, or coverage | `packages/shared/src/index.ts`, API, and preview UI | [API](../architecture/api-reference.md), [data flow](../architecture/data-flow.md) |
| Human assessment/trust | API human-assessment, reviewer-directory, evidence-check; web panels | [Trust](../product/trust-and-transparency.md) |
| Shared casework/persistence | shared case-work schemas, API case-work modules, SharedCaseWorkPanel, and operations scripts | [Runbook](shared-casework.md), API, P1 ADR, and operations/E2E regressions |
| Report/export/public summary | report-export, investigation-brief, shared/transparency, and API visibility | [Publication limits](../product/trust-and-transparency.md#3-publish-a-minimal-redacted-summary) |
| Map and observation loading | MapPanel, progressive loader, shard/manifest builder | [Map](../architecture/real-map.md), [geometry](../architecture/mars-publisher-geometry.md) |
| Dataset/analysis | `services/data-pipeline`, data versioning, and API loader | [Provenance/rebuild](../../data/real/README.md), [recurrence](../product/prospective-recurrence.md) |
| Contract/receipt | Solidity registry, chain.ts, and verifier | [Architecture](../architecture/overview.md), [testing](../testing/README.md) |

Schema changes need to account for older bundles, browser drafts and notes, verifier export/import, and access permissions. Claim scope, snapshot, and work ID are distinct and must not be treated as interchangeable.

## Change workflow

1. Match the requirement to the active guide, source, and architecture decisions.
2. Make a focused change in its owning component; use a shared selector when the UI and API need the same rule.
3. New user-visible features require reproducible tests and documented capability limits, as required by AGENTS.md.
4. Run the smallest check that covers the change. Use the [testing matrix](../testing/README.md); expand it when a contract touches another subsystem.
5. Record only results that were actually run: command, revision/working tree, snapshot, and limitations. Do not describe mock AI as external model quality or viewport emulation as a physical-phone test.
6. Update the relevant reference page and index.

A new database, provider, or shared-storage change alters scope/architecture. Use the [applicable ADR](../architecture/decisions/2026-10-15-local-prototype-no-database.md) as the starting point for a decision.

## Documentation maintenance

- **One reference page per topic:** README for orientation, architecture for active design, product for user behavior, configuration for environment, and status for current capabilities/evidence.
- **Index required:** link new pages from the relevant README section; use relative links so they remain readable in a local clone.
- **Separate note types:** active guides may be updated; research/proposals are dated and labeled with status; plans link to results; evidence retains its original run record.
- **Keep evidence intact:** do not edit old screenshots, manifests, hashes, or run logs to make them match current files. Store new evidence in a new directory/version.
- **Avoid copied pipeline commands:** point to the provenance README that binds inputs, outputs, licenses, and hashes.
- **Avoid repeated status summaries:** older notes should link to [active status](../release/current-implementation-status.md) when assumptions have changed.
- **Language:** maintained guidance and user-facing prose must be in English. Preserve frozen source inputs and quotations verbatim, with English reading editions alongside them where needed.
- **Check documentation:** verify local link targets/headings, index navigation, module paths, command/environment names, code fences, and whitespace. Prose-only changes do not require rerunning the application build/tests unless they change an instruction whose execution must be demonstrated.

## Data and artifacts

Public data files are served to the browser and must not contain secrets, reviewer directories, or private reports. Browser notes are not a place to store credentials or third-party report content. Keep original datasets distinct from synthetic fixtures. Read [NOTICE](../../NOTICE) before copying assets or processing external documents.
