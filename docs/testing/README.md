# Testing and verification

| Guide | Purpose |
|---|---|
| [End-to-end testing](end-to-end.md) | Isolated API/Vite/Chromium runs, browser workflow coverage, and runtime boundaries |
| [AI benchmark annotation protocol](ai-benchmark-annotation.md) | Independent labels, source separation, citation scoring, abstention, and rights review |
| [Local browser and quality evidence](../evidence/README.md) | Exact local runs, screenshots, dataset versions, and what each result does not prove |

Run the documented commands from the root [README](../../README.md#verification). API tests and the full local gate use the file/in-memory stores and do not require Docker, PostgreSQL, or PostGIS.
