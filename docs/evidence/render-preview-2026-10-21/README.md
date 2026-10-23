# Render Free preview — 21 October 2026

**Application:** https://methaneresponse-preview.onrender.com/dashboard

**State verified on this date:** live deployment `dep-dbbunbv4695c73eb958g`,
source `98b25ca0af1e3e2df7ca9084c1569db1b6712a1e`; one service named
`methaneresponse-preview` in Andro's workspace, Singapore, plan **Free**, branch
auto-deploy **off**. No database, paid disk or signer. Provider configuration is
stored in private backend environment variables. This dated record is not a claim
about the latest deployed revision.

[Verification](verification.json) ·
[Render dashboard](https://dashboard.render.com/web/srv-dbbumltg1s2s73e8cct0)

## Public-target evidence

- `/api/health` returned HTTP 200; the casebook and single-writer `flock` launcher
  were available. The preview explicitly reported `auditState: ephemeral`.
- Real Chromium 156 rendered Dashboard and Evidence Auditor. After basemap loading,
  the globe showed **4,218 sources** from **30,414 plume records**. Canvas was present
  and desktop viewport 1440 px had no horizontal overflow. This is not an FPS or
  physical-phone measurement.
- `/api/intelligence/status` reported the document model configured, in
  `server-side-document-assessment` mode.
- A project-authored DEMO excerpt submitted through the browser reached the real
  provider: HTTP 201, `insufficient_evidence`, one exact quotation,
  `deepseek-v4.1-flash-1017`, valid hash/envelope. One trial took approximately
  **3,248 ms** for assessment and UI response.
- Missing assessment token: HTTP 401. Unauthorized private-report read: HTTP 404.
  A valid token with an invalid body returned HTTP 400 before any model call on
  the final deployment. Configuration was available after rollout.
- No `pageerror` occurred in that journey. This does not certify every console
  message, external layer or application path.

Screenshots: [loaded globe](dashboard-ready-public.png) and
[DeepSeek DEMO assessment](deepseek-public.png). Their SHA-256 values are in the
summary. Local runner details remain in `delivery-output/render-2026-10-21/`.
The session token was cleared before capturing the assessment. Credential-bearing
traces were not recorded. DEMO text is not published as real mitigation evidence.

## Operation and limits

This is a restricted preview. Human review, private-report publication, signing
and blockchain writes are **disabled**. Anonymous baseline operations support
three curated sources; preview planning follows that scope. The map uses a bundled
historical snapshot.

JSON files under `/tmp` may disappear on sleep, restart or redeploy. Health field
`storage.persistent: true` identifies a file backend, not durable Render storage;
read `preview.auditState` and the UI banner. Download records that must survive.
Do not upload confidential documents.

MCP creation used the platform's default TCP health check because the creation
tool lacked an HTTP-health-check parameter. `/api/health` was checked directly;
`render.yaml` retains an HTTP check for future Blueprint deployment. Updating
environment variables through the connector may schedule deployment even with
branch auto-deploy off; inspect `list_deploys` before triggering another.

The user approved creating Free after being informed that workspace billing
controls could not be read. The service plan was verified as Free; **this is not
a workspace-wide zero-cost guarantee**. AI-provider usage has separate credit/cost.
See [Render Free limits](https://render.com/docs/free).

Rollback applies only to this service: suspend it or redeploy an approved revision.
Do not change Evidrilo, workspace plans or billing. No Sepolia funds were used.
Human pilots, physical-phone tests and independent model benchmarks remain pending.

## Source and CI recorded at the time

The verified runtime was `98b25ca`. Later documentation updates did not change it
because branch auto-deploy was off. Publishing this record needed no extra deploy.
At [run 39508503751](https://github.com/AndroLay/MethaneResponse/actions/runs/39508503751),
contracts and pipeline passed while JavaScript was still running when this record
was written. `verification.json` records that observation; it is not a full-CI pass.
