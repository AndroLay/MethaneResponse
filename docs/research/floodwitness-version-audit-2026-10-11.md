# FloodWitness Audit: CEMS Version History and Prior Art

**Date:** 11 October 2026 (WITA)
**Purpose:** test FloodWitness's core claims against CEMS documentation, exploratory API probes, and prior-art research. This is not a model experiment or winner prediction.

## Short verdict

FloodWitness addresses a plausible research problem: CEMS mapping products can receive newer versions after QC finds an error, while the portal displays only the latest version. However, a proposal describing a “black-box recorder” has not shown that a rejected v1 product was ever publicly visible before replacement.

The finding that most changes the novelty assessment is the **OCHA-DAP CEMS Flood Archive Ledger**. Its public page describes an archive of CEMS flood products with SHA-256, file inventory, metadata for failed/unavailable downloads, geospatial harmonization, and an append-only transfer journal. This is very close to FloodWitness's “archive + integrity + availability transparency” concept. The page does not show a blockchain contract or a model predicting revisions.

**Current conclusion:** FloodWitness merits a limited proof sprint, but has not been proven the best candidate. Reposition it only if it demonstrates specific additional value: capture the first version when first public, connect QC revisions across versions, calculate spatial differences, and validate revision triage using features actually available before revision.

## CEMS facts supported by primary sources

1. **Product version and monitoring are different.** The CEMS manual says a Rapid Mapping product rejected during QC gets a new version to correct the error; v2 is made if v1 is rejected and v3 if v2 is also rejected. The manual also says only the latest version is available on the website. [CEMS Quality Control](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/quality-control/)
2. **The documented API contains current-version metadata.** The Rapid Mapping schema describes one `version` object per product with `uuid`, `number`, `reason`, `deliveryTime`, and `statusCode`, plus a `downloadPath` for that product ZIP. Documentation does not describe a complete version-history endpoint. [CEMS Emergency Response API](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/emergency-response-data/)
3. **Operational monitoring has separate fields.** The API schema contains `monitoring` and `monitoringNumber`; the manual says a post-event product may receive monitoring updates as the event evolves. Do not treat a new monitoring product as a QC correction v2/v3. [CEMS What is a Product?](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-a-product/)
4. **Publication follows product analysis.** Documentation says products are sent to requesters and published after analysis is finalized, except for sensitive activations. The sources checked do not establish whether a version later rejected by QC was previously public. [CEMS What is a Product?](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-a-product/)

Therefore an accurate claim is: “The documented public API shows current-version metadata; CEMS says its site displays the latest version.” There is no evidence that all bytes of older versions are deleted or that every v1 was once publicly downloadable.

## Exploratory API probe

An agent made live GET requests for the activation list and details of the first 100 activations in API order, with request delays and retries after 429. The list contained 267 activations. Across those 100 activations, the agent counted 1,135 products in current metadata: 962 version 1, 156 version 2, and 17 version 3. The Flood subset contained 476 products: 417 version 1, 53 version 2, and 6 version 3.

These numbers are an **agent exploratory probe, not a frozen dataset or my independent result**. Raw responses were not saved; the 100 activations followed API order rather than a random sample or preregistered protocol. A count of versions >1 is not the revision prevalence for the original product population: the endpoint shows current state, mixes product types/monitoring, and does not reconstruct features as they appeared when v1 was first visible. Do not use these numbers as submission metrics until probe code and raw responses are saved, unit schema is defined, and counts are reproduced.

In the same probe, an agent tested one product currently at v2: a ranged GET to the canonical v1 ZIP URL for `EMSR930_AOI02_GRA_PRODUCT` returned HTTP 404 after redirect, while v2 returned HTTP 206 with the beginning of the ZIP file. This **only proves that the one tested v1 URL could not be retrieved during the probe**; it does not show whether the file was once public before revision and does not generalize to all old URLs.

A subsequent live-status probe showed that of 267 activations in the index, only two were open at the time: one earthquake and one flood. The open flood product was still version 1; no flood product marked `W` (waiting for data) appeared in the inspected response. This was an agent-run snapshot at about 04:20 WITA on 11 October 2026 and was not saved as a raw artifact. Consequently, 48-hour polling can prove recorder/hash behavior and uptime, but does not guarantee a flood-product v1→v2 transition. Many polls of the same product are also not many independent model examples.

Among 59 Flood products with latest version >1, `reason` did not form one clean thematic label: 12 reasons were empty; others included layer/footprint corrections, but also map title, legend, SLD/visualization, AOI name, and metadata. This count is also agent-run on the same subset. Thus “ever received v2/v3” better represents **QC rework/revision** than flood-area error. If the model targets thematic revision only, reasons need a consistent taxonomy and annotation; do not force empty/ambiguous reasons into the negative class.

## Prior art missed in the FloodWitness report

