# MethaneResponse user workflow

MethaneResponse helps users examine methane claims against traceable records. It supports investigation and public accountability; it does not detect methane, direct a repair, or establish that the product has reduced emissions.

## Try the six benefits

Run the local web and API services from the repository root with `bun run dev:web` and `bun run dev:api`, then open <http://localhost:5173>. The landing page's six benefit links open the corresponding workspace directly.

| Benefit | Workspace | What can be checked |
|---|---|---|
| Explore sources globally | `/dashboard/map?sourceId=KAZ_S_159` | Historical source and plume locations, observation dates, reported flux and uncertainty, map layers, filters, and the loaded snapshot version. The archive is not a live feed. |
| Prioritize investigation | `/dashboard/audit?sourceId=KAZ_S_159` | Recurrence, anomaly screening, available data sufficiency, and a reasoned investigation-priority heuristic. It is not a calibrated probability or forecast. |
| Review a mitigation claim | `/dashboard/audit?sourceId=MEX_S_003` | Run the deterministic baseline for a non-curated source in the pinned full snapshot. Detection can cite one latest linked plume record; notification and mitigation claims remain insufficient without attributable evidence. Add an authorized document excerpt for optional AI assessment. |
| Check audit integrity | `/dashboard/blockchain?sourceId=KAZ_S_159` | Verify the saved bundle digest locally or verify a real Sepolia receipt when one exists and the API is configured. A digest/receipt proves record integrity and version metadata, not physical truth. |
| Prepare research material | `/dashboard/reports?sourceId=KAZ_S_159` | Review observations, provenance, linked references, audit state, and download the current audit as a SHA-256 protected JSON report. PDF generation is not available. |
| Inspect response and mitigation status | `/dashboard/cases?sourceId=KAZ_S_159` | Review detection, MARS notification metadata, feedback, and mitigation as separate fields. Unknown or missing follow-up is not treated as zero emissions or a successful repair. |

The example URLs use real historical MARS source identifiers. The source pages display the data release and coverage; observation dates do not imply continuous monitoring. MARS `notified` and `feedback` fields are preserved as publisher metadata, not interpreted as proof of receipt, repair, or reduced emissions.

## Cases table and map navigation

The Cases workspace reads active historical snapshot `unep-mars-675417694883` and presents its 4,218 source records in a searchable, filterable table. The snapshot contains 30,414 plume rows through 2026-09-13; 6,553 rows without a source ID remain unlinked. Choose 25, 50, or 100 rows per page; the range indicator and first/previous/next/last controls make long result sets navigable without rendering every row at once. Selecting a row opens a compact detail dialog with separate summary, observations, evidence, and timeline views. Earlier releases remain available in snapshot history.

Locations display the source's reported country and region alongside the stored latitude/longitude at its available precision. MARS does not provide a complete street address or a verified city for every source, so the interface does not infer one. Selecting a location opens Map Explorer for that source and focuses the map camera on the stored coordinates. This is a map focus, not a claim that the source footprint is more precise than the underlying dataset.

The snapshot is historical, not live. A source marker or plume record does not by itself establish an audited case, confirmed mitigation, or current emissions status. Check the snapshot provenance and observation timestamps before interpreting a location.

From Map Explorer, choose a source and press **View full case** to open its detail dialog immediately over the map. The dialog keeps the map context in place and provides summary, observations, evidence, and timeline tabs. **Open in Map Explorer** from Cases focuses the camera on the stored coordinates; it does not imply greater location precision than the source data.

## Operators and Settings

The **Operators** workspace is a review queue for MARS source-level `notified`, `feedback`, operator-feedback, and government-feedback fields. Search by source, region, sector, or field value; filter by metadata type; page through the results; then open the case or continue to Evidence Auditor. A value such as `No` is still a publisher-reported field value. The page does not send notifications, contact an operator, verify delivery, or establish that a repair occurred.

The **Settings** workspace controls browser-local preferences: starting workspace for dashboard links, Map Explorer basemap, Earth rendering quality, and whether the desktop sidebar starts as a compact icon rail. Changes apply immediately and persist in this browser only. Direct workspace links still open their requested page. AI credentials, reviewer access, RPC endpoints, and signing keys remain server-side and are not exposed as browser settings. There is no database configuration in this prototype.

The sidebar collapse control switches between a labeled navigation panel and a compact icon rail on wider screens. On phones, the menu opens a temporary drawer and backdrop; selecting a page or tapping outside closes it.

## Map overlays

The map keeps the source count and cursor coordinates in compact edge labels. Historical date/feed status, the active basemap description, and pan/zoom/click guidance sit below the map canvas. The legend and observation-history controls start collapsed and can be opened when needed; opening them does not change the underlying dataset or turn an empty period into zero emissions.

## Document assessment and human review

The Evidence Auditor accepts user-supplied, rights-cleared text excerpts or a locally prepared PDF/TXT manifest. The original file can remain local; the browser checks the manifest and document hash. A provider request requires a configured server-side AI provider, an access token, and the user's separate consent. The model remains disabled when the provider is not configured. When enabled, the API validates exact quotations and fails closed when citations do not support a strong claim.

AI output is a suggestion, not proof. A configured reviewer must inspect the source and make a separate decision before a report can be published. The current local file store disables blockchain anchoring and reconciliation. Without provider credentials, the deterministic baseline remains usable and the AI controls clearly report that assessment is unavailable.

## Reports and blockchain

The downloaded report can be checked in the Verification Center or with `bun run verify:audit <report.json>`. Audit-cited observation rows are separate from `historicalContext`, which lists periodic source records only as context and never as evidence for mitigation. Both are omitted when the loaded source does not match the audit's pinned snapshot. The browser checks the export checksum locally and the CLI checks the canonical audit bundle without a chain; the export checksum is unsigned and can be recomputed, so it is not an attestation. The current local file store does not support transactional blockchain anchoring or reconciliation; the Solidity registry and verifier remain separate components.

## Prototype status

- **Available locally:** historical MARS exploration, snapshot provenance/history, heuristic prioritization and anomaly screening, baseline claim audit, immutable local audit revisions, JSON export, and local digest verification.
- **Conditional on external configuration:** model-assisted document assessment and authenticated human review/publication. Audit persistence uses a local JSON file; hosted preview files may be ephemeral.
- **Not established:** independent AI benchmark quality, time saved for users, observed changes in investigation decisions, confirmed repairs from product use, or any methane emissions reduction attributable to MethaneResponse.

Use `bun run test:api` and `bun run test:web` to run the local API and browser-logic regression suites. Test results validate the prototype's software behavior; they do not substitute for provider, cloud, chain, or user validation.
