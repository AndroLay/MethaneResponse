# Luna Handoff — Preview, Presentation, and Demo

**Checkpoint:** 18 October 2026 · **Status:** delivery preparation; no new deployment or video yet.

This document continues work in the same working tree. Its purpose is to avoid rereading, preserve decisions, and give Luna concrete work. Read `AGENTS.md` first; if repository evidence changes, update the affected assumptions.

## 1. User requests and approvals

Requested outcomes:

1. An application preview judges can open, using Render and a no-cost option first.
2. Professional English presentation materials for the submission and demo.
3. A demo video of **exactly 4:00 / 240 seconds**, with **English text and original instrumental music**, and no voice-over in this version.

**User decision change, 19 October 2026:** importing a ZIP into Notion and publishing a Notion page are removed from the delivery target. Local presentation materials may still be used for Devpost or review; do not make Notion publication a blocker.

The user selected Render **“Andro's workspace”** and asked to prepare a free option first. Workspace selection is approved and does not need to be asked again. This approval does not identify the commit to publish or authorize a paid plan. Prepare inspectable local results before requesting approval for any external action not already covered.

The user has authorized adding and running tests. P4 human review is deferred; do not reintroduce experts/human pilot as prerequisites for this material. Local implementation choices are authorized. Do not change the user's model/account configuration or start paid work.

## 2. Checkout state — preserve work

- Repo: `/home/andro/dev/projects/Devpost/iEEE-Methane-response`.
- Local branch: `main`; HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041`.
- Remote: `https://github.com/AndroLay/MethaneResponse.git`.
- Before this document was created there were **206 changed/untracked paths**. Most recent features were in the working tree, not HEAD. This is a checkpoint count, not a number that must remain fixed.
- Local `origin/main` reference matched HEAD when checked; it was not refreshed from remote during delivery preparation.
- Do not reset, clean, overwrite via checkout, stash, commit the entire working tree, or push automatically. Do not deploy an old `main` and call it the latest version.
- Prepare a list of sources that will actually be published; do not upload `.env`, private state, signer, token, third-party archives without rights, or sensitive logs. Source publication requires a clear target.
- No code/delivery configuration changed during the preparation session before this handoff. Two agents provided read-only design review only.

## 3. System map and accomplishments

| Area | Main location / state |
|---|---|
| UI | `apps/web`: React, TypeScript, Vite; historical map, Cases, Evidence Auditor, Reports, verifier, casework |
| API | `apps/api`: Bun/Hono; rules, immutable audits, reviewer authorization, shared casework, publication, chain intents |
| Kontrak data | `packages/shared`: schema, claim/evidence semantics, DEMO fixtures |
| Data/research | `data/real`, `services/data-pipeline`: snapshot/provenance, Python evaluation; real data is separate from DEMO |
| Blockchain | `contracts`, API chain adapter; local Anvil tested, public Sepolia not tested |
| Storage | Atomic JSON, one writer, Linux `flock`; intentionally no database, not multi-instance |

Product workflow: select a historical source → define claim and date/event → check reference coverage → rules baseline or authorized review → record follow-up → revise/export → verify integrity. Publishing a summary requires consent and authorization; the full human assessment remains private.

| Package | Outcomes that may be claimed | Limits that still apply |
|---|---|---|
| P1 | Shared casework, CAS/history, one-writer lock, backup/restore, and local crash recovery | No remote persistent volume |
| P2 | Deploy/anchor/recovery and verifier actually run on Anvil 31337 | No public Sepolia deployment or receipt; do not retry a faucet without new information |
| P3 | Consent, correction/supersession/withdrawal, public summary, and private local audit | External publication not demonstrated |
| P4 | Engineering/research remediation and review-ready package | No human experts; deferred by the user |
| P5/P6 | Agent simulation and analysis complete, findings addressed | Not a human pilot or provider benchmark; AI has not been shown to outperform rules |
| Latest strengthening | UTC day/period presets, explicit Apply, draft recovery, baseline held while a draft exists, verifier in Reports with required export context | Does not turn historical data into proof of physical repair |

