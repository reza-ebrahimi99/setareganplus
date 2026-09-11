#!/usr/bin/env bash
#
# Guidance prelaunch RECOVERY — forward-only.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset/clean/stash/checkout, edit .env, PM2 config,
#        Nginx, overwrite middleware, Zibal internals, page.early.tsx,
#        or rewrite 20260909090000_guidance_prelaunch_hardening.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-prelaunch-recovery-${STAMP}"
REPORT="${BACKUP}/APPLY-REPORT.txt"
PASS=1

mapfile -t COPY_FILES < <(grep -v '^[[:space:]]*$' "${SCRIPT_DIR}/COPY_FILES.txt")

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
  "prisma/migrations/20260909090000_guidance_prelaunch_hardening/migration.sql"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; PASS=0; echo "FAIL: $*" >> "$REPORT"; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; echo "==> $*" >> "$REPORT"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; echo "OK: $*" >> "$REPORT"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"
mkdir -p "$BACKUP" /var/backups
echo "guidance-prelaunch-recovery $STAMP" > "$REPORT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal.ts|*/zibal-http.ts|*middleware.ts*|*20260909090000*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

backup_file() {
  local rel="$1"
  [[ -f "$rel" ]] || return 0
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$rel" "$BACKUP/$rel"
}

hash_file() {
  local rel="$1"
  if [[ -f "$rel" ]]; then
    sha256sum "$rel" | awk '{print $1}'
  else
    echo "missing"
  fi
}

find_predeploy_catalog() {
  local found=""
  local dir
  for dir in $(ls -1d /var/backups/guidance-prelaunch-master-* 2>/dev/null | sort); do
    if [[ -f "$dir/lib/guidance/journey-v2/steps/step10-packages.ts" ]] &&
      grep -q "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS" "$dir/lib/guidance/journey-v2/steps/step10-packages.ts" &&
      grep -q "calculateGuidanceV2PackagePrice" "$dir/lib/guidance/journey-v2/steps/step10-packages.ts"; then
      found="$dir/lib/guidance/journey-v2/steps/step10-packages.ts"
    fi
  done
  printf '%s' "$found"
}

declare -A BEFORE_HASH
for rel in "${PROTECTED[@]}"; do
  BEFORE_HASH["$rel"]="$(hash_file "$rel")"
done
ENV_HASH_BEFORE="$(hash_file ".env")"

step "1. Detect app root and backup"
ok "APP_ROOT=$APP_ROOT backup=$BACKUP"

step "2. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing $rel"
  backup_file "$rel"
  mkdir -p "$(dirname "$rel")"
  if [[ "$rel" == "prisma/migrations/20260909090000_guidance_prelaunch_hardening/migration.sql" ]]; then
    die "refusing to overwrite already-applied migration"
  fi
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied $rel"
done

step "3. Restore production alumni/payment helpers onto canonical catalog"
PREDEPLOY_CATALOG="$(find_predeploy_catalog)"
if [[ -n "$PREDEPLOY_CATALOG" ]]; then
  node "${SCRIPT_DIR}/merge-step10-packages.mjs" \
    "lib/guidance/journey-v2/steps/step10-packages.ts" \
    "${BUNDLE}/lib/guidance/journey-v2/steps/step10-packages.ts" \
    "$PREDEPLOY_CATALOG" \
    || die "step10-packages merge failed"
  ok "merged alumni exports from $PREDEPLOY_CATALOG"
else
  echo "WARN: pre-deploy step10-packages backup with alumni exports not found; shipped compatibility helpers remain" | tee -a "$REPORT"
fi

grep -q "priceRials: 43_000_000" lib/guidance/journey-v2/steps/step10-packages.ts \
  || die "SMART price drifted"
grep -q "priceRials: 57_000_000" lib/guidance/journey-v2/steps/step10-packages.ts \
  || die "SPECIALIZED price drifted"
grep -q "priceRials: 79_000_000" lib/guidance/journey-v2/steps/step10-packages.ts \
  || die "PREMIUM price drifted"
grep -q "calculateGuidanceV2PackagePrice" lib/guidance/journey-v2/steps/step10-packages.ts \
  || die "calculateGuidanceV2PackagePrice missing"
grep -q "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS" lib/guidance/journey-v2/steps/step10-packages.ts \
  || die "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS missing"
grep -q "StudentCounselingPanel" app/portal/student/services/guidance/page.tsx \
  && die "page.tsx still imports StudentCounselingPanel"
ok "catalog prices and recovered exports verified"

if grep -q "GuidanceV2EarlyStepsStub" \
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx" 2>/dev/null; then
  die "page.early.tsx looks like the local stub — aborting"
fi

step "4. Prisma migrate (forward-only new Holland enum)"
[[ -f "prisma/migrations/20260909090000_guidance_prelaunch_hardening/migration.sql" ]] \
  || die "already-applied hardening migration missing"
export NODE_OPTIONS="--max-old-space-size=4096"
npx prisma migrate status || die "prisma migrate status failed"
npx prisma migrate deploy || die "prisma migrate deploy failed / unsafe"
ok "migrate deploy"

step "5. prisma generate + tsc + build"
npx prisma generate || die "prisma generate failed"
npx tsc --noEmit || die "tsc failed"
npm run build || die "build failed"
ok "generate/tsc/build"

step "6. PM2 restart + readiness"
npx pm2 restart "$PM2_NAME" --update-env || die "pm2 restart failed"
sleep 5
if curl -fsS -o /dev/null -m 20 "http://127.0.0.1:3000/portal/login"; then
  ok "readiness /portal/login"
else
  die "readiness wait failed"
fi

step "7. Protected files unchanged"
for rel in "${PROTECTED[@]}"; do
  after="$(hash_file "$rel")"
  [[ "${BEFORE_HASH[$rel]}" == "$after" ]] || die "protected file changed: $rel"
  ok "protected unchanged $rel"
done
[[ "$ENV_HASH_BEFORE" == "$(hash_file ".env")" ]] || die ".env changed"
ok ".env unchanged"

if [[ "$PASS" -eq 1 ]]; then
  echo "FINAL: PASS" | tee -a "$REPORT"
else
  echo "FINAL: FAIL" | tee -a "$REPORT"
  exit 1
fi
