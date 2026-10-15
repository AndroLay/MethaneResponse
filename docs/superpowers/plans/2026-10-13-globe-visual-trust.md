# Globe Visual Trust Implementation Plan

> **For agentic workers:** Execute inline in the active repository session. Steps use checkbox syntax for tracking.

**Goal:** Make the MapLibre globe more consistent at world scale, reduce harsh night shading, and make each map marker easier to interpret and trace to its MARS snapshot.

**Architecture:** Keep the existing MapLibre renderer. Esri World Imagery remains the base from zoom 0; NASA GIBS Blue Marble Next Generation is blended over it at 28% through zoom 2 and fades out by zoom 4. Keep methane observations, heuristic rankings, and source records as distinct layers with tested visual categories and safe, text-only source details. Default to source locations for a readable global view; retain the flux overlay as an explicit layer.

**Tech Stack:** React 19, TypeScript, MapLibre GL JS 5, Bun tests, NASA GIBS raster tiles, existing UNEP MARS snapshot and provenance.

**Spec:** User-approved globe proposal in the 2026-10-13 conversation; existing limits in `AGENTS.md` and `docs/architecture/earth-rendering.md`.

## Global Constraints

- Keep the MapLibre renderer and existing close-zoom Esri imagery.
- Treat NASA Blue Marble as a dated visual basemap, never as live methane or current land-cover evidence.
- Keep night shading opt-in and label it as an approximate UTC visualization.
- Keep source records, satellite plume observations, and heuristic investigation priority visually and semantically distinct.
- Show missing flux as unknown; never infer zero emissions, active leakage, or successful repair from marker color.
- Preserve existing user changes in the dirty repository.

---

### Task 1: Test map marker categories

**Files:**
- Create: `apps/web/src/map-marker-style.ts`
- Create: `apps/web/src/map-marker-style.test.ts`
- Create: `apps/web/src/map-marker-details.ts`
- Create: `apps/web/src/map-marker-details.test.ts`
- Modify: `apps/web/src/MapPanel.tsx`

**Interfaces:**
- `getReportedFluxBand(fluxKgHr: number | null | undefined)` returns one of `unknown`, `under-100`, `100-499`, `500-1999`, `2000-4999`, or `5000-plus`.
- `getReportedFluxColor(fluxKgHr: number | null | undefined)` maps those bins to the existing flux palette and keeps unknown neutral gray.

- [x] Test band boundaries, invalid/missing values, and exact palette colors; test source and observation summaries for missing values and pinned-snapshot provenance.
- [x] Run the focused Bun test and confirm it fails before implementation.
- [x] Implement the helpers and use them to keep source-marker color aligned with the historical flux legend.
- [x] Render source records with a visible outline, plume observations with compact blue markers, and priority rows with the existing low/medium/high heuristic palette.
- [x] Run focused tests and web typecheck.

### Task 2: Test Earth overview and lighting behavior

**Files:**
- Modify: `apps/web/src/earth-rendering.ts`
- Modify: `apps/web/src/earth-rendering.test.ts`
- Modify: `apps/web/src/MapPanel.tsx`

**Interfaces:**
- `getSatelliteImageryOpacity(zoom)` returns complementary overview/detail opacity values through the configured zoom transition.
- `DEFAULT_NIGHT_SHADING` is `false`; `getNightSideOpacity(tier)` returns a lower opt-in opacity for every tier.
- The static NASA GIBS EPSG:3857 Blue Marble Next Generation tile source uses published max zoom 8; its visual layer fades out and stops rendering at zoom 4. Esri remains available from zoom 0 and supplies full close detail.

- [x] Test the zoom endpoints, midpoint blend, source/layer max zoom, and default/opt-in night settings.
- [x] Run the focused Earth-rendering tests and confirm the new assertions fail.
- [x] Add NASA GIBS true-color overview tiles and blend over Esri from zoom 0, fading NASA out by zoom 4.
- [x] Apply Natural/Grayscale styling consistently to both imagery layers and preserve the existing imagery fallback behavior.
- [x] Turn night shading off by default and soften it when explicitly enabled.
- [x] Run Earth-rendering tests and web typecheck.

### Task 3: Add inspectable source provenance and documentation

**Files:**
- Modify: `apps/web/src/MapPanel.tsx`
- Modify: `docs/architecture/earth-rendering.md`

**Interfaces:**
- Clicking a source marker continues to select its existing case and opens a text-only MapLibre popup containing the original MARS source ID, coordinates, historical maximum reported flux, record count, last observed date, snapshot identifier and hash when present, plus the official UNEP dataset link.
- Popup copy explicitly states that the value is historical and does not establish current leakage or mitigation.

- [x] Confirm the summary tests fail before implementation.
- [x] Render source details with DOM `textContent` (no untrusted HTML interpolation) and preserve source selection callbacks.
- [x] Document NASA Blue Marble attribution/age limits, zoom transition, marker meanings, and the lack of live-feed or mitigation claims.
- [x] Run focused tests, full web tests, project checks, and build. `bun run check`, web tests (90 pass), API tests (80 pass/9 PostgreSQL skips), verifier tests (3 pass), and web build passed.
- [x] Use Playwright to inspect the overview, selected source, close-zoom imagery, and mobile viewport; capture screenshots and check console/failed tile requests. Forced NASA tile abort showed the Esri fallback; the mobile viewport had no horizontal overflow.