**Latest recorded evidence:** `docs/evidence/product-value-2026-10-18/verification.json`: full local gate exit 0, **716 tests** (193 API + 253 web + 54 tooling + 212 Python + 4 Foundry), build/bundle passed, App 71,724 gzip bytes. Four focused Chromium scenarios passed with the sandbox active, desktop 1600×1000 and mobile viewport 390×844. This is earlier-run evidence on frozen source, not a new test of delivery changes that have not yet been made.

Comparison on 16 tasks: app 16/16; raw manual 11/16 because five boolean/enum format differences were unspecified in the prompt. After a post-hoc declared format mapping, manual was 16/16: **decision parity**, not an app accuracy win. Earlier P5 results also showed no agent time savings. Do not claim human/AI superiority, emissions impact, or a judge score from this.

Earlier evidence packages are frozen. Do not overwrite their results or checksums. Create a new delivery evidence directory for subsequent changes. The internal target of 18/20 is not a judge-awarded score.

## 4. Sufficient initial reading

Read in order; do not open every document, every log, or the full chat history:

1. `AGENTS.md` and this document.
2. `docs/repository-map.md`, then `docs/architecture/overview.md` for structure and decisions.
3. `docs/product/user-workflow.md` for the user workflow.
4. `docs/evidence/product-value-2026-10-18/README.md` and `verification.json` for the latest results.
5. `docs/release/deployment.md`, `render.yaml`, and `scripts/deployment-config.test.ts` for deployment work.
6. `docs/research/three-historical-decision-cases-2026-10-18.md` for the story and factual limits.
7. `docs/demo/README.md` and `docs/demo/notion/README.md` for older materials that may need updates.

Use `docs/release/current-implementation-status.md` and its linked ADRs for P1–P6 details if needed; there is no need to rerun old experiments to start delivery. For implementation, open only relevant code paths.

## 5. Render findings already checked

