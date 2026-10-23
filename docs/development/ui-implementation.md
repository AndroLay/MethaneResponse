# UI and workspace implementation

[Development](README.md) · [Repository map](../repository-map.md) · [User workflow](../product/user-workflow.md)

**Active guide — 17 October 2026.** This page describes UI implementation locations and relationships. Detailed usage instructions are in the product guide.

## Bootstrap, routes, and loading

[main.tsx](../../apps/web/src/main.tsx) starts the application. [App.tsx](../../apps/web/src/App.tsx) coordinates the dashboard shell, selected source/mode/snapshot, routes, and API. The landing page is at `/`; the dashboard is at `/dashboard` and workspace subroutes.

| Route | Component/responsibility |
|---|---|
| `/` | `LandingPage`: introduction and benefit links to workspaces |
| `/dashboard` / `/dashboard/map` | `MapPanel`: MapLibre explorer, layers, selected source, and dialog |
| `/dashboard/indicators` | `MarsPublisherInsights`: publisher Top 50 and country response |
| `/dashboard/cases` | `CasesWorkspace`: table, queue/status, and saved investigations |
| `/dashboard/audit` | `EvidenceAuditorWorkflow`: scope → observations → assessment → review/report |
| `/dashboard/documents` | Reference library bound to a source; link-only metadata is distinguished |
| `/dashboard/reports` | Exports, brief, and `TransparencyPanel` |
| `/dashboard/blockchain` | Verification Center and `ImportedAuditVerifier`; no public chain writes |
| `/dashboard/operators` | `OperatorsWorkspace`: review of administrative metadata |
| `/dashboard/settings` | `SettingsWorkspace`: browser preferences |

Heavy workspaces and overlays use lazy chunks and loading fallbacks. MapPanel is separate from the entry chunk; Evidence Auditor is also loaded on demand. The active budget details are defined by [check-web-bundle.ts](../../scripts/check-web-bundle.ts). Measured sizes belong to dated evidence, not a permanent figure in this guide.

## State and ownership

| State | Owner/location | Rules |
|---|---|---|
| Active source, mode, snapshot, and route | App shell/context | Context changes must preserve guards and prevent stale responses from being applied to a new investigation |
| Claim and scope | Auditor + shared schema | Event/period/recipient restrict coverage and identity history |
| Reference coverage | `EvidenceCoveragePanel` + shared selector | Same rules as the API; preview does not automatically save an audit |
| Human editor/trust | `HumanAssessmentPanel`, `AssessmentTrustPanel` | Token in memory; inspection/retrieval/public consent are not restored |
| Mutable investigation | `CaseWorkPanel`, `case-work.ts` | LocalStorage; work ID and revision are separate from the server audit |
| Shared investigation | Lazy `SharedCaseWorkPanel`, `shared-work-api.ts`, `team-session.ts` | Token in memory; pinned server queue, CAS/history, assignee/due date, explicit import, conflicts do not discard draft |
| Edit recovery | `session-draft.ts`, per-tab hook | Context-bound, may be incomplete, no token/sensitive consent |
| Saved audit/history | API + `AuditHistoryPanel` | Immutable server revisions; locking clears private cache/selection/draft |
| Report/verifier | Export helpers, imported verifier, transparency | Private JSON, Markdown brief, and public summary have different permissions/hashed objects |

History comparison only compares revisions matching source/claim/mode and shows changes in scope/dataset. Browser notes/status are not part of the immutable bundle and do not alter the determination. An investigation waits for the requested dataset; a fallback DEMO record cannot be edited as if it were a historical source.

A team session retains its identity during SPA navigation and is cleared on reload/disconnect. Cases loads the server queue while connected. When refresh begins or fails, old queue/history data is hidden and saving is disabled; the draft editor remains mounted. There is no real-time polling or automatic merge. Operational details are in the [runbook](shared-casework.md).

## Map, imagery, and responsiveness

Location-context imagery uses shared remote tiles; no per-case asset is stored. Plume geometry is pinned to an ID/source/date/snapshot. They have separate meaning labels. See the [map](../architecture/real-map.md) and [geometry](../architecture/mars-publisher-geometry.md) guides.

The desktop sidebar can be collapsed; on phones it uses a temporary drawer. Cases and publisher tables have pagination/scroll regions; the mobile viewport must retain the page width. Basemap, Earth quality, initial workspace, and sidebar preferences are stored in the browser, not on the server. Provider/reviewer/RPC credentials are not part of Settings.

## Checks

Use `bun run check`, the relevant web/API suites, build/bundle, and [E2E](../testing/end-to-end.md) as appropriate for the change. [Evidence](../evidence/README.md) records dates, desktop/mobile screenshots, failures, and limits. Mock AI does not measure an external model; a mobile viewport does not measure a physical device.