The OCHA-DAP **CEMS Flood Archive Ledger** page, generated 4 September 2026, reports 302 flood activations, 3,611 ledger rows, 2,884 of 2,888 ZIPs archived, SHA-256 and ZIP-member inventories, and 2,963 transfer attempts in an append-only `transfers.jsonl` journal. The page also shows harmonized polygon data and a flood-label catalog. Its public repository names a `cems_flood` pipeline. [Archive page](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-archive/) · [OCHA-DAP repository](https://github.com/OCHA-DAP/ds-geospatial-impact-estimates) · [Flood-label viewer](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-labels/)

The archive counts/completeness above are **published by the system owner**; this audit did not download the archive/parquet or recompute hashes/counts. The page marks its environment as `dev`. This establishes very close public prior art, not that the system is a production service or satisfies every FloodWitness need.

### Effect on differentiation

FloodWitness should not claim novelty for:

- archiving CEMS flood products;
- recording SHA-256 hashes and ZIP contents;
- showing unavailable/failed files;
- maintaining an append-only transfer journal;
- displaying CEMS flood labels or geometries over time.

Potential differentiation not proven to match OCHA includes public cross-organization timestamp commitments, a supersession graph specifically linking QC corrections v1→v2/v3, geospatial diffs between versions of the same product, and triage models before a correction occurs. OCHA stores version-marked filenames and has a log; this audit did not inspect enough code/data to claim OCHA lacks a version graph or particular comparisons.

Also, ESA has completed EO-Claim Ledger: an MVP for satellite-imagery-based insurance claims using blockchain. Therefore “earth imagery + flood + hash/contract” is not novel either. [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger)

## AI validation problem

`revised later` is plausible as a **proxy for QC correction/rejection**, not a label for “initial map was wrong” or “flood was misdetected.” A model needs two different things:

1. an outcome showing that the product eventually got a higher QC version; and
2. features actually known when the initial product was first published.

Current metadata may show the final version number, but does not by itself retain a complete v1 feature snapshot. If features come from v2/v3, the model leaks future data. Each training row needs evidence of v1 capture time, initial-version metadata/file, and time of the next revision. If that cannot be reconstructed, do not report a revision-risk backtest.

The target should also exclude sensitive activations, unfinished products, status `N`, products added after activation, and operational monitoring. Products with no revision by the snapshot time are not necessarily negative; some may be censored because not enough time has elapsed for revision. Split by time and activation, not by random product/poll.

The original report's data gate cannot rely only on a count of “labeled products.” Add these requirements:

- retrieve or recover the initial version and timestamp of its first visibility;
- prove each predictor was available before the outcome;
- ensure v2/v3 labels come from QC revisions, not monitoring products or partial releases;
- separate/censor unfinished or sensitive statuses appropriately;
- test the baseline/result on activations absent from training.

48-hour polling can test recorder, hashing, and verifier operation; it cannot establish revision prevalence or model quality, and an actual revision may not occur during that period.

## Blockchain value limits

A Sepolia contract can prove that a particular hash was recorded by a wallet before a block time and that a changed file no longer matches that hash. It cannot prove bytes came from CEMS, the capture timestamp is correct, all versions were captured, or the map correctly depicts a flood. `INGESTER_ROLE` authorizes a wallet under the contract, not on behalf of Copernicus.

OCHA already demonstrates SHA hashes and an append-only journal in cloud storage. To justify blockchain, FloodWitness needs to identify independent parties that would verify/write evidence and explain why ordinary signatures/transparency logs are insufficient. If one team controls the collector, storage, wallet, and model, ledger claims should be limited to independent public verification of timestamp/hash.

## Decision recommendation

**Not GO for FloodWitness as the final recommendation yet.** Run a falsification sprint only if the first eight hours can:

1. count current Flood products by product type, status, `monitoringNumber`, and version;
2. directly test whether a v1 ZIP for an example now at v2 can be downloaded, without assuming old URLs are valid;
3. measure how many products have first-seen v1 evidence and later QC revisions;
4. compare recoverable pre-revision features with final features to detect leakage;
5. request or inspect relevant OCHA-DAP artifacts and explicitly compare scope/features.

If initial versions and pre-revision predictors cannot be reconstructed, stop the AI revision-risk claim. FloodWitness could still demo provenance, but would directly compete with an existing OCHA archive; that does not yet establish superiority in Innovation or Practical Usefulness. Recompare with CoolingProof and ShiftProof using actual data evidence, not heuristic scores.

## Evidence-status separation

| Status | Statement |
|---|---|
| Verified from official documentation | v2/v3 follow QC rejection; site shows latest version; API documents one current-version object; operational monitoring has separate fields. |
| Visible on OCHA-DAP page | Archive reports ZIPs, hashes, manifests/inventories, append-only journal, and harmonized CEMS flood data. Not recomputed from storage/parquet. |
| Agent probe | API counts for selected 100 activations and Flood subset; non-random, raw snapshot not saved, not a model result. |
| Inference | FloodWitness might differentiate through first-seen public commitment, QC supersession graph, geospatial version diff, or revision-risk prediction. No user/model evaluation proves this. |
| Unknown | Whether rejected v1 was ever public; whether other old URLs still work (one EMSR930 v1 URL returned 404); total Flood products actually revised; whether historical features can be reconstructed without leakage; whether users need blockchain. |
