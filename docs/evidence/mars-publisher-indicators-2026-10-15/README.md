# MARS publisher indicators — local verification evidence

**Date:** 15 October 2026
**Source baseline:** `3648038` plus the uncommitted changes in this working tree
**Scope:** Local MARS data import, browser workflow, report integrity and mobile layout. No cloud service or external AI provider was used.

## Reproduction and results

From the repository root:

```bash
bun install --frozen-lockfile
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts
```

All three commands passed on the recorded run. The frozen install checked 142 installs with no changes. `check:all` passed API (104 tests), web (193 tests), verifier (34 tests), Python (160 tests), rules-baseline evaluation, Solidity/Foundry (4 tests), type checks, production build, and the bundle-budget check. The Chromium workflow passed 6/6 scenarios; its E2E runner environment tests passed 3/3.

The browser suite runs a local API and Vite server, blocks non-local HTTP requests, and uses Chromium 153.0.8010.52. The focused MARS Indicators scenario was rerun after tightening the period-specific Algeria assertions and passed. It confirms:

- The selected month and country reporting period come from the bundled historical publisher files.
- The latest Top 50 source ID navigates to the same exact ID in Map Explorer; no coordinate-based join is used.
- Algeria's 2025-07-01–2026-06-30 row is 2 feedback sources / 135 notified sources, while 2025-08-01–2026-07-31 is 1 / 166. Both values and dates are retained from the source archive.
- The country table can be horizontally scrolled and keyboard-focused on mobile, a visible scroll hint appears, and the page has no horizontal overflow at a 390 px viewport.
- Existing audit export and digest verification reject a changed report; the map remains usable when remote tiles are blocked.

One intermediate full browser run timed out while the existing audit workflow remained on the lazy-loading screen. The same test passed alone and in subsequent complete runs. The error context contained no application exception; this transient runner event is recorded for accuracy.

## Browser captures

These are full-page screenshots from the local Chromium browser, not mockups. The response table was set to 50 rows to exercise the maximum page size; the original publisher data remains paginated in the application.

| Capture | Viewport / image size | SHA-256 |
|---|---:|---|
| [Desktop country history](country-history-desktop.png) | 1280 px viewport; 1280 × 2888 image | `918b11037e0eff34cc5bce27273b41e47f74a6c8285427591163ef50032aef25` |
| [Mobile country history](country-history-mobile.png) | 390 × 844 viewport; 390 × 3728 image | `2de503e3f046a0abc51853058fd45be036c8c1da2dc0c7a84e5e36a5d75671c0` |

## Limits

These checks establish local software behavior against the pinned historical snapshot. They do not establish live MARS availability, AI model accuracy, external user task success, persistent hosted storage, a public blockchain transaction, physical-device rendering performance, or physical methane mitigation. The production build emits a large-MapPanel chunk advisory; the separate repository bundle budget passes.
