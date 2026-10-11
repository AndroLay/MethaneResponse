#!/usr/bin/env bash
set -euo pipefail
bun run test:api
bun run check
bun run build:web
(cd services/data-pipeline && uv run pytest)
(cd contracts && forge test)

