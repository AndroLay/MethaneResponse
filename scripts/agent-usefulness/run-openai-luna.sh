#!/usr/bin/env bash
set -euo pipefail

export AGENT_LAB_PROFILE='openai-gpt-6-luna'
export AGENT_LAB_ALLOW_REMOTE='1'
if [[ -z "${AGENT_LAB_API_KEY:-}" ]]; then
  read -r -s -p 'OpenAI Platform API key: ' AGENT_LAB_API_KEY
  printf '\n'
  export AGENT_LAB_API_KEY
fi
if [[ -z "${AGENT_LAB_API_KEY:-}" ]]; then
  printf 'AGENT_LAB_API_KEY is required for the OpenAI API profile.\n' >&2
  exit 2
fi

if [[ -z "${TMPDIR:-}" && -w /dev/shm ]]; then
  export TMPDIR=/dev/shm
fi
if [[ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" && -x /usr/bin/chromium ]]; then
  export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium
fi

exec bun --no-env-file run agent-lab:all
