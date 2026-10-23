# MethaneResponse user workflow

[Documentation index](../README.md) · [Local setup](../development/local-setup.md) · [Official MARS workflow and product mapping](mars-response-workflow.md)

**Active guide — 20 October 2026.** This workflow records what can be inferred from the available evidence and what still needs to be checked. The application does not detect new methane, send operator notifications, or certify field repairs.

## 1. Select a dataset and source

Run the web app/API, then open <http://localhost:5173>. Select a historical source in **Cases** or **Map Explorer**; for example, [KAZ_S_159](http://localhost:5173/dashboard/map?sourceId=KAZ_S_159).

The bundled snapshot `unep-mars-675417694883` contains 4,218 source rows and 30,414 plume rows through 13 September 2026. The 6,553 plume rows without a source ID remain unlinked. The four-source casebook is a subset with reference context. **Synthetic demo** uses separate fabricated fixtures.

| Workspace | Purpose |
|---|---|
| Map Explorer — `/dashboard/map` | Historical sources/plumes, layers, camera focus, and case details |
| Cases — `/dashboard/cases` | Search/filter, 25/50/100 rows per page, queue, and saved investigations |
| MARS Indicators — `/dashboard/indicators` | Nine monthly Top 50 releases and eight country response-rate periods |
| Evidence Auditor — `/dashboard/audit` | Scope, observations, coverage, assessment, and history |
| Documents — `/dashboard/documents` | References related to a source; a link does not mean its contents were checked |
| Operators — `/dashboard/operators` | Queue for reviewing `notified`/`feedback` metadata; does not contact operators |
| Reports — `/dashboard/reports` | Reports, briefs, and public-transparency summaries |
| Verification Center — `/dashboard/blockchain` | Local hashes and receipt status, when actually available |
| Settings — `/dashboard/settings` | Browser preferences: start workspace, basemap, Earth quality, and sidebar |

**View full case** opens the details dialog while preserving map context. **Open in Map Explorer** centers the camera on the stored coordinates. The app does not add an address/city that the publisher did not provide. GeoJSON imports are read locally in the browser and do not replace the server snapshot.

## 2. Review observations and context

<a id="rencanakan-kapasitas-investigasi"></a>
### Plan investigation capacity

In **Cases → Plan investigation capacity**, set 1–50 slots, per-country limits, countries/sectors, and the historical recurrence weight. **Compare investigation plans** compares four options: weighted percentile, median reported flux, distinct observed dates, and greedy geographic/sector breadth. All use the same pool and hard quotas. Sources without linked observations are explained as excluded; they are not treated as zero emissions. The planner period covers the entire snapshot and is separate from the map's period filter.

Cards compare the number of sources, known countries/sectors, median of source median flux, median observation date, overlap, and unfilled slots. These are descriptive tradeoffs, not a ranking of climate benefit. **Inspect rows** shows selected/excluded/all, 20 rows per page; exclusion reasons distinguish scope, empty history, quota, and capacity. **Case**, **Map**, and **Evidence** preserve the source ID; opening a source clears directory/map filters so the selection and details stay consistent.

**How stable is this allocation?** shows how results change when one assumption changes. **Download reproducible plan** saves the full candidate projection, parameters, results, provenance, and hashes. No assignment or request is sent, audit is saved, or blockchain transaction made. Local verification: `bun run prove:planner --verify PATH --expected-digest TRUSTED_DIGEST`. A valid replay does not prove input authenticity or field benefit. Synthetic demos do not show the real-data planner; the public preview uses only three curated sources.

Check dates, plume IDs, flux in the publisher's units, uncertainty, missing values, and provenance. Observations are discrete measurement points. Source density does not represent methane concentration; location imagery is not a plume image from a specific overpass. The map legend/history can be opened without changing the dataset.

MARS `notified` and `feedback` remain administrative metadata. Country response rates count feedback on notified sources; they do not count repairs. Top 50 has no explicit rank column, so CSV order is not presented as an invented ranking. See [data and claims](data-and-claims.md).

Recurrence/anomaly insights and the priority heuristic help select investigations. Recurrence estimates concern the next linked MARS record, not the probability of a physical leak. Priorities are used only when the snapshot/archive binding matches.

<a id="operasikan-dan-tinjau-rencana"></a>

### Operate and review a plan

