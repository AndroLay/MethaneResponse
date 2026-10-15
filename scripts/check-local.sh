#!/usr/bin/env bash
set -euo pipefail
# Discard obsolete database settings so they cannot leak into local tool subprocesses.
unset DATABASE_URL TEST_DATABASE_URL RATE_LIMIT_HASH_SECRET
baseline_output="${BASELINE_EVALUATION_OUTPUT:-}"
if [[ -n "$baseline_output" ]]; then
  if [[ "$baseline_output" != /* ]]; then baseline_output="$PWD/$baseline_output"; fi
  if [[ -e "$baseline_output" ]]; then
    printf 'Refusing to overwrite existing baseline report: %s\n' "$baseline_output" >&2
    exit 2
  fi
else
  baseline_output="$(mktemp "${TMPDIR:-/tmp}/methane-response-baseline.XXXXXX")"
fi
printf 'Baseline evaluation output: %s\n' "$baseline_output"
bun install --frozen-lockfile
bun run check
CI=true bun run test:api
bun run test:web
bun run test:verifier
bun run build:web
bun run check:web-bundle
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/methane-response-uv-cache}"
(
  cd services/data-pipeline
  uv run --locked --extra research pytest
  uv run python evaluate_baseline.py --output "$baseline_output"
)
cd contracts
forge test
