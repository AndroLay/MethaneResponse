# Dashboard implementation

**Updated:** 2026-10-12 · See the root [README](../README.md) for current run commands.

## Routes and data states

- `/` is the product landing page; `/dashboard` is the review workspace.
- The dashboard defaults to the pinned three-source UNEP MARS casebook returned by the API. It shows source ID, country/sector, linked observation counts/dates, source-level notified and feedback values, the archive retrieval/license/hash provenance, and rights-labeled official report links.
- **Synthetic demo** is a separate mode with two fictitious sources and clearly marked fixtures. It is useful for testing positive and contradiction rule paths.
- **Import full MARS GeoJSON** loads a user-provided historical map snapshot in the browser. The file is not uploaded. It is not promoted to a reviewed API case, so the audit action remains disabled for sources outside the pinned casebook.
- The dashboard never presents imported or pinned snapshot data as live monitoring. Missing later plume records are not presented as proof of zero methane.

## Review journey

The reviewer can select a source, filter by region/sector/observation age, inspect plume dates and flux/uncertainty values, open official external links, select one of three claim categories, run the deterministic API baseline, inspect citations/limitations, export JSON and verify the local bundle digest. Real mitigation requests abstain because linked report contents are not included or reviewed. There is no model/LLM call or fabricated report preview.

The blockchain panel only reports a receipt returned from an anchored API record. The public dashboard cannot submit chain transactions. A configured API verifier checks exact receipt metadata and the corresponding registry event; the UI text limits the result to hash integrity and version chronology.

## Map and visual states

`MapPanel.tsx` is code-split from the dashboard shell and renders a MapLibre map with OpenFreeMap dark/street styles or Esri satellite imagery. The source cluster/marker layer shows source locations, not methane concentration or plume geometry. Map attribution remains visible.

- Satellite grayscale uses a 0–100% saturation slider; it affects the raster imagery only and preserves teal/orange source-marker colors.
- Flat/globe switches Mercator and globe projection. It does not add elevation or terrain.
- The dashboard probes WebGL before initializing MapLibre. It skips the map on software-only renderers or when WebGL is unavailable; a failed lazy map chunk also stays inside an error boundary. In both cases the source, evidence, and auditor panels remain usable.
- The source illustration and synthetic trend/gallery assets are labeled as artwork or illustrative data. Basemap tile completeness depends on provider coverage and browser network access.

The source image rights are not documented in the supplied UI package; the images are excluded from the project-code license in [`NOTICE`](../NOTICE). Confirm permission or replace them before public redistribution.

## Local run

Install once with `bun install --frozen-lockfile`, copy `.env.example` to `apps/api/.env` only if that file does not already exist, then run `bun run dev:api` and `bun run dev:web` in separate terminals. The Vite dev server proxies `/api` to the API. Third-party basemap tiles require browser network access.

## Automated checks

- `bun run test:web` covers GeoJSON import grouping and validation plus map render helper behavior.
- `bun run test:api` covers real casebook routes, evidence mapping/abstention, API failures and audit persistence contracts.
- `bun run test:verifier` covers valid and modified exported bundles.
- `bun run check:all` is the complete local suite, including Python pipeline/evaluation, Foundry and production web build.

Local Chromium browser acceptance passed for the real casebook view, selecting another source, switching to the synthetic demo and back, detection audit and citation, mitigation `insufficient_evidence`, JSON export, regional filtering, visible fallback on an API 503, and a 390 px viewport with no horizontal overflow. A forced lazy-chunk failure also preserved the dashboard. The environment exposed SwiftShader rather than hardware-accelerated WebGL, so the map fallback was verified and the live raster/globe rendering could not be visually certified here. No hosted browser/deployment validation is claimed by this document.

To repeat the manual browser acceptance, start the API and web using the root README commands, open `http://localhost:5173/dashboard`, choose the Argentina source from Latest recorded observations, switch to Synthetic demo and back to UNEP cases, run `source_detected` then `mitigation_confirmed` in the auditor, export the JSON report, open Filters and select Kazakhstan, then narrow the browser to 390 px. Confirm the map fallback if the browser uses software WebGL; the case and auditor panels should remain interactive.
