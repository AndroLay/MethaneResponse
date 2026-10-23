# Running the application locally

[Documentation home](../README.md) · [Configuration](configuration.md) · [Testing](../testing/README.md)

Run all commands on this page from the repository root. The baseline uses bundled data and a local audit file; it does not require a cloud account, database, AI provider, or wallet.

## 1. Prerequisites

| Requirement | Version/reference | Required for |
|---|---|---|
| Bun | **1.4.2**, [.bun-version](../../.bun-version) | Workspace installation, web, API, TypeScript tests |
| Python | **3.11+**, [pyproject.toml](../../services/data-pipeline/pyproject.toml) | Pipeline and evaluation |
| `uv` | Lockfile [uv.lock](../../services/data-pipeline/uv.lock) | Reproducible Python environment |
| Foundry / `forge` | [foundry.toml](../../contracts/foundry.toml) | Solidity contract tests |
| Chromium | Playwright-managed browser or host executable | E2E journeys |

Bun is enough just to open the application. Internet access is needed for installation and map tile/imagery services; the basic historical dataset is included. The map has a fallback when imagery is unavailable.

## 2. Install and run

```bash
bun install --frozen-lockfile
```

In the first terminal:

```bash
bun run dev:api
```

In the second terminal:

```bash
bun run dev:web
```

| Address | Use |
|---|---|
| <http://localhost:5173> | Landing page and dashboard |
| <http://localhost:3001/api/health> | API/store/casebook readiness |
| <http://localhost:3001/api/intelligence/status> | Configured optional integrations |

Vite forwards `/api` to `http://localhost:3001`. If you change a port, align proxy and origin settings in the [configuration guide](configuration.md). The API binds to `0.0.0.0` by default; use `HOST=127.0.0.1` for a local-only bind.

## 3. Try the basic workflow

1. Open [Map Explorer / KAZ_S_159](http://localhost:5173/dashboard/map?sourceId=KAZ_S_159).
2. Inspect the snapshot, observation date, flux, and uncertainty. This is historical data.
3. Open Evidence Auditor, select the `mitigation_confirmed` claim, then choose **Run rules baseline**. The bundled data returns `insufficient_evidence` for this claim.
4. Open history/Reports, export JSON, and inspect it in Verification Center.
5. For an application export, use `bun run verify:audit path/to/report.json --require-context`. A raw legacy audit can still be checked without the flag, with a context-limit message. Unknown options are rejected. A matching export checksum does not authenticate the issuer or physical truth.

For scope, work notes, manual assessment, and transparency, continue to the [user workflow](../product/user-workflow.md).

## 4. Optional configuration

No `.env` file is required for the baseline. If settings are needed, copy [.env.example](../../.env.example) to `apps/api/.env` **only if the destination file does not already exist**. Bun loads the API environment when the command runs in that workspace. Do not replace existing local configuration.

Human assessment requires reviewer configuration on the server and a capability token. AI requires provider/token configuration and consent to document processing. Full settings are in [configuration.md](configuration.md). Chain writes require server opt-in, a checked target, and operation authorization; see the [P2 runbook](blockchain-recovery.md). The baseline does not require these.

## 5. Data and state in use

The API launcher requires Linux `flock` (util-linux); a second process using the same state path is rejected. All official API commands use the launcher.

- Browser data: snapshot/manifest in `apps/web/public/data/`.
- API data: casebook `data/real/mars_casebook_2026-10-15.json` and `data/processed/intelligence-snapshot.json`.
- New audits: default `data/state/audits.json`, created by the file store. Revisions remain available after a restart as long as the same file remains.
- Optional shared investigations: private `.case-work.json` and `.initialized` files beside `AUDIT_STORE_PATH`; a signed token/directory authority is required. The [runbook](shared-casework.md) explains setup, import, conflicts, and backup/restore.
- Local notes/preferences: this browser only; recovery drafts are per tab. Clearing browser data does not delete the server audit file, but it deletes browser notes.

Do not run multiple API writer processes on the same audit file. Importing a dataset through the browser does not replace the server dataset. Follow [provenance and rebuild](../../data/real/README.md) when developing the pipeline; onboarding does not require regenerating data.

## 6. Build and checks

```bash
bun run build:web
bun run check:web-bundle
```

The web build produces `apps/web/dist`. The build does not package the API as a running service. For behavior checks, use the appropriate commands in the [testing guide](../testing/README.md). Separate hosting is described in [deployment](../release/deployment.md).

## Common issues

| Symptom | Check |
|---|---|
| Port is in use or the URL opens on another port | Read the address reported by Vite/API; align `PORT`, proxy, and `WEB_ORIGIN` |
| Web app opens but `/api` requests fail | Confirm the API is running on the expected port and `METHANE_API_PROXY_TARGET` is correct |
| `/api/health` returns `503` | Check store/casebook/rate-limiter readiness fields, file paths, and read/write permissions |
| Insights/ranking return `503` | Confirm the intelligence artifact matches its input snapshot; do not delete the manifest to bypass the check |
| Imagery does not appear | Check tile-service/WebGL connectivity; historical data has separate limits from imagery |
| Human assessment or AI is disabled | Check `/api/intelligence/status` flags and optional configuration without sharing secrets |
| An imported-source audit is rejected | The browser dataset may differ from the snapshot pinned by the API |
| Browser tests do not start | Confirm Chromium is available and the environment permits local browser/process/port access; see [E2E](../testing/end-to-end.md) |
