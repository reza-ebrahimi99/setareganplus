#!/usr/bin/env bash
# Re-import booklet orders from the old app's DB into the lean app (read-only on the old DB, idempotent).
# Catches late payments that came back through the old /payments callback.  Usage: bash resync-old-shop.sh
set -euo pipefail
OLD_DIR="${OLD_DIR:-/var/www/setareganplus}"; APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
LOG="${STATE_DIR:-/var/backups/setareganplus-lean}/resync.log"
{
  echo "=== $(date '+%F %T') resync"
  OLD_DATABASE_URL="$(grep -E '^DATABASE_URL=' "$OLD_DIR/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')"
  MEDIA="$(grep -E '^STAROS_MEDIA_ROOT=' "$OLD_DIR/.env" | head -1 | sed -E 's/^STAROS_MEDIA_ROOT=//; s/^"//; s/"$//' || true)"
  export OLD_DATABASE_URL="${OLD_DATABASE_URL%%\?*}" OLD_MEDIA_ROOT="${MEDIA:-/var/www/staros-media}"
  cd "$APP_DIR" && npx tsx scripts/migrate-old-shop.ts
} >> "$LOG" 2>&1
tail -n 15 "$LOG"
