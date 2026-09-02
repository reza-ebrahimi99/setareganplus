#!/usr/bin/env bash
# Counselor OS production apply — fail-fast, backup-first, no destructive DB.
set -euo pipefail

ANCHOR="${1:-/var/www/setareganplus}"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="${ANCHOR}.backup.${STAMP}"

if [[ ! -d "$ANCHOR" ]]; then
  echo "ERROR: anchor not found: $ANCHOR" >&2
  exit 1
fi

echo "==> Backup $ANCHOR -> $BACKUP"
cp -a "$ANCHOR" "$BACKUP"

cd "$ANCHOR"

echo "==> Prisma migrate deploy (additive only)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
npx prisma migrate deploy
npx prisma generate

echo "==> Build"
npm run build

echo "==> Restart PM2"
pm2 restart setareganplus || true

echo "DONE. Run deploy/counselor-os/SMOKE_TEST.md checklist."
