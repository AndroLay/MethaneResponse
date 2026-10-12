# Data provenance, claims and legal constraints

## Primary data references

- Download: https://methanedata.unep.org/download-dataset
- Dictionary: https://methanedata.unep.org/dict-mars-plumes
- The download/dictionary pages identify dataset terms as **CC BY-NC-SA 4.0**. Verify terms at the time of retrieval and maintain proper attribution and ShareAlike obligations for adaptations.
- The general [Eye on Methane terms page](https://methanedata.unep.org/terms-of-use) currently says CC BY-NC 4.0. The downloaded MARS archive includes a CC BY-NC-SA 4.0 license file and the MARS download page gives that dataset-specific license; `data/real/` follows the dataset/archive-specific terms. Recheck before refreshing or redistributing the data.

## Imported MARS snapshot

The local snapshot retrieved on `2026-10-11T16:29:31Z` has archive SHA-256 `b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742`. It contains 4,210 unique source records and 30,289 unique plume records. The `source_name` source IDs have no duplicates; 23,770 plume rows link to a source, 6,519 have no `source_name`, and no non-empty plume source ID lacks a source row. Reported per-source plume counts and latest plume IDs match the linked rows in this snapshot.

The 2026-10-11 archive is retained as the input to the three-source API audit casebook. The newer archive retrieved at `2026-10-12T10:20:45Z` has SHA-256 `e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481`; its tracked browser projection contains 4,211 sources and 30,319 plume rows (23,785 linked; 6,534 missing `source_name`; 1,043 without quantified flux), with observation dates from 2020-10-29 to 2026-09-11. The full normalized archive and source CSV values remain in ignored `data/raw/` and `data/processed/`; the browser gzip projection is `apps/web/public/data/mars-snapshot.json.gz`. The dated releases actually retrieved by this project are listed in `data/real/mars_snapshot_history.json` and served to the Documents page.

The tracked [casebook sample](../data/real/README.md) contains three selected sources, linked plume rows, and link-only metadata for official UNEP case items. It pins the older archive hash in `mars_case_selection.json`; it does not include report PDFs, excerpts, or extracted report text. The dashboard and intelligence API use the newer full snapshot. New document assessments resolve the exact source ID against that validated snapshot and bind the report to its source archive provenance, dataset snapshot ID, browser-input SHA-256, analysis SHA-256, and original observation IDs paired with timestamps. The casebook is a compatibility fallback when the full snapshot is unavailable. Curated links are merged into a newer map record only when every referenced detection plume ID exists in that source's current history. Browsing a global source does not automatically make it a reviewed audit case: an authorized document excerpt, exact validated citations, and human review are still required.

The two CSV tables have different meanings:

- `source_name` is the documented source identifier; `id_plume` is the unique observation identifier. Keep their relation explicit; never derive an ID from a display name or location.
- Source-level `feedback`, `feedback_operator`, and `feedback_government` indicate receipt status for a source. They do not contain the response documents or prove that physical mitigation was completed.
- Plume-level and source-level `notified` values are retained in their original scopes. A source flag does not identify the recipient or exact notification time and cannot alone support an `operator_notified` audit.
- A row without `source_name` remains an unlinked observation. It is excluded from source-specific casebooks rather than assigned to a guessed facility.

Reproduce the import and browser projection using the commands in `data/real/README.md`. Synthetic fixtures are available through a separate mode for rule testing.

## Map context overlays

The optional **MARS publisher geometry** map layer uses the official GeoJSON archive matched one-to-one to the pinned CSV snapshot by plume ID. Its 30,319 records include 29,112 publisher MultiPolygons and 1,207 null geometries; see [`MARS_PUBLISHER_GEOMETRY.md`](MARS_PUBLISHER_GEOMETRY.md) for retrieval time, source hashes, monthly lazy loading, license, color scale, and validation. The polygons remain attributed exactly as publisher-supplied geometries: neither polygon area nor its display color is an interpolated methane concentration field or independent proof of a physical plume boundary. Missing geometries remain missing. This historical layer does not imply live monitoring.

The optional MODIS true-color, MODIS cloud-fraction, and AIRS 400 hPa map layers are visual context from NASA GIBS, not MARS case evidence. In particular, the AIRS 400 hPa layer is an upper-atmosphere product and must not be interpreted as a local surface leak or a methane plume measurement. Terrain and UTC day/night shading are also visualization aids; they do not support or contradict an emissions or mitigation claim. See [Earth rendering 3D](EARTH_RENDERING_3D.md) for layer dates, attribution, and performance limits.

## Data handling

1. Download real snapshots manually, recording URL, retrieval timestamp, source license, and SHA-256.
2. Store raw downloads under `data/raw/`, excluded from Git.
3. Parse with explicit source ID mapping; a plume ID is not the same as a persistent source ID.
4. Never treat UNEP's source-level `feedback` as per-plume evidence of repair.
5. Non-observation by a satellite is not proof that emissions ceased. Consider revisit interval, cloud/sensor limits and uncertainty.
6. Do not claim UNEP endorsement. Distinguish UNEP's official confirmations from independent algorithmic conclusions.
7. Case report PDFs may have different licenses: link to source rather than rehost/adapt until permissions are confirmed.
8. For later commercialization, obtain suitable data rights; a hackathon demo does not imply a commercial license.

## Supported claims

- `source_detected`: at least one traceable detection record.
- `operator_notified`: a traceable record of communication to an operator.
- `mitigation_confirmed`: a traceable confirmation report; **not** just feedback or missing plume.

The evidence baseline supports three outputs: `supported`, `insufficient_evidence`, `contradicted`. `supported` always means *supported by the provided evidence*, not that the evidence itself is authoritative or physically proven. The source-level MARS `notified` field is displayed as metadata, not as evidence that a specific operator was notified. For the three selected real cases, detection observations can be cited; operator-specific notification and mitigation claims abstain because supporting records have not been included and reviewed.

## Baseline evaluation

`services/data-pipeline/data/mars_claim_benchmark.jsonl` contains nine expected-label examples tied to the three pinned sources and six separately marked synthetic fixture examples. Run `uv run python evaluate_baseline.py` from `services/data-pipeline` to calculate per-label precision/recall/F1, macro-F1, citation coverage, and false mitigation confirmations. These labels encode the project's evidence policy and the synthetic fixture's known typed records. The result is a conformance check, not independent truth labeling or a generalizable performance estimate; it does not meet the 40–80 claim / 10–20 source aspiration.

## Investigation intelligence snapshot

`services/data-pipeline/build_intelligence.py` derives `data/processed/intelligence-snapshot.json` from the full pinned browser dataset at `apps/web/public/data/mars-snapshot.json.gz`. Its source/plume join uses only each plume's explicit linked `sourceId`; missing or unknown IDs are not assigned. The snapshot covers all 4,211 MARS source rows and all 23,785 explicitly linked plume observations in release `unep-mars-e0721015e925`, from 2020-10-29 through 2026-09-11. It stores the exact compressed input SHA-256, original archive SHA-256, dataset ID, publisher, license, catalog URL and attribution, source/plume identifiers, timestamps, numeric/missing flux counts, uncertainty summaries, MARS persistency context and heuristic components. Re-running the builder with unchanged gzip bytes produces the same output and uses the recorded retrieval timestamp, not the current clock.

The investigation score is a bounded heuristic based on distinct observation dates and median numeric observed flux. A source with missing flux has a null magnitude contribution; it receives no fabricated zero-flux measurement. Source persistency and emission-status fields are displayed for context but are not treated as a future outcome label. The API verifies the intelligence snapshot against the exact pinned browser bundle and its upstream archive identity, and serves an insight only when the source ID exists in that snapshot. Forecast output remains `not_available`: MARS detections do not encode complete satellite observation opportunities or independent future labels.

The same snapshot carries a separate `anomalyAnalysis` screen (`mad-threshold-screen-v1`). It requires at least eight numeric flux observations on four distinct dates. It uses 1.4826 × MAD as its robust scale, or the median positive reported uncertainty when MAD is zero, and flags only deviations above `max(3.5 × scale, 2 × that observation's reported uncertainty)`. Each candidate retains the plume ID, date, flux, uncertainty, deviation and threshold. Insufficient observation count or date coverage is explicit abstention; a result with no flagged candidate is not evidence of zero emissions. This screen is not independently validated and does not change the separate investigation-priority score. In the pinned 4,211-source release, 3,548 sources abstain for fewer than eight numeric observations, 2 for date coverage, 465 have no candidate above threshold, and 196 have one or more statistical candidates (293 candidate points total). Those counts describe this fixed snapshot and algorithm only; they are not detector-accuracy measurements or verified leak events.

## Optional document assessment

The optional model path accepts a source in the validated full MARS snapshot or the curated compatibility casebook, plus a bounded excerpt the user is authorized to process. It records consent, sends the excerpt to the configured server-side provider, verifies exact quote substrings, and stores selected quotations/document digests rather than the complete source text. This verifies quotation matching to the submitted text only; it cannot establish document authenticity, context, scientific sufficiency, or physical mitigation. The provider path has not been measured on an independently human-labeled dataset. No AI benchmark metrics are claimed.

Human review is a distinct authenticated step with separate approve, reject, and request-more-evidence dispositions; each creates a new v3 audit revision linked to the prior bundle hash. Requesting more evidence produces `insufficient_evidence` until the evidence is reassessed. A reviewed report can be anchored, but neither reviewer approval nor a blockchain receipt proves methane repair. The v3 bundle binds MARS archive provenance, the source's plume IDs, model/prompt version, reviewer decision, and current intelligence snapshot hash when available. Existing v2 audit and receipt records remain supported.

