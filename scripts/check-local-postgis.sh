#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  printf 'Refusing to replace TEST_DATABASE_URL; unset it before using this disposable PostGIS runner.\n' >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf 'Docker daemon is unavailable; start Docker or configure a disposable PostGIS database manually.\n' >&2
  exit 2
fi

run_id="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
if [[ ! "$run_id" =~ ^[0-9a-f]{32}$ ]]; then
  printf 'Could not create a unique PostGIS runner ID.\n' >&2
  exit 3
fi
container_name="methane-response-check-${run_id}"
label_key='com.methane-response.check-run'
cleanup() {
  local container_ids container_id
  if ! container_ids="$(docker ps --all --quiet --filter "label=${label_key}=${run_id}" 2>/dev/null)"; then
    return 0
  fi
  while IFS= read -r container_id; do
    if [[ -n "$container_id" ]]; then
      docker rm --force "$container_id" >/dev/null 2>&1 || true
    fi
  done <<< "$container_ids"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! docker run --detach --rm \
  --name "$container_name" \
  --label "${label_key}=${run_id}" \
  --publish 127.0.0.1::5432 \
  --tmpfs /var/lib/postgresql/data:rw,size=512m \
  --env POSTGRES_DB=methane_test \
  --env POSTGRES_USER=postgres \
  --env POSTGRES_PASSWORD=postgres \
  postgis/postgis:17-3.5-alpine >/dev/null; then
  printf 'Could not start the disposable PostGIS test container.\n' >&2
  exit 3
fi

if ! port_binding="$(docker port "$container_name" 5432/tcp | head -n 1)"; then
  printf 'Could not discover the local PostGIS port.\n' >&2
  exit 4
fi
host_port="${port_binding##*:}"
if [[ "$port_binding" != 127.0.0.1:* || ! "$host_port" =~ ^[0-9]+$ || "$host_port" -lt 1 || "$host_port" -gt 65535 ]]; then
  printf 'Docker returned an invalid loopback port for the disposable PostGIS service.\n' >&2
  exit 4
fi

ready=0
for attempt in {1..60}; do
  if docker exec "$container_name" pg_isready -U postgres -d methane_test >/dev/null 2>&1 \
    && docker exec "$container_name" psql -U postgres -d methane_test -v ON_ERROR_STOP=1 -Atqc 'SELECT postgis_lib_version()' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  printf 'Disposable PostGIS did not become ready within 60 seconds.\n' >&2
  exit 5
fi

printf 'Running the complete gate against disposable loopback-only PostGIS; the container will be removed afterward.\n'
if TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${host_port}/methane_test" DATABASE_URL= bash scripts/check-local.sh; then
  gate_status=0
else
  gate_status=$?
fi
exit "$gate_status"
