# MethaneResponse — Landing page implementation

**Date:** 12 October 2026  
**Status:** Integrated with the interactive dashboard and optional MARS snapshot workflow.

## Scope

- Public marketing/research landing page matching the approved cinematic dark Earth concept.
- Dedicated `LandingPage.tsx` and `.lp-*`-namespaced CSS; the dashboard lives at `/dashboard`.
- The dashboard uses a movable MapLibre basemap and still starts with labeled synthetic fixtures.
- An optional GeoJSON import and local ZIP/CSV/GeoJSON importer can load a user-obtained MARS snapshot; this is periodic historical data, not live monitoring.
- Intro, value propositions, a decorative product preview, step-by-step approach, interactive example audit outcomes, FAQ, and calls to action.
- Responsive desktop/tablet/mobile layouts; semantic headings and buttons, visible keyboard focus and reduced-motion preferences.
- Navigation: `/` (landing) → `/dashboard` (application), with browser history handling. The dashboard's brand logo goes back to the landing page.

## Sections

1. **Hero** — tagline 'From Methane Observations to Verifiable Action', a procedural Earth illustration, and CTA.
2. **Evidence chain** — observations → claims → evaluation → verifiable receipt.
3. **Platform** — source traceability, deterministic rules baseline, optional integrity receipts.
4. **Workspace** — product-preview map and explanation (synthetic art).
5. **How it works** — observe, connect, evaluate, verify.
6. **Methodology** — a working React switch between three *illustrative* audit states and their explanations.
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
- `apps/web/public/assets/landing-earth.webp` — decorative Earth asset with procedural geography and fictional illuminated points, not a methane dataset.
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

The page and dashboard avoid claims of UNEP endorsement or physical mitigation certification. Illustrations and default case fixtures are explicitly synthetic. The application does not bundle a full UNEP dataset; users obtain and import their own snapshot under its applicable license. The API audit remains restricted to synthetic fixtures.

## Verification

The current dependency, typecheck, production build, and local browser results are recorded in [`UI_IMPLEMENTATION.md`](UI_IMPLEMENTATION.md). The landing page rendered at `/`, and its dashboard call to action navigated to `/dashboard` in the local browser.
