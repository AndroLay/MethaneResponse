# Live local UAT — MARS source to verified audit digest

- **Date:** 14 October 2026 (WITA)
- **Browser:** installed Chromium through the bundled Playwright CLI, 1280 × 800 viewport
- **Application:** local Vite + Hono; both bound to loopback
- **Dataset:** `unep-mars-675417694883`, 4,218 sources and 30,414 plume rows through 2026-09-13 UTC
- **Purpose:** record one real-source browser workflow against the current working tree. These screenshots are browser captures, not generated illustrations.

## Runtime isolation

- The API used an isolated JSON file store under `/dev/shm`; `DATABASE_URL`, AI provider/reviewer credentials, and Sepolia settings were empty. The API health response identified `storage.backend=file`, ready, and no chain configuration.
- The browser run created no external resources and made no chain transaction. The AI assessment form remained disabled because no provider or `AI_REVIEW_TOKEN` was configured.
- Chromium initially exited with `SIGTRAP` when its profile used the default temporary directory. The Playwright skill's loopback smoke test reproduced that failure, then passed when `TMPDIR=/dev/shm` was set. The application UAT used the same workaround without disabling the browser sandbox.
- The temporary store survived an API process restart when reopened at the same path. This proves local file-store process-restart behavior only; `/dev/shm` is volatile and does not prove host-restart or cloud durability.

## Observed workflow

1. Opened Map Explorer with `sourceId=KAZ_S_159` in the route, so the source was preselected for this run. The page showed the historical snapshot ID/cutoff, source count, source coordinates (**43.41337° N, 52.91829° E**), and the colored source markers. The Esri image loaded as location context; it is not the dated methane observation image.
2. Clicked **View full case**. The popup showed the source location, sector, linked record count, last observation and highest reported flux. MARS notification/feedback values remained publisher metadata, with an explicit warning that they do not confirm receipt, repair or reduced emissions.
3. Opened **Observations**. Three dated EnMAP-DLR records appeared in the chart/table: **591 ± 335 kg/h** (2024-06-07), **307 ± 66 kg/h** (2026-06-05), and **496 ± 226 kg/h** (2026-07-11). These are individual reported overpasses, not continuous monitoring.
4. Opened **Evidence** and selected the 2026-06-05 record by its plume ID. The UI displayed the matching publisher-supplied geometry with status **VERIFIED**, 307 kg/h and ±66 kg/h standard deviation. The label explains that this polygon is neither raw satellite pixels nor a concentration surface or mitigation proof. The linked UNEP mitigation-action item was shown as an external reference; its contents were not copied or included in the assessment.
5. Chose **Review evidence**. Evidence Auditor retained `KAZ_S_159`, showed three observations and one document reference, and kept mitigation as the selected claim. The deterministic rules baseline returned `insufficient_evidence` with “No evidence of the required type. Absence does not prove the claim is false.” No AI assessment or human approval ran.
6. Opened Verification Center. Revision 1 (`06676ea0-a006-40dd-937f-5f479cd9a4d5`) appeared in saved history with bundle digest `0xa23d49d727da9abefc66b5c6609a9497d4890f921b5773e3984e0d655fdbe36a`. After stopping and restarting the API against the same temporary store, the browser reloaded revision 1 and the verifier returned **Local SHA-256 valid · no on-chain verification (not_configured)**.

## Screenshots

- [`01-map-explorer-kaz-s-159.png`](01-map-explorer-kaz-s-159.png) — active snapshot, map style, selected source and satellite location context.
- [`02-case-summary-location-context.png`](02-case-summary-location-context.png) — popup opened by **View full case**.
- [`03-case-observation-history.png`](03-case-observation-history.png) — dated flux values with uncertainty and satellite names.
- [`04-selected-overpass-geometry.png`](04-selected-overpass-geometry.png) — selected historical overpass and matching verified publisher geometry.
- [`05-integrity-after-api-restart.png`](05-integrity-after-api-restart.png) — saved report after API restart and successful local digest verification.
- [`06-map-marker-selected-lby-s-098.png`](06-map-marker-selected-lby-s-098.png) — a source marker was clicked, then **View full case** opened the matching historical case dialog.
- [`07-auditor-selected-lby-s-143.png`](07-auditor-selected-lby-s-143.png) — Evidence Auditor search selected a different real source and refreshed the evidence inventory.

Screenshot SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `01-map-explorer-kaz-s-159.png` | `e779ae77b87780339d026cf438181c3f47655ca77e782e244a2fa4eca2fc2df0` |
| `02-case-summary-location-context.png` | `acbbcd5d17b4509afc062a6b3f2ff618262716831172c830a305094c8796c1de` |
| `03-case-observation-history.png` | `dbf149410c6c22f5db5c1b3d273a3300fe0364ab1b5cff86e55f1ede7ed1284d` |
| `04-selected-overpass-geometry.png` | `0f0b00ccde1096ed15fb4fdd0647af0e9e7f9ddc698585270beb94932decb0ad` |
| `05-integrity-after-api-restart.png` | `f5c642980d8139b35e6102e4b992bcb482fc2e2cfb21ea28d1039c913af11071` |
| `06-map-marker-selected-lby-s-098.png` | `d52152e7193bf1adf28e0b99d2e3da89bc1bcccbf1e23c6aa5353fe45470c1e1` |
| `07-auditor-selected-lby-s-143.png` | `e637e54d35277f4ebf7d2b989183e62965fc9864413dee53a14d49734db8e08e` |

## Supplemental marker and case-picker UAT

A second isolated loopback run on 14 October covered the two interactions omitted from the first pass. It used API `127.0.0.1:48381`, Vite `127.0.0.1:46319`, a new file store under `/dev/shm`, and no database, AI/provider, reviewer, or chain credentials. No external service or blockchain transaction was used.

1. On the historical map, the **Libya** region filter reduced the displayed catalog to 106 source locations. At a 1280 × 800 viewport, normal clicks expanded the visible clusters and then selected an individual marker. The selected ID changed from `LBY_S_143` to `LBY_S_098`; the URL became `/dashboard/map?sourceId=LBY_S_098` and the map popup identified the clicked source.
2. **View full case** opened the `LBY_S_098` dialog with coordinates **30.81677° N, 22.53535° E**, source metadata and Esri imagery labeled as location context. **Review evidence** then opened `/dashboard/audit?sourceId=LBY_S_098`, preserving the marker selection.
3. In Evidence Auditor, searching `LBY_S_143` returned one match. Selecting it changed the current source and evidence inventory to `LBY_S_143` (Libya; **29.04183° N, 20.78159° E**) and updated the URL to `/dashboard/audit?sourceId=LBY_S_143`.

The selected case links to a UNEP report by metadata only; its contents were not copied or sent to a model. The browser reported **0 JavaScript errors** and **38 console warnings**, including software-WebGL `GPU stall due to ReadPixels` and MapLibre `READ-usage buffer` performance warnings. These arise in this headless renderer and are not a measurement of physical GPU or mobile-device performance. The screenshots retain visible imagery attribution; Esri tiles are location context, not plume evidence.

## Limits

The first run verifies a local rules-baseline journey and local hash integrity; its source was supplied by the route. The supplemental run now verifies mouse selection of a source marker, opening its full case, forwarding it to the Auditor, and changing cases through the Auditor search. Together, these runs do **not** verify a live AI model, document-processing rights, a real authenticated human reviewer, cloud persistence, Sepolia receipt, physical mitigation, methane reductions, or mobile-device rendering/performance. Esri tile dates vary; location imagery must not be described as the plume's satellite overpass image.
