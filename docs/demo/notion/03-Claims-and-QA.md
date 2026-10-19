# Evidence ledger and judge Q&A

**Purpose:** keep every presentation claim within its evidence boundary.

Baseline: `a82e2eee99bb79327f859f304f2f5d5939f07041`. The presentation is an English-facing narrative; operator and readiness notes are in Bahasa Indonesia. This package does not report external DeepThink validation.

## Claim ledger

| Statement | Evidence / status | Boundary |
|---|---|---|
| KAZ_S_159 has three linked observations; latest 496 ± 226 kg/h on 11 July 2026 | Active MARS casebook and browser observation table | Discrete historical estimates, not current or continuous emissions |
| The selected source records notification and feedback | Source-level publisher metadata | Administrative activity, not independent notification evidence or repair proof |
| Source-detection claim returns supported | Deterministic baseline on this supplied bundle | A required evidence reference is present; not a scientific certification |
| Mitigation-confirmation claim returns insufficient evidence | Same source and supplied evidence; rules require another evidence type | Does not assert failed mitigation; linked report content was not assessed |
| Exported bundle matches its stored digest | Browser Verification Center, unchanged JSON | Local SHA-256 consistency, no signature or chain receipt |
| Inconsistent report copy is rejected | Change only bundle reason; keep the summary unchanged | Fails the summary/bundle consistency check before digest comparison; no isolated hash-mismatch claim |
| Workflow can improve review traceability | Demonstrated source-to-export interaction | Time savings and user usefulness need independent measurement |
| AI and human-review paths exist | Backend/UI implementation and recorded deterministic/mock tests | No live-provider quality or independent AI benchmark claimed |
| Blockchain code exists | Contract and receipt-checking implementation | Current local-file API anchoring is inactive; this demo has no chain transaction |
| Archive recurrence model exists | Separate retrospective logistic model and prospective pending ledger | Predicts a later explicitly linked archive record, not a physical leak; excluded from the main demo |
| A target-user pilot is prepared | Protocol and blank record template | No participants, measured savings or emissions outcomes yet |

Browser-capture results and asset checks are recorded in the package README and adjacent `capture-manifest.json`. Read that status before describing screenshots as verified. Prior full-suite checks are dated evidence, not a new full-suite run for these documents.

## Questions a judge may ask

**Why not just use the MARS website?**

The prototype adds a claim-specific assessment and a portable record of its reasoning. It does not replace the publisher, improve satellite measurement accuracy or establish that users prefer this workflow. That comparison belongs in the pilot.

**Why is mitigation insufficient if the official report says confirmed mitigation?**

The package preserves the report link and its title. It does not include the report text in the assessed bundle. The baseline evaluates supplied evidence types, not all knowledge about the site. This is an evidence-coverage limitation, not a finding against the publisher's report.

**What does supported mean?**

Within the deterministic rules baseline, the required evidence type is present and no configured conflict blocks support. It is neither independent scientific adjudication nor a site-wide certification.

**Where is the AI?**

An optional document-analysis path can produce bounded, quote-linked output for human review. The core demonstration uses rules. A live-provider quality claim requires rights-cleared documents, independent annotations and comparison with the same baseline cases. Mock workflow success does not establish model accuracy.

**Where is the blockchain?**

Contract and receipt-verification code remain available. API anchoring is inactive with the accepted local file store. The menu called Blockchain contains the local Verification Center used here; its label does not mean a transaction occurred. Any future receipt would prove record integrity and chronology, not physical mitigation.

**Can a person alter the record and recompute the hash?**

Yes. An unkeyed SHA-256 digest is not a signature. The shown rejection detects disagreement between the summary and the changed bundle, before comparing digests. It does not authenticate an issuer. The unchanged report separately passes a canonical bundle digest check. Also distinguish that digest from the outer export-file checksum.

**Are the data real? Are they live?**

The walkthrough uses attributed historical UNEP MARS source/plume records. Synthetic fixtures elsewhere in the repo remain labeled DEMO. The selected archive ends on 13 September 2026; it is not a live feed.

**Does the model predict methane emissions?**

No. A separate trained logistic artifact estimates later explicitly linked archive-record recurrence within 365 days. Development inspected the retrospective holdout; prospective outcomes are pending. Neither a low score nor a missing later record means zero methane. This model is outside the main story.

**Why no database?**

The accepted prototype scope uses versioned public files and an atomic local JSON audit store in one process. It supports a bounded local demonstration. Shared hosted durability and multi-instance writes are not established; the optional preview filesystem is ephemeral.

**What is the climate impact?**

The intended contribution is clearer evidence review and follow-up. The demo establishes a workflow, not tonnes avoided, repaired equipment or causal emissions reduction.

**What will you measure next?**

The prepared pilot targets 5–8 relevant participants. Predefined tasks include interpreting evidence, recognizing insufficient support and verifying reports. Acceptance requires at least `ceil(0.8 × n)` participants on each specified task without substantive help and no critical misunderstanding. Actual recruitment and results remain outstanding.

## Professional presentation choices

- One source and one central question; no globe tour or dashboard inventory.
- Comparison of detection and mitigation is the main reveal.
- Export and verification make the result inspectable beyond the UI.
- MARS Indicators supports breadth in the appendix; AI, model and contracts are Q&A topics.
- No invented savings, judge score, market validation, user quote or emissions impact.

Two independent repository reviewers assessed narrative and claim evidence. Their recommendations were incorporated. No external ChatGPT Web / DeepThink session was performed because that capability is unavailable in this session.

## Competition framing

Suggested track: **Climate Data & Environmental Monitoring**, subject to the participant's submission choice. This is a recommendation, not evidence of a selected track in Devpost.

| Published criterion | What to show | What remains unproven |
|---|---|---|
| Climate Impact | Evidence gaps that can guide follow-up | Measured climate outcomes |
| Innovation & Creativity | Claim strength changes with required evidence | Comparative originality or user preference |
| Technical Execution | Real source → deterministic assessment → export → verification | Live AI benchmark, live chain anchoring |
| Practical Usefulness | Reproducible local review and a prepared pilot | Adoption, time savings, hosted durability |
| Presentation & Communication | One case, clear reveal, short conclusion | Final video and audience rehearsal |

The official pages list qualitative criteria without numerical weights. The 3–5 minute video requirement is the basis of the 4:30 rehearsal target. Eligibility and submission-hour conflicts remain unresolved; see [official overview](https://ieee-climatechain-hack.devpost.com/) and [rules](https://ieee-climatechain-hack.devpost.com/rules). No organizer has been contacted or submission sent by this preparation step.

## Source and rights notes

- UNEP IMEO Eye on Methane / MARS source/plume data: CC BY-NC-SA 4.0; provenance and transformations remain recorded in the repository.
- Linked KAZ/LBY/CAN report metadata identifies CC BY-NC-ND 3.0 IGO; ARG report permissions remain unconfirmed. Full report text, figures and tables are excluded.
- Source/UI captures preserve provenance labels. External basemap requests are blocked; no third-party satellite imagery or report pages are included.
- Software license and dataset/report licenses are distinct. Do not infer unrestricted commercial dataset rights from the code's MIT license.
