# Data provenance, claims and legal constraints

## Primary data references

- Download: https://methanedata.unep.org/download-dataset
- Dictionary: https://methanedata.unep.org/dict-mars-plumes
- The download/dictionary pages identify dataset terms as **CC BY-NC-SA 4.0**. Verify terms at the time of retrieval and maintain proper attribution and ShareAlike obligations for adaptations.
- The general [Eye on Methane terms page](https://methanedata.unep.org/terms-of-use) currently says CC BY-NC 4.0. The downloaded MARS archive includes a CC BY-NC-SA 4.0 license file and the MARS download page gives that dataset-specific license; `data/real/` follows the dataset/archive-specific terms. Recheck before refreshing or redistributing the data.

## Imported MARS snapshot

The local snapshot retrieved on `2026-10-11T16:29:31Z` has archive SHA-256 `b4162c277bcb699154ccc068f5f9510e1d32f355093884de6c8029ea34a62742`. It contains 4,210 unique source records and 30,289 unique plume records. The `source_name` source IDs have no duplicates; 23,770 plume rows link to a source, 6,519 have no `source_name`, and no non-empty plume source ID lacks a source row. Reported per-source plume counts and latest plume IDs match the linked rows in this snapshot.

The archive is kept under ignored `data/raw/`; the full normalized snapshot and manifest are under ignored `data/processed/`. The tracked [casebook sample](../data/real/README.md) contains three selected sources, their linked plume rows, and link-only metadata for official UNEP case items. It pins the archive hash in `mars_case_selection.json`; it does not include report PDFs, excerpts, or extracted report text. The API and dashboard use this pinned casebook by default. A user-imported full map snapshot is a separate local view and does not automatically become a reviewed audit case.

The two CSV tables have different meanings:

- `source_name` is the documented source identifier; `id_plume` is the unique observation identifier. Keep their relation explicit; never derive an ID from a display name or location.
- Source-level `feedback`, `feedback_operator`, and `feedback_government` indicate receipt status for a source. They do not contain the response documents or prove that physical mitigation was completed.
- Plume-level `notified` describes whether that plume was notified; source-level `notified` summarizes whether a notification was sent for at least one plume. Do not merge these fields as if they were the same fact.
- A row without `source_name` remains an unlinked observation. It is excluded from source-specific casebooks rather than assigned to a guessed facility.

Reproduce the import and selection using the commands in `data/real/README.md`. The UI and API use the three pinned real cases by default; synthetic fixtures are available through a separate mode for rule testing.

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

The evidence baseline supports three outputs: `supported`, `insufficient_evidence`, `contradicted`. `supported` always means *supported by the provided evidence*, not that the evidence itself is authoritative or physically proven. The source-level MARS `notified` field is presented as undated source metadata, not a plume-specific event. For the three selected real cases, detection and notification metadata can be cited; all mitigation audits abstain because linked report contents have not been included and reviewed.

## Baseline evaluation

`services/data-pipeline/data/mars_claim_benchmark.jsonl` contains nine expected-label examples tied to the three pinned sources and six separately marked synthetic fixture examples. Run `uv run python evaluate_baseline.py` from `services/data-pipeline` to calculate per-label precision/recall/F1, macro-F1, citation coverage, and false mitigation confirmations. These labels encode the project's evidence policy and the synthetic fixture's known typed records. The result is a conformance check, not independent truth labeling or a generalizable performance estimate; it does not meet the 40–80 claim / 10–20 source aspiration.

