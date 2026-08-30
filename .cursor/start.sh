#!/usr/bin/env bash
# Per-boot reconciliation: bring PostgreSQL online before the dev server starts.
set -euo pipefail

PG_MAJOR=16

# Start the cluster (no-op / harmless error if it is already running).
sudo pg_ctlcluster "${PG_MAJOR}" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if pg_isready -q -h 127.0.0.1 -p 5432; then
    echo "PostgreSQL is ready"
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time" >&2
exit 1
