#!/usr/bin/env bash
set -euo pipefail
bun install --frozen-lockfile
bun run check
bun run test:api
bun run test:web
bun run test:verifier
bun run build:web
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/methane-response-uv-cache}"
(
  cd services/data-pipeline
  uv run pytest
  uv run python evaluate_baseline.py --output reports/baseline-evaluation.json
)
cd contracts
forge test

