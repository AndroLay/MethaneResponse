# MethaneResponse — judging guide

**Track:** Climate Data & Environmental Monitoring.

**Source:** https://github.com/AndroLay/MethaneResponse

The live prototype and embedded-video addresses must be added to the Devpost
form after upload/deployment and public access checks. This local package does
not establish that either URL is already published.

## What to inspect

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
| AI | Optional provider integration, exact quote checks, abstention and human review controls | No independently established live-provider quality; agent experiments are simulations |
| Tests | October 18 frozen package: 716 tests; four focused browser scenarios, build/bundle checks | Bound to that source revision, not a fresh test of a future public deployment |
| Video | v12: 267.92 s; actual retained UI capture, English synthetic narration and original score | Local export; full human audiovisual review and upload/access remain separate |
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
