#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${METHANE_DELIVERY_CAPTURE_RUNTIME_DIR:-$repo_root/delivery-output/capture-runtime}"
ffmpeg_link="$runtime_dir/ffmpeg-1013/ffmpeg-linux"
system_ffmpeg="$(command -v ffmpeg || true)"

[[ -n "$system_ffmpeg" && -x "$system_ffmpeg" ]] || { printf 'System ffmpeg is required for Playwright video capture.\n' >&2; exit 2; }
mkdir -p "$(dirname "$ffmpeg_link")"
if [[ ! -e "$ffmpeg_link" && ! -L "$ffmpeg_link" ]]; then ln -s "$system_ffmpeg" "$ffmpeg_link"; fi
[[ -x "$ffmpeg_link" ]] || { printf 'Playwright ffmpeg compatibility path is not executable: %s\n' "$ffmpeg_link" >&2; exit 2; }

cd "$repo_root"
PLAYWRIGHT_BROWSERS_PATH="$runtime_dir" \
PLAYWRIGHT_CHROMIUM_EXECUTABLE="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-/usr/bin/chromium}" \
METHANE_DELIVERY_OUTPUT_DIR="${METHANE_DELIVERY_OUTPUT_DIR:-$repo_root/delivery-output/story-v4}" \
  bun --no-env-file scripts/capture-delivery-demo.ts
