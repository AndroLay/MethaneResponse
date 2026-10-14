# Browser evidence — WP-3 workflows

Captured on 14 October 2026 from the local React/Hono application in Chromium using the verified MARS snapshot. These screenshots document UI state and navigation; they do not independently prove methane mitigation, document authenticity, or satellite image date/quality.

| Artifact | What it shows |
|---|---|
| `01-cases-pagination.png` | Cases table with 4,218 source inventory, paginated rows, and selected real case. |
| `02-map-selected-source.png` | Initial diagnostic capture before the MapLibre style fix; it shows the false tile notice later traced to an invalid outline expression. See image 09 for the reloaded map after the fix. |
| `03-evidence-case-search.png` | Evidence Auditor search bounded to 20 of 136 Kazakhstan matches. |
| `04-evidence-auditor-source.png` | Evidence Auditor for KAZ_S_159; assessment remains pending and AI is not configured. |
| `05-operators-metadata.png` | Publisher-provided notification/feedback fields with the explicit metadata limitation. |
| `06-settings-preferences.png` | Browser-local preferences and their save status. |
| `07-map-grayscale-style.png` | MapLibre Earth appearance with grayscale imagery selected. |
| `08-map-natural-color-style.png` | The same selected-source map in natural-color satellite mode. |
| `09-map-style-validation-fixed.png` | Fresh browser after the MapLibre outline-expression fix; selected source remains centered and the false tile notice is absent. |
| `10-map-runtime-tile-fallback.png` | Current 1440 × 1050 Chromium run with two Esri tile requests failing `ERR_INSUFFICIENT_RESOURCES`; the accurate tile warning and retry control are visible while KAZ_S_159 details and source markers remain available. |
| `11-map-mobile-tile-fallback.png` | 390 × 844 Chromium run with Esri requests blocked locally; the map warning and retry control remain visible, source markers remain on the canvas, and document width stays at 390 px. |

The browser session used a temporary local file store. No provider call, cloud write, reviewer action, or blockchain transaction was made. Chromium used software WebGL; screenshots are not mobile-device performance measurements.
