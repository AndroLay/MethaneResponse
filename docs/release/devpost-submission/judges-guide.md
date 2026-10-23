# MethaneResponse — judging guide

**Track:** Climate Data & Environmental Monitoring.

**Source:** https://github.com/AndroLay/MethaneResponse

## Current v18 walkthrough — 23 October 2026

The current local film is **v18, 4:57, 1080p/25fps**. Start with
[v18 delivery notes](../../demo/delivery-2026-10-22-final-v18/README.md),
[exact video verification](../../evidence/video-v18-2026-10-22/verification-summary.json)
and [take8 TKM proof](../../evidence/video-v17-2026-10-22/README.md).
The active attachment is `MethaneResponse-Devpost-Judging-Pack-v18.zip`;
older v12/v16 attachments remain historical, not substitutes for this film.

> The demo shows the full local prototype. The public preview is limited to
> selected sources and excludes private review and blockchain writes.

| Film time | Inspect | Evidence boundary |
|---|---|---|
| 00:00–00:43 | Thousands of observations, ten investigations; MARS versus MethaneResponse | Detection starts inquiry; it does not establish repair |
| 00:43–01:39 | Historical TKM source; compare capacity 10→20 and explicit activation | 4,218 source rows, 30,414 total plume rows; planner uses 23,861 linked records |
| 01:39–02:05 | TKM evidence assessment and claim scope | `mitigation_confirmed` is the question; insufficient evidence is the result |
| 02:05–02:33 | Separate archived DeepSeek KAZ_S_159 excerpt and exact quote | Project-authored DEMO; not a TKM inference or independent AI benchmark |
| 02:33–03:04 | Missing evidence → request dated measurements, methods and uncertainty → record decision | Request and reviewer are software DEMO; no operator is contacted |
| 03:04–03:27 | New response opens review; earlier decision remains | Append-only software history, not field verification |
| 03:27–04:06 | Original → altered/rehashed → restored → after restart | Same take8 export and Anvil local receipt, chain 31337; not Sepolia |
| 04:06–04:23 | Observations → priorities/requests → field action → comparable measurements | Last two stages are potential deployment, not measured outcomes |
| 04:23–04:57 | Three outputs, evaluation limitations and links | No measured human productivity or emissions benefit |

The primary source is **TKM_S_021**. Its decision revision 1 is
`request_more_evidence`; the trusted take8 digest is
`0xcab36a271a000facd92cefbbfb902b314cce70eed565a9471ca6b263b5353ec2`.
Use the explicit read-only replay command in the proof README. Do not use the
older v16 take2 digest. This replay restores project-supplied local state and
sends no transaction. It does not establish independent issuer identity.