1. After choosing a strategy, click **Use this plan on map & queue**. The **Active investigation plan** queue shows selected IDs, 10 per page, and cyan rings at the source coordinates. Rings mark the allocation, not methane intensity. **Map** centers the source; **Evidence →** opens the same source in the auditor. Assigning an owner and sending a request remain separate steps.
2. Choose **Edit capacity & strategy**, change 10 to 20, then compare again. The old queue stays active until replacement is approved with the activation button. Parameters, scope, and strategy are rechecked after replay; a late response must not activate an old selection.
3. Under **Compare an earlier plan or snapshot**, select a plan export or reviewed history (up to 16 MB) and enter a SHA-256 digest from a separately trusted record. The file is read locally in the browser; the CLI can inspect larger histories up to 32 MiB. The system verifies the replay before comparing. Strategy/quota changes on the same snapshot are labeled assumption changes, not new observations. Another snapshot requires a compatible complete file; the application does not automatically download a new snapshot or assume another ID means a later date.
4. The comparison highlights sources added/removed and changes to country, sector, median flux/SD, record/date counts, missing flux, and latest date summaries. This is **not a diff of all plumes, notifications, or feedback**. Open sources that need review and inspect the original records; metadata corrections can also change the summary.
5. In **Human review & version history**, connect a signed reviewer token through the same team connection. Tokens are held only in memory; the backend requires `private_read`, the additional `review` scope for writes, and current directory authority `source_detected`. Enter the Plan ID, decision, and rationale. The backend recalculates the plan from its archive, sets the actor/time, and saves a revision with compare-and-swap. Conflicts do not overwrite notes; load the latest history, compare, then save again. Accepting an allocation does not certify mitigation.
6. **Download reviewed plan history**, store the head digest separately, then verify it: `bun --no-env-file scripts/verify-plan.ts history.json --expected-head 0xTRUSTED_SHA256`. The CLI checks every revision and replays against that digest. An edited and rehashed history is also rejected if its head differs from the trusted one. This hash is not a reviewer signature or blockchain anchor.

The active plan lasts only while the tab/application remains open, including navigation between workspaces; refresh clears it. Rationale drafts use recovery in the tab named for the reviewer, but SessionStorage is neither encrypted storage nor strong user isolation. Server history is stored in `${AUDIT_STORE_PATH}.plans.json` with a `.initialized` marker, up to 20 plans, 20 distinct reports/plan, and 100 revisions/plan, with a total of 32 MiB. Back up both files while the API is stopped; do not edit the files, run multiple writers, or rely on the temporary preview filesystem for hosting durability. The public preview does not expose private plan history.

<a id="tinjau-perubahan-dua-snapshot-historis"></a>

### Review changes between two historical snapshots

