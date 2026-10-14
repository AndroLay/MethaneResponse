#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
  printf 'Refusing the complete local gate: set TEST_DATABASE_URL to a disposable PostGIS database. Without it, PostgreSQL integration tests could be skipped.\n' >&2
  exit 2
fi
if [[ -n "${DATABASE_URL:-}" && "${TEST_DATABASE_URL//[[:space:]]/}" == "${DATABASE_URL//[[:space:]]/}" ]]; then
  printf 'Refusing the complete local gate: TEST_DATABASE_URL must be different from DATABASE_URL. Use a disposable test database.\n' >&2
  exit 2
fi
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

