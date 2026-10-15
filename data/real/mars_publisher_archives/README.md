# UNEP MARS publisher indicator archives

This directory keeps the publisher ZIP files and retrieval metadata separate from the full source/plume snapshot and the local audit store. The retained release is `releases/2026-10-15/`; no database service is used.

## Retained publisher data

| Input | Publisher coverage | Local contents | Retrieved | SHA-256 |
|---|---|---:|---|---|
| Top 50 monthly ZIP | Jan–Sep 2026 | 9 monthly CSV releases × 50 source rows, plus publisher workbooks and dictionary | 2026-10-15 08:42:24 UTC | `3189023da6e6c2e003a8f64ee40f450f45bce6601c8751767369393eba994509` |
| Country response-rate ZIP | 2025-01–2026-07 release windows | 8 dated releases × 34–36 country rows, plus publisher dictionary | 2026-10-15 08:42:22 UTC | `3d855e839fb90c8073fcd7e04f7da6070b8602ab2663587e114a407e79eebb9a` |

The response archive includes the latest 12-month period **2025-08-01 through 2026-07-31**, and seven older archived periods. The Top 50 CSV contains no explicit rank column. MethaneResponse preserves row order for reproducibility but compares only monthly list membership; it never manufactures rank changes from row positions.

## Snapshot binding and outputs

The normalized browser projection is [`mars-publisher-indicators.json`](../../../apps/web/public/data/mars-publisher-indicators.json), with [`mars-publisher-indicators.manifest.json`](../../../apps/web/public/data/mars-publisher-indicators.manifest.json) binding its SHA-256 and counts. It is bound to MARS source/plume snapshot `unep-mars-675417694883` and the source archive SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`. All 50 source identifiers in each retained monthly Top 50 release exactly match that snapshot. IDs are compared as strings; no fuzzy location join is performed.

The projection retains publisher coordinates, categories, source-level notification/feedback flags, plume counts, timestamps, flux values with their published `t/h` units and reported standard deviations, persistency values, and estimated methane mass. Country response entries retain the exact reporting interval, notified-source denominator, notified-source-with-feedback numerator and published percentage. Missing values remain `null`. The manifest currently records 450 Top 50 rows across nine months and 278 country-period rows across eight releases.

The official September 2026 MARS snapshot report is listed in the projection as a **link-only reference**. Its WeDocs item page describes a CC BY-NC-ND 3.0 IGO license. No report PDF, text, table, image or extracted mitigation count is bundled or parsed. See the [official UNEP report item](https://wedocs.unep.org/items/2c7fe37c-2485-4f37-b496-fa53c9f7dacc) and its item-level license before any separate use.

## Rebuild

From the repository root, with Python and `uv` already available:

```bash
uv run --project services/data-pipeline --locked python services/data-pipeline/build_publisher_indicators.py
```

The standard-library-only importer verifies ZIP CRCs, the archived byte lengths, upstream `Content-MD5`, SHA-256, retrieval timestamps, required CSV columns, exactly 50 distinct source IDs per monthly Top 50 file, WGS84 coordinates, finite numeric values, reporting-period agreement, response-count bounds, and exact source IDs against the pinned MARS snapshot. It writes byte-stable JSON and its manifest; running the same inputs twice produces the same files.

## Meaning and limits

- The MARS catalog describes the Top 50 list as updated monthly and based on publisher flux, persistency and uncertainty criteria using recent observations. Those choices depend on observation availability and seasonality. MethaneResponse shows half-year average flux, not a current measurement, and does not assign a project score.
- The country rate is an aggregate engagement metric: distinct notified sources that received feedback divided by distinct notified sources in that country and period. It does not show which claim was answered or prove physical repair, reduced emissions or mitigation.
- A publisher notification flag does not prove receipt. A publisher feedback flag records that feedback was received, not its content or result.
- These are historical snapshots, not a live feed. No value is inferred from an absent observation or a missing rate.
- The dataset archives and normalized derivative follow the dataset-specific **CC BY-NC-SA 4.0** terms and attribution recorded in [`NOTICE`](../../../NOTICE). The separate mitigation report item follows its own license.
