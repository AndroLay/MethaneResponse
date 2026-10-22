#!/usr/bin/env bash
set -euo pipefail

expected_profile='codex-cli-gpt-6-luna-max'
expected_token_cap='100000000'
if [[ -n "${AGENT_LAB_PROFILE:-}" && "$AGENT_LAB_PROFILE" != "$expected_profile" ]]; then
  echo 'AGENT_LAB_PROFILE conflicts with the Luna Max runner.' >&2
  exit 2
fi
if [[ -n "${AGENT_LAB_TOKEN_CAP:-}" && "$AGENT_LAB_TOKEN_CAP" != "$expected_token_cap" ]]; then
  echo 'AGENT_LAB_TOKEN_CAP conflicts with the frozen r11 continuation cap.' >&2
  exit 2
fi
if [[ -n "${AGENT_LAB_CONTINUE_FROM_REVISION:-}" && "$AGENT_LAB_CONTINUE_FROM_REVISION" != 'r10' ]]; then
  echo 'AGENT_LAB_CONTINUE_FROM_REVISION conflicts with the frozen r10 parent.' >&2
  exit 2
fi

version_line="$(codex --version 2>/dev/null)" || {
  echo 'Codex CLI is unavailable or its signed-in account cannot be read.' >&2
  exit 2
}
if [[ "$version_line" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
  export AGENT_LAB_CODEX_VERSION="${BASH_REMATCH[1]}"
else
  echo 'Could not identify the installed Codex CLI version.' >&2
  exit 2
fi

export AGENT_LAB_PROFILE="$expected_profile"
export AGENT_LAB_TOKEN_CAP="$expected_token_cap"
export AGENT_LAB_CONTINUE_FROM_REVISION='r10'
if [[ -z "${TMPDIR:-}" && -d /dev/shm ]]; then export TMPDIR=/dev/shm; fi
if [[ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" && -x /usr/bin/chromium ]]; then export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium; fi

exec bun --no-env-file run agent-lab:all
