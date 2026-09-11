#!/usr/bin/env bash
#
# Guidance Zibal callback hotfix — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset, prisma migrate/db push, edit .env,
#        overwrite middleware, zibal-http, page.early.tsx,
#        or generic/guidance callback pages.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-zibal-callback-hotfix-${STAMP}"

COPY_FILES=(
  "lib/payment/providers/zibal.ts"
  "lib/guidance/journey/payment.ts"
)

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal-http.ts"
  "app/payments/callback/zibal/page.tsx"
  "app/payments/callback/guidance/page.tsx"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal-http.ts|*middleware.ts*|*/callback/zibal/*|*/callback/guidance/*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

bundle_extra=0
while IFS= read -r found; do
  rel="${found#${BUNDLE}/}"
  rel="${rel#/}"
  allowed=0
  for copy in "${COPY_FILES[@]}"; do
    if [[ "$rel" == "$copy" ]]; then
      allowed=1
      break
    fi
  done
  if [[ "$allowed" -eq 0 ]]; then
    printf 'extra bundle file: %s\n' "$rel" >&2
    bundle_extra=1
  fi
done < <(find "$BUNDLE" -type f | sed "s#^${BUNDLE}/##")
[[ "$bundle_extra" -eq 0 ]] || die "bundle files/ contains files outside COPY_FILES"

mkdir -p "$BACKUP"
backup_file() {
  local rel="$1"
  [[ -f "$rel" ]] || return 0
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$rel" "$BACKUP/$rel"
}

step "1. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing $rel"
  backup_file "$rel"
  mkdir -p "$(dirname "$rel")"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied $rel"
done

for rel in "${PROTECTED[@]}"; do
  if [[ -f "$rel" ]] && grep -q "GuidanceV2EarlyStepsStub" "$rel" 2>/dev/null; then
    die "protected file looks like local stub: $rel"
  fi
done

step "2. Typecheck + build"
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
ok "tsc"
npm run build
ok "build"

step "3. PM2"
npx pm2 restart "$PM2_NAME"
ok "pm2 restarted"

step "4. Smoke"
grep -q "export function buildZibalCallbackUrl" lib/payment/providers/zibal.ts \
  || die "zibal.ts missing buildZibalCallbackUrl"
grep -q 'callbackPath: GUIDANCE_CALLBACK_PATH' lib/guidance/journey/payment.ts \
  || die "guidance payment missing dedicated callbackPath"
grep -q "isZibalCallbackForPath" lib/guidance/journey/payment.ts \
  || die "guidance checkout safety missing"
[[ -f "app/payments/callback/guidance/page.tsx" ]] || die "guidance callback page missing"
[[ -f "app/payments/callback/zibal/page.tsx" ]] || die "generic zibal callback page missing"
[[ -d "app/portal/student/services/guidance/journey/steps" ]] \
  || die "guidance journey steps route missing"
ok "callback routes and hotfix markers present"
printf '\nDONE backup=%s\n' "$BACKUP"
