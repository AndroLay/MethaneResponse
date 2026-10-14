#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TMPDIR:-}" && -d /dev/shm && -w /dev/shm ]]; then
  export TMPDIR=/dev/shm
fi

exec playwright test "$@"
