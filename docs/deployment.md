# Deployment: Cloudflare Pages + Render (not yet deployed)

## Render API

Deploy `render.yaml` as a Render Blueprint or create a native Node runtime web service with Bun available. Use repo root, `bun install`, and `cd apps/api && bun run start`. `/api/health` is the health check. The `.bun-version` file pins the expected Bun version; update after testing a newer version.

Configure `WEB_ORIGIN` to the exact Cloudflare Pages origin (e.g., `https://methane-response.pages.dev`, no slash), not `*`. Never expose `ADMIN_API_TOKEN` or signer keys to the frontend.

## Cloudflare Pages SPA

From repo root, install Bun dependencies and run `bun run build:web`; set output directory to `apps/web/dist`. Configure `VITE_API_BASE_URL` to the full Render API origin, e.g. `https://methane-response-api.onrender.com` (no `/api`). This URL is public configuration, not a secret.

Local dev omits `VITE_API_BASE_URL` and uses Vite's `/api` proxy. Production **requires** it because the React app and API run on separate origins.

Before submitting: confirm API CORS, no cold-start interruptions during judging, the demo map tiles load, and that Sepolia receipts can be independently verified. Current in-memory audit storage must be replaced before production.
