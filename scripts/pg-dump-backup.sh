#!/usr/bin/env bash
# Builds a pg_dump-friendly URL (strips ?schema= and other query params).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing .env" >&2
  exit 1
fi
RAW="$(grep '^DATABASE_URL=' "$ENV_FILE" | sed 's/^DATABASE_URL=//' | tr -d '"')"
BASE="${RAW%%\?*}"
OUT="${1:-/tmp/setareganplus-backup-$(date +%Y%m%d%H%M).dump}"
pg_dump "$BASE" -Fc -f "$OUT"
pg_restore --list "$OUT" >/dev/null
echo "backup_ok path=$OUT"