GitHub, public preview, uploaded video and Devpost submission are separate states;
see `publication-status-2026-10-23.json` for the current observation and
`access-status.json` for the earlier baseline. The entry now has a registered
[YouTube video](https://youtu.be/_YzYe921q6g). Frozen r12 stays **0/48** task
completion according to its frozen scorer. Full listening and normal-speed
playback remain unreviewed; video regression tests do not establish usability.

## Historical v12 walkthrough (19 October)

The steps below refer to the **historical v12 attachment**. Its example paths
are not included in the current v18 ZIP. For current reproducible checks, use
the take8 TKM export, trusted digest and replay command above.

1. Open **Cases**, search `KAZ_S_159`, and inspect the source, original identifiers,
   dated estimates, uncertainty, and reference link.
2. Open **Evidence Auditor** with that source. Choose the mitigation claim, select
   the 11 July 2026 observation day, and explicitly **Apply** its UTC-day scope.
3. Run the **rules baseline**. Expect **Insufficient Reference Coverage** for the
   submitted material, not a finding that UNEP is wrong or that a repair failed.
4. Record an evidence request: the exact action date and attributable follow-up
   evidence. In the public/local demo this is saved in the browser; it does not
   contact an operator.
5. Export the report and open **Reports**. Keep **Require complete export context**
   enabled. Load `evidence/original-report.json`: the bundle digest and export
   context checks match.
6. Load `evidence/changed-report.json`: the controlled changed reason is detected.
   Reopen the untouched original: checks match again.

The included example files come from the actual local demo session. The changed
file is an intentionally altered test copy, not another scientific observation.
One audit reason changes in both the bundle and its display projection. Its
export-context checksum is recalculated while the stored bundle hash is retained;
the bundle-digest check rejects the changed content.

## Current connected-investigation workflow (local private workspace)

The v18 walkthrough above is current; the v12 walkthrough is retained as a dated example.
The current repository also supports this journey; it is deliberately unavailable
in anonymous public-preview mode because it includes private working records:

1. In **Cases → Plan investigation capacity**, compare capacity 10 and 20 with
   identical region/quota assumptions. Explicitly activate a plan; map rings and
   the paginated queue use the same source IDs.
2. A configured software DEMO reviewer accepts a plan revision, opens a selected
   source, scopes the claim, and saves an attributable evidence request.
3. Attach document metadata only with permission. Record response date precision,
   original-file hash and acceptance criteria; acceptance is separate from a
   physical mitigation finding. Human assessment needs no model credential.
4. **Check related claims & reused evidence** identifies candidates from saved
   investigations visible to that reviewer. Explain legitimate reuse or a need
   for investigation, then save the interpretation into revision history.
5. Review and freeze the exact dossier. Export the decision and use a separately
   trusted digest for CLI replay. Later responses recommend reconsideration while
   the original decision remains immutable. Real contract integration is tested
   on disposable local Anvil; no public Sepolia receipt is claimed.
6. Opt-in snapshot intake stages a later official release and a full record diff.
   It does not silently activate it or rewrite old investigation snapshots.

See `docs/development/connected-investigations.md` and
`docs/development/evidence-overlap-and-snapshot-intake.md` for configuration,
permissions, standalone verification and precise limitations. The latest local
check package is `docs/evidence/release-sync-2026-10-23/`; older screenshots are actual
browser captures of software DEMO review on real historical source metadata.
A DEMO reviewer is not a recruited human participant or domain expert.

## Run locally

Clone the repository, use the repository-pinned Bun release, then run:

```sh
bun install --frozen-lockfile
bun run dev:api
```

In a second terminal:

```sh
bun run dev:web
```

Open http://localhost:5173. The historical rules workflow needs no model API key
or blockchain payment. See the repository's `docs/development/local-setup.md`
for the environment and optional tooling. Foundry/Anvil is required to repeat
contract tests; Python/uv is required for the offline pipeline.

## Evidence and boundaries

| Area | Available evidence | Boundary |
|---|---|---|
| Historical data | Snapshot `unep-mars-675417694883`; 4,218 source rows, 30,414 plume rows | Historical and discrete, not live monitoring |
| Application | UI/API workflow, case studies, immutable audit and scoped review implementations | An implementation is not proof of a physical repair |
| Verification | Real original/changed/original file checks; Anvil deployment/anchor/recovery evidence in repo | No public Sepolia receipt in this package; hashes do not authenticate the issuer |
| AI | Optional provider integration, exact quote checks, abstention and human review controls | Recorded live DeepSeek DEMO smoke integration; no independently established accuracy; agent experiments are simulations |
| Tests | October 18 package: 716 historical tests; see the separate October 20 evidence package for current results | Each run is bound to its recorded source bytes; none establishes a remote deployment |
| Video | Local export: 297 s; actual UI footage, synthetic male narration, English captions and original score; registered YouTube URL | 18 technical checks + 34 video regressions apply to local bytes; hosted-cut comparison and full playback/listening remain separate |
| Storage | Browser-local notes and single-writer JSON API storage | Temporary hosting state is not durable; no multi-instance guarantee |
| Impact | Concrete traceability and missing-evidence workflow | User time savings and climate outcomes remain unmeasured |

AI-assisted development/review and synthetic narration are disclosed. No expert
endorsement, human pilot, live methane prediction, or emissions reduction is
claimed. Investigation-priority heuristics are decision support, not calibrated
probabilities of a future leak.

## Source rights

Original software/documentation: MIT. MARS data: attributed CC BY-NC-SA 4.0.
Linked report material retains its own license; no report body is redistributed.
Actual map screenshots retain visible provider credits. See `LICENSE.txt`,
`THIRD-PARTY-NOTICE.txt` and `source-links.md` in the attachment.

Checksums detect changes relative to the listed files. A checksum file in the
same attachment is not a signature or a trusted assertion of issuer identity.