Selected workspace: `tea-d3akn7ruibrs73ccv4ig` (**Andro's workspace**). The Render connector is available. `list_services` was read after the user selected the workspace. **There is no MethaneResponse service**; existing services belong to another project. Do not modify Evidrilo services.

Current `render.yaml`:

- API only; `runtime: node`, Bun 1.4.2, frozen install, `cd apps/api && bun run start`, health `/api/health`.
- `plan: free` is not set; do not rely on the default plan.
- `AUDIT_STORE_PATH=/tmp/methane-response-audits.json`; bersifat sementara.
- Does not build or serve the production frontend.
- Launcher `scripts/start-api.ts` uses util-linux `flock`; the remote target must provide it.
- UI uses relative `/api` and `/data` URLs; the Vite proxy is for development only.
- In `apps/api/src/app.ts`, the `POST /api/audits` handler rejects baseline requests without admin access when `NODE_ENV=production`, unless `ENABLE_PUBLIC_BASELINE_AUDITS=true`. Simply publishing the old config would therefore break the main flow.

**Design direction recommended by review:** one Render web service with `plan: free` that builds Vite and serves web + API from the same origin. This is a recommendation, **not yet implemented**. A two-service alternative requires a frontend build-time API URL and correct CORS origin.

Minimum implementation contract:

- `/api/*` remains API; unknown API routes must not receive SPA HTML.
- Static root is only `apps/web/dist`; support dashboard deep links, assets, favicon, and snapshot. Reject traversal, dotfiles, repository/state access, and symlinks escaping the root.
- Preserve `.gz` bytes that the browser verifies by hash; do not set `Content-Encoding` incorrectly and cause double decompression.
- Prepare a restricted baseline-preview mode. Do not simply open all public writes with a broad flag. Options discussed: three historical cases KAZ/LBY/CAN, reject private recipient/input, impose limits and capacity, and use a separate preview-state directory.
- Do not configure the AI provider, private reviewer, shared-team authority, or signer on the public preview. Ensure none are inherited from the local environment; use the existing runner-isolation pattern.
- Show relevant preview limits: historical data, temporary server state, downloadable reports, and no confidential documents. Do not call it durable or production-ready hosting.

Official sources read on 18 October: [Render Free](https://render.com/docs/free), [Bun version](https://render.com/docs/bun-version), [Blueprint spec](https://render.com/docs/blueprint-spec). A Free service may sleep after 15 minutes; files are lost on sleep/restart/redeploy, and there is no persistent disk. Free-hour quotas are shared per workspace. Bandwidth/pipeline can incur overage if there is a payment method; `plan: free` alone does not guarantee all usage is free. Confirm available usage/spend limits before mutation; do not change another project's billing.

Do not create a service until safe current source, configuration, target, cost limit, and rollback can be inspected. The user asked only for a **free option first**. For actions that require approval, show a concrete package and request only approval that is still missing; do not ask again about the workspace.

## 6. Demo story selected in review

Agent narrative recommendation: **KAZ_S_159, Kazakhstan, Oil and Gas**. Libya is simpler but has only one observation; Canada can invite unmeasured avoided-tonnage claims. KAZ has three observations and a clear timing question.

- Snapshot `unep-mars-675417694883` is historical, not a live feed.
- Tiga observasi KAZ: 7 Juni 2024 (591 ± 335 kg/h), 5 Juni 2026 (307 ± 66), 11 Juli 2026 (496 ± 226), EnMAP.
- Notification/feedback are administrative activity, not proof of repair.
- The UNEP catalog attributes an action to July 2026; its exact date/time is unknown. Do not describe the 11 July plume as a post-action measurement.
- `source_detected` may have required references; an app-entered `mitigation_confirmed` result remains insufficient evidence. This reflects the supplied metadata scope, not a rebuttal of the UNEP report or proof that repair failed.

| Time | Action and visual evidence |
|---|---|
| 0:00–0:18 | Hook: “Feedback: Yes. What does the evidence establish?” |
| 0:18–0:45 | KAZ source, historical snapshot, notification/feedback |
| 0:45–1:15 | Tiga observasi; jelaskan ketidakpastian waktu aksi Juli |
| 1:15–1:40 | Preset periode/event UTC, status draft, lalu Apply |
| 1:40–2:15 | Baseline: source detection references present; mitigation insufficient |
| 2:15–2:40 | Casework: request the action date and a related post-action measurement; this is not a real external assignment |
| 2:40–3:00 | Export JSON from the actual result |
| 3:00–3:22 | Reports: original file passes digest and export-context checksum |
| 3:22–3:42 | Select the copy that was actually modified; show rejection |
| 3:42–4:00 | Close with traceability and follow-up value, and limits of integrity/physical-outcome claims |

This is a 240-second outline, not a completed recording. The selected scope/event must be consistent across both baselines and the report. The tamper step must explain which field changed and which check rejected it. A hash without a trusted commitment can be recomputed; it is not proof of issuer identity or physical truth. Do not show a nonexistent Sepolia receipt or imply that AI is in use.

## 7. Execution requested from Luna

Work in order and report brief checkpoints. Use one writer; delegate only genuinely useful independent work. Do not recreate a swarm for discovery that is already complete.

### A. Packaging and local gate

1. Confirm only checkout state and relevant files; make a concise plan from the findings above.
2. Implement a safe preview profile with regressions. Follow triggered skills; tests are authorized.
3. Test the production build through one origin: health, root/deep link, verified asset/snapshot, baseline for the three allowed cases, export/verifier, rejection of private paths/operations, and limits.
4. Record exact source binding, minimal logs, actual UI images, local/remote status, and rollback. Run checks proportionate to the change; run the full gate if the risk requires it. Do not report 716 as a new-change result without rerunning it.

### B. Presentation materials for submission

1. Keep the existing story v4 materials as local documents for Devpost and review; no need to create an import package for another platform.
2. Maintain one claim ledger for presentation, script, captions, and video: problem → one case → action → result → differentiation → demonstrated benefit and limits → next step.
3. Preserve source attribution, Q&A, Indonesian runbook, and actual screenshots. Do not describe local materials as a public page or submitted entry.

### C. 240-second video production

1. Read the `product-studio:product-video-production` skill; create a motion storyboard and shot list. Record the latest real UI using disposable state, with no credentials or unnecessary external requests.
2. Build the hardest short sequence first (UI action → result → verification/tamper), check readability, then expand it to 240 seconds.
3. Local tools available: ffmpeg/ffprobe, Chromium, Bun/Node, PIL/Cairo/NumPy. Remotion/TTS are not available and are not needed for this text + music format. Do not implicitly install large/paid dependencies.
4. Create original instrumental music; do not use unlicensed music. English captions must remain readable long enough and follow the footage. Show actual interaction; avoid a 240-second static slideshow that only changes titles.
5. Export MP4 at 1920×1080, H.264/yuv420p, target 30 fps, duration 240 seconds; include SRT, script, and source/render instructions. Store large media in a separate local output, outside the source to be pushed.
6. Use `product-studio:video-quality-review`: ffprobe, full decode, digest, frame/transition checks, and playback/audio if available. If full listening/viewing is not possible, state QA limits honestly; a successful render alone is not a final artistic review.

### D. Approved publication and closure

1. Once there is a concrete package, request only any still-needed approval for external mutation: exact source publication/branch, creating a free Render service, or publishing a page/video. Do not contact anyone or submit to Devpost automatically.
2. If approved, deploy the exact reviewed source. Verify HTTPS and the workflow from the public URL; local/tunnel results do not replace remote verification. Record service ID, deploy ID, commit, URL, time, and rollback.
3. Provide actual links/outputs and separate statuses: local code, remote preview, local presentation materials, local MP4, uploaded video. Defer only parts that need unavailable access/approval; complete the rest of the work.

## 8. Commands and practical evidence

Start without changing state:

```bash
pwd
git status --short
git rev-parse HEAD
```

Existing main checks (select according to changes; do not run everything merely to read the handoff):

```bash
bun run check
bun test scripts/deployment-config.test.ts
bun run build:web
bun run check:web-bundle
bun run check:all
```

Focused browser test:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep 'scope presets and report verification'
```

The browser uses the active Chromium sandbox; do not disable it to work around filesystem-sandbox socket restrictions. If needed, use the appropriate approval tool. The E2E runner already filters environment and state; read `scripts/e2e-runner-utils.ts`, `scripts/run-e2e.ts`, and `playwright.config.ts` before creating a new capture runner. Do not read or print `.env` files containing secrets.

The 716-test package is at `docs/evidence/product-value-2026-10-18/`; the P5/P6 agent package and integration simulation remain historical. Links, manifests, checksums, and ZIPs can be inspected without rerunning the full suite.

The event rules last read on 18 October: [Rules](https://ieee-climatechain-hack.devpost.com/rules) require a 3–5 minute video, repository, and track alignment; four minutes is within range. The Overview shows a 25 October deadline at 17:00 UTC+3 / 22:00 WITA; the internal target remains before 21 October. Rules/Overview eligibility is not aligned and has not been resolved. `docs/release/event-requirements.md` still contains notes from 16 October; do not present an old time conflict as a current page fact without refreshing it.

## 9. Persistent limits

Feedback ≠ repair. No later plume ≠ zero methane. Receipt ≠ physical truth. Rules ≠ document authentication. Agent simulation ≠ human expert/pilot. Static screenshot ≠ verified remote feature. Local materials ≠ submitted entry. Local MP4 ≠ uploaded video. Do not automatically raise internal scores because features, tests, or presentations are complete.

**Start with A.** This handoff does not require reassessing the entire product or P1–P6. Complete the agreed delivery while keeping evidence and cost limits clear.