1. In **Cases → Plan investigation capacity**, compare plans. Open **Which investigations need another look?** and select **Sources in this allocation**. **Check historical snapshot changes** compares releases retrieved on 12 and 14 October, bound to the active inputs; the selected strategy determines which IDs are checked. This does not change the active queue or reviewer decisions.
2. Check the counts of sources/records added, removed, or changed. **82 added records** are dated after the earlier archive window; **13 historical backfills** fall within the old window. A new record in an archive does not automatically mean a new emission event. The 6,534→6,553 records without a source remain unresolved.
3. The default weighted allocation, capacity 10 or 20, maximum two per country, and weight 50 produce three affected IDs: `DZA_S_011`, `IRN_S_065`, `TKM_S_021`. Open **Original record changes** to inspect publisher values before/after; missing values are not zero. Changes to persistency, dates, flux, or reported SD must be interpreted according to their original fields. Feedback/notification remain metadata, not proof of repair.
4. **Inspect evidence →** and **Map ↗** open the source with the same ID. Select **All changed sources** to see all 178 affected IDs, 20 sources per page; observation changes within each source are also paginated. Unresolved record changes remain in the complete export and are not assigned to sources by geographic proximity.
5. **Download complete change report** saves the full diff with both input descriptors, field policy, and digest. Run the [replay verifier](../evidence/snapshot-change-watch-2026-10-20/README.md#reproduce) using the two original gzip files and expected hashes obtained separately. The browser validates context and export digest; the CLI performs the full replay. This does not authenticate the publisher or prove measurement truth.

Changing strategy/capacity invalidates earlier results. Errors can be retried; an empty scope does not silently open the full catalog. The public preview rejects the full diff to preserve its three-source limit. The backend rejects a corrupt or mismatched dataset. This step does not automatically update upstream data, produce prospective predictions, assign work, or create a chain anchor.

<a id="document-assessment-and-human-review"></a>

## 3. Define claim and scope

For the full **allocation → investigation → request/response → review → frozen decision → verify/revisit** workflow, see [connected investigations](../development/connected-investigations.md). Its panels use the same source, snapshot, and scope context in the shared workspace; work status is not a mitigation verdict.

In **Overview**, select `source_detected`, `operator_notified`, or `mitigation_confirmed`. Enter **Period start**, **Period end**, and an optional **Observation event**, then choose **Apply assessment scope**. The event must belong to the source and fall within the period. For notification claims, name the recipient. The period should cover the action/follow-up being assessed.

**Use loaded observation period** fills the date bounds from all loaded history; **Use selected observation day** limits scope to one event. Review the preview, then choose **Apply assessment scope**. Presets are not repair dates or follow-up periods. **Run rules baseline** is disabled while edits remain unapplied. Scope drafts are stored per investigation context in SessionStorage and restored when returning to this page; if storage is blocked, a warning says the draft will be lost when leaving the page. A recoverable scope draft does not trigger a navigation dialog.

The coverage panel shows required evidence types, eligible references, excluded references, and next checks. The preview and API use the same selector. `notified`/`feedback` metadata and link-only reports remain context only. Selecting a claim does not automatically save an assessment; **Run rules baseline** creates a baseline revision.

Scoped rules exclude references without dates, outside the period, or for a mismatched event. Notification references must match the recipient; mitigation-reference support requires an action, an action date, and follow-up dated on/after the action within the period. This checks metadata relationships; it does not authenticate references.

**Use source-level baseline** clears scope for the legacy path. Each exact scope has its own history. The editor waits for the dataset to finish loading; the temporary DEMO fallback cannot be edited as a real source.

## Decision Lab: explain the decision and request evidence

After applying the claim/scope, choose **Decision Lab → Explain current evidence**. The API loads references from the server snapshot; users cannot inject references through this endpoint. The analysis does not save an audit revision or call AI.

- **Inspect reference eligibility** shows supporting/contrary references and exclusion reasons, such as dates outside scope or missing follow-up.
- **What changes if a reference is removed?** reruns the same rules after removing one reference ID. It shows at most eight individual dependencies, plus the removal of all eligible references. This measures decision dependence on metadata, not repair probability or emissions forecasts.
- **Download evidence request** creates a Markdown draft with the source/scope, snapshot/hash, attribution/license, and acceptance checks. The request is not sent; review it and copy it explicitly into follow-up work.
- **Download reproducible analysis** saves the input, trace, sensitivity, policy, and SHA-256. The browser checks the checksum and reruns the policy before displaying results. An unsigned checksum does not authenticate the publisher.
- **Continue to human assessment** and **Open follow-up work** preserve the selected investigation. Save reviewer decisions through the existing authorized path.

**Open synthetic evidence challenges** separates five authored DEMO scenarios: complete, missing follow-up, out of period, contrary, and conflict. These scenarios test rules using fabricated metadata; they do not represent a real operator or repair and are not included in MARS case audits. Return using **Return to selected MARS source**.

Changes to the source/claim/scope/snapshot discard old results and cancel pending requests. Scope drafts, sources unavailable in the API, snapshot changes, errors, and rate limits each have their own status. Evidence and replay commands are in the [Decision Lab package](../evidence/decision-lab-2026-10-19/README.md).

### Observation cross-check: find contrary records

1. Select a historical source in Evidence Auditor, then open **Decision Lab → Observation cross-check**.
2. Choose a statement: no linked detections; every point estimate is at or below a kg/h threshold; or physical mitigation succeeded. This is an analyst-authored scenario, not a claim attributed to an operator.
3. Set inclusive UTC start/end days. **Use loaded observation period** fills the range from loaded history without changing the primary audit scope.
4. Run **Check observation claim**. The API reads the pinned snapshot, not observations submitted by the user. The browser matches the source ID, question, snapshot, upstream archive hash, and verified input hash, then reruns the policy and SHA-256.
5. Check the exact plume IDs, original timestamps, flux in kg/h, reported SD, satellite, and coordinates. Plot points/error bars represent discrete observations and ±SD, not continuous emissions or the probability of exceeding a physical threshold. The table shows 20 records per batch; replay JSON contains every record, including those outside the period.
6. Download the follow-up draft and replay file. The draft is not sent; human assessment and audit publication remain separate steps. Navigating to Observations/Human assessment/follow-up does not automatically save this exploratory conclusion.

Canada example `CAN_S_002`: the 1,044 kg/h estimate contradicts the scenario that all estimates are at or below 1,000 kg/h, but its SD of 370 kg/h crosses the threshold. This does not imply that physical emissions definitely exceed the threshold. **Physical methane mitigation succeeded** always requires document review, including when no records exist in the period.

Old results are immediately discarded and pending requests canceled when the question/period/threshold changes. A new source/snapshot/hash/context resets the panel. Archive-window limits, missing flux, errors, public preview, and rate limits are shown. Only records linked by source ID are used; unlinked records are not assigned by geographic proximity. See [evidence and walkthrough](../evidence/observation-crosscheck-2026-10-19/README.md).

## 4. Save investigation work

In **Analyst case work**, enter a question, working notes, evidence request, next action, and status: **Investigate**, **Awaiting evidence**, **Deferred**, or **Review recorded**. **Save case work** stores the claim/scope context with the notes.

- **New investigation** creates another work ID for the same source/snapshot.
- **Saved investigations** / **Resume saved investigation** opens a specific work item and restores its claim/scope.
- To save a different claim/period, first resume the intended context or create a new investigation.
- Cases filters status across all saved investigations and preserves the active selection from Auditor.
- Work status is analyst triage. Changing notes/status does not create a verdict, modify an earlier audit, or indicate repair.

<a id="workflow-continuity-17-october-2026"></a>

### Continue a shared investigation

Choose **Open shared workspace**, then connect a signed reviewer token authorized in the team directory. **Shared investigations** loads the server queue; **New shared investigation** creates another work item. Record the assignee, due date, and next action, then choose **Save shared work**. Other members use their own tokens to continue it on the same API. Cases uses the team queue while connected; updates are loaded through an explicit refresh.

Stale saves are rejected; the draft remains. **Review latest revision** displays the server version for comparison. Choose the latest version, or review every field before selecting **Keep my draft on this revision** and saving again. History records the actor/version. If refresh fails, stale server data is hidden and save is disabled; the draft is retained.

For existing browser notes, **Preview browser import → Import as new shared investigation** creates a new ID without deleting local notes or overwriting the server. Tokens are lost on reload; reconnect is required. Shared use still relies on one API/local private file; it is not a tested hosted service. See the [runbook](../development/shared-casework.md) for setup, access, and recovery.

### Draft recovery and storage limits

In browser-local mode, notes are stored in LocalStorage and bound to real/DEMO mode, source, snapshot/archive, and work ID. Legacy v1 remains readable; v2 records do not delete the original. SessionStorage stores per-tab recovery drafts for notes and unfinished human-assessment metadata. Navigation/context changes and browser unload are guarded when edits are unsaved.

Tokens, inspection confirmations, retrieval choices, and publication consent are not restored. URLs with userinfo are rejected from draft persistence; do not store credentials, signed-access URLs, or document contents in text fields. Restoring a draft requires fresh inspection confirmation. **Lock private history** clears human-assessment recovery and private caches/selections.

Browser storage is not encrypted, shared across devices, or backed up remotely. Closing the tab may remove recovery data. If storage is full/blocked, save is marked as failed and the draft remains visible; an older copy may still exist. Per-item revision checks reject sequential stale saves, but simultaneous writes from multiple tabs are not transactional. These limits apply to local mode; the shared workspace uses separate server-side CAS/history. Drafts in both modes remain per-tab and unencrypted.

## 5. Record a human assessment without AI

After applying scope, open **Human assessment**:

1. Enter the exact claim, determination, and rationale explaining the decision.
2. Register up to 12 inspected references: HTTPS URL without credentials, page/record locator, date, and event/recipient/action/follow-up metadata where relevant. The source is bound to the form and validated by the API.
3. Use **Check reviewer approval** to see the category directory status; declare conflicts separately.
4. If desired, enter an expected SHA-256 and enable **Check public publisher references when saving** for supported publisher URLs. Follow-up can have its own URL/digest.
5. Enter an optional next evidence request, confirm source inspection, then save with a `review`-scoped token.

Manual assessment does not upload report contents or call a model. URL retrieval occurs only when explicitly selected. `retrieved`/`digest_matched` status proves the origin/bytes that were checked, not the truth of the contents. A digest mismatch blocks saving a supported/contradicted result; unknown/failed checks remain visible.

The reviewer determines the outcome independently of rules coverage. `supported` requires a reference type appropriate to the scope; `contradicted` requires a matching contrary record; `insufficient` can be saved without references. Conflicting evidence requires a clear human rationale.

Saving produces a **private schema 4** bundle with a parent hash, coverage result, reviewer assurance, reference-check status, and conflict declaration. A later revision does not overwrite an earlier one; a stale parent is rejected until the latest version is opened. Private history/digests require a `private_read` token and the current directory policy. The [configuration guide](../development/configuration.md) explains capability issuance and strict mode.

## 6. Review history and continue evidence requests

In **Saved audit history**, open an authorized revision. **Compare saved assessments** compares two revisions for the same source/claim/mode: determination, rationale, review, citations, scope, and dataset/document binding. Selecting a comparison does not replace the report currently open. A verdict/dataset change does not automatically prove an emissions change.

**Add saved request to follow-up** explicitly adds a saved request to the work draft with its audit ID/hash lineage. The source, mode, claim, scope, snapshot, and archive must match. Work status is unchanged; saving remains explicit. Fields that are already full are reported without overwriting existing text.

## 7. Export and share the appropriate result

| Output | Use |
|---|---|
| JSON audit report | Verification artifact; full human assessment is marked private with a `PRIVATE-…` filename |
| Markdown investigation brief | Readable summary/optional Notion import; omits private details and does not reproduce document quotations |
| Public transparency summary JSON | Allowlisted public artifact when consent is given for the revision; separate checksum |

**Download investigation brief** includes stored provenance, permitted historical context (up to 50 rows plus the total count), next checks, and limitations. Unavailable values remain unavailable. The brief can be edited and is not a certified report. There is no automatic Notion integration/publication or PDF generation.

JSON separates observation rows cited by the audit from `historicalContext`. If the loaded source/snapshot does not match the saved audit, context is not forced into the report. Verify JSON in **Reports → Verify an exported report** or Verification Center by selecting the downloaded file. **Require complete export context** is enabled by default and requires a context checksum in addition to the bundle hash. Legacy/raw files are checked only after this option is explicitly disabled; changing the option clears the result and asks you to select the file again. CLI alternative: `bun run verify:audit path/to/report.json --require-context`. The code helper remains compatible with raw/legacy by default; the UI passes the strict policy explicitly. Downloads made at different times may have different outer checksums; the bundle hash still identifies the same revision. The checksum is unsigned and is not proof of physical truth.

### Public transparency summary

When saving a human assessment, **I authorize a public redacted summary of this revision** is unchecked by default, resets after save, and is not restored from drafts. Consent permits a limited set of fields such as source/category/outcome/period, counts, historical assurance/conflict status, and bundle hash. The exact claim, recipient, reviewer identity, reference metadata, and rationale remain private.

The public can open **Reports → Public transparency summaries** without a token, browse pages, download, and verify the summary checksum. By default, the list selects the latest public revision per scope/claim; **Show publication history** opens older versions with superseded/withdrawn markers. A newly consented correction supersedes the prior active public version; private revisions do not change it. A reviewer who remains authorized can choose **Withdraw publication** with a predefined reason and confirmation. Old copies may remain available. Offline checksum verification does not prove current publication status; use **Check current publication status**. The [correction/withdrawal guide](../development/publication-lifecycle.md) explains steps, permissions, version conflicts, and limitations.

<a id="optional-document-ai"></a>

## Optional path: Document AI

This path is source-level; clear the bound scope before using it. Import a manifest for a PDF/TXT excerpt or a rights-cleared excerpt. The original file can remain local; the browser checks the manifest and document hash. Consent for external processing and a configured server provider/token are required before sending the excerpt.

The API validates exact quotations, can abstain, and creates a private schema 3 by default. An authorized reviewer can then approve, reject, or request more evidence as a separate revision. Full publication follows submitter/reviewer consent and schema 3 rules; manual-summary consent does not replace them. No independent AI benchmark or mitigation evidence is claimed from model output.

## Workflow limits

The API audit file store supports one local process and restart if the same file remains available; hosted temporary files may disappear. The API supports anchoring/reconciliation with durable intents; signing is disabled by default and requires server configuration. The Anvil profile has been tested locally; no public Sepolia receipt is available. The project has not established measured user benefit, physical repair, or emissions reductions caused by use of MethaneResponse. See [implementation status](../release/current-implementation-status.md).


## Decision examples and product-value evidence

[Three historical case studies](../research/three-historical-decision-cases-2026-10-18.md) connect facts, evidence gaps, decisions, and the next request. The [workflow enhancement and functional-comparison package](../evidence/product-value-2026-10-18/README.md) records browser checks and a manual comparator using the same data/tools. Agent results are not described as a human user pilot.
