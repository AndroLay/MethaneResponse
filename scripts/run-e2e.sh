#!/usr/bin/env bash
set -euo pipefail

exec bun --no-env-file scripts/run-e2e.ts "$@"
