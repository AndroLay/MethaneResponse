# Premium UI redesign

**Date:** 2026-10-13

**Reference:** `MethaneResponse_Premium_UI_UX_Redesign_2026-10-13.zip`

## Applied

- Added an additive premium visual layer for the existing dashboard and public landing page; existing routes and data workflows remain in place.
- Reworked Cases into a paginated source directory and selected-source investigation panel. Search, region/sector filters, 25/50/100 row sizes, and previous/next navigation are retained.
- Kept location text tied to the source's recorded country/region and coordinates. The coordinate action opens Map Explorer for that source; it does not infer a city or address.
- Added direct entry to the full-case dialog's Summary, Observations, Evidence, and Timeline tabs. The same source-specific observation chart is used in the inspector and dialog.
- Kept the Evidence Auditor and its source picker, existing Operators and Settings workspaces, and collapsible navigation. Case selection from Cases preserves the current Cases filters.
- Added skip links for keyboard navigation.

The supplied page mockups informed layout only; their values, claims, and map data were not copied into product workflows. The original PNGs remain in the local working tree but are excluded from the public release because their source and redistribution rights are undocumented. Actual application behavior is evidenced separately in [`UI workflow captures`](evidence/ui-workflows-2026-10-14/README.md).

## Local verification

- `bun run check` — passed (API and web TypeScript checks).
- `bun run test:web` — passed (106 tests, 0 failures).
- `bun run build:web` — passed. Vite reported the existing MapPanel chunk at about 1.12 MB and removable third-party Zod annotation warnings; no build error occurred.
- Local Chromium desktop view (1280×720) showed the 4,211-source directory, 25-row first page, location links, and selected-source details.
- Local Chromium mobile view (390×844) used the compact directory layout. After opening a full case, the document width was 390 px, matching the viewport; the Summary dialog opened for the selected source.
- A deep-linked selected case was placed on its matching table page (page 79 of 169 for `KAZ_S_159` at 25 rows/page). Its location action routed to Map Explorer with the same source ID and rendered a MapLibre canvas.
- The Cases inspector opened the full dialog directly on its Evidence tab. “Review evidence” then opened the Evidence Auditor with that source selected and all 4,211 source options present.

These checks used the local bundled historical data and did not submit an audit or call external AI/blockchain services. They do not verify live UNEP services, third-party map tile availability, a physical phone, map camera state on a physical device, or the Observations and Timeline dialog tabs. No map or climate claim was derived from the UI mockups.
