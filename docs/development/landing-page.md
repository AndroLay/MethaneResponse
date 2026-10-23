# MethaneResponse — Landing page implementation

> **Implementation note from 13 October 2026.** Results and figures in this document remain tied to their source revision. For the latest workflow and capabilities, see [workflow](../product/user-workflow.md) and [active status](../release/current-implementation-status.md).

**Date:** 13 October 2026
**Status:** Integrated with the interactive dashboard and pinned historical MARS casebook.

## Scope

- Public research landing page that uses actual historical casebook values rather than illustrative Earth artwork.
- Dedicated `LandingPage.tsx` and `.lp-*`-namespaced CSS; the dashboard lives at `/dashboard`.
- The dashboard starts with the bundled, versioned historical MARS snapshot when available; synthetic fixtures are an explicit separate mode.
- A browser-side MARS GeoJSON import can load a user-provided historical snapshot without uploading the file. Server audits still require a source in the pinned server snapshot or curated casebook.
- Intro, six benefit links into workspace routes, a historical MARS observation plot, a linked publisher-record panel, step-by-step approach, source-linked case review, FAQ, and calls to action.
- Responsive desktop/tablet/mobile layouts; semantic headings and buttons, visible keyboard focus and reduced-motion preferences.
- Navigation: `/` (landing) → `/dashboard` (application), with browser history handling. The dashboard's brand logo goes back to the landing page.

## Sections

1. **Hero** — tagline 'From Methane Observations to Verifiable Action', with three discrete historical estimates for `KAZ_S_159`, ordered by UTC date. Horizontal spacing is categorical rather than time-scaled; exact dates appear in the value list and vertical whiskers show reported standard deviation. The chart is not a satellite image, continuous series, live feed, forecast, or mitigation confirmation.
2. **Evidence chain** — observations → claims → evaluation → verifiable receipt.
3. **Platform** — six direct paths for historical exploration, investigation triage, evidence review, integrity checks, research reports, and follow-up transparency.
4. **Workspace** — product explanation and linked UNEP publisher metadata, explicitly scoped as metadata review rather than an independent re-audit.
5. **How it works** — observe, connect, evaluate, verify.
6. **Methodology** — a real historical `KAZ_S_159` case review with three linked MARS observation rows, reported flux uncertainty, and an official UNEP MARS report link.
7. **About / FAQ** — limitations, disclaimer and official UNEP MARS information link.
8. **Final CTA / Footer** — enter the actual application demo.

## Files

- `apps/web/src/LandingPage.tsx` — landing React component.
- `apps/web/src/landing.css` — isolated landing CSS.
- `apps/web/src/main.tsx` — lightweight path router and app selection.
- `apps/web/src/App.tsx` — dashboard, MARS snapshot import and explicit real-data audit limits.
- `apps/web/src/MapPanel.tsx` — MapLibre layers, clustered source markers, basemaps and map controls.
- `apps/web/src/mars.ts` — MARS GeoJSON and normalized snapshot parser.
- `services/data-pipeline/import_mars_map.py` — standard-library importer for official CSV, GeoJSON and ZIP files.
- `apps/web/src/LandingObservationVisual.tsx` and `apps/web/src/landing-observation-visual.ts` — accessible, date-positioned visualization from the pinned casebook values.
- `apps/web/src/landing-evidence-visual.css` — responsive landing chart and source-reference styling.
- `apps/web/src/asset-rights.css` — project-owned gradients replacing unresolved background art.
- `apps/web/build/withheld-public-assets.ts` and `scripts/prune-uncleared-ui-assets.ts` — withhold unresolved user-supplied imagery in Vite development and production builds.
- `apps/web/src/landing-evidence.ts` — derives the landing review from the active `data/real/mars_casebook_2026-10-13.json` casebook; its snapshot ID and archive SHA-256 are displayed alongside the linked record metadata.
- `apps/web/src/landing-evidence.test.ts` — checks case identity, report provenance/license, linked observation IDs/uncertainty, and abstention boundaries.
- `apps/web/public/_redirects` — SPA route fallback for Cloudflare Pages static deployment.
- `ui-preview/` — package-free static dashboard preview.

## Run

From the repository root:

```sh
bun install
bun run dev:api    # optional for opening landing page; needed for demo audit operations
bun run dev:web
```

- Landing: `http://localhost:5173/`
- Dashboard: `http://localhost:5173/dashboard`

## Integrity of claims

The page and dashboard avoid claims of UNEP endorsement or physical mitigation certification. The landing chart is derived from dated historical MARS estimates and is not a live or continuous measurement. The bundled MARS snapshot remains subject to its recorded license. The baseline can cite a linked plume observation from a full-snapshot source, but metadata alone cannot support operator notification or mitigation. Optional document assessment and public testnet receipts depend on backend credentials and services.

The landing case review is anchored to three linked observations for `KAZ_S_159` in the active 2026-10-13 casebook archive (snapshot `unep-mars-ccd8267c55ee`, archive SHA-256 `ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2`). Its linked UNEP item, issued 2026-09-23, is published under Attribution-NonCommercial-NoDerivs 3.0 IGO; the application links to the official item and does not copy its PDF or report text. UNEP's item metadata page describes an IMEO-reported action at Uzen Field in July 2026 and marks the review status `internal review only` (metadata checked 2026-10-13). The landing card records that publisher statement; MethaneResponse has not independently re-audited the PDF or verified sustained emissions cessation. The latest linked observation for this curated case is 2026-07-11; no later row is not evidence of zero emissions.

The original ten WebP files with unresolved redistribution rights are withheld from the application and preserved in a local backup at `/tmp/methaneresponse-withheld-ui-assets-20261014/`. The production build removes those filenames and Vite development requests return 404. The files are not copied into an application source ZIP from the active tree. Previously tracked copies remain in Git history; this local change does not rewrite history or update the public remote.

## Verification

The current dependency, typecheck, production build, and local browser results are recorded in [`UI_IMPLEMENTATION.md`](ui-implementation.md). The landing page rendered at `/`, and its dashboard call to action navigated to `/dashboard` in the local browser.
