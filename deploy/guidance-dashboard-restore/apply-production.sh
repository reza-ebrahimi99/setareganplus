#!/usr/bin/env bash
#
# Restore GuidancePlatformDashboard as the canonical student home.
# Forward-only. Does NOT deploy itself.
#
# Never: git pull/reset/clean/stash/checkout, Prisma, .env, PM2 config,
#        Nginx, middleware, Zibal, page.early.tsx, Counselor OS.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-dashboard-restore-${STAMP}"
REPORT="${BACKUP}/APPLY-REPORT.txt"

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

mapfile -t COPY_FILES < <(grep -v '^[[:space:]]*$' "${SCRIPT_DIR}/COPY_FILES.txt")

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; echo "FAIL: $*" >> "$REPORT"; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; echo "==> $*" >> "$REPORT"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; echo "OK: $*" >> "$REPORT"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"
mkdir -p "$BACKUP" /var/backups
echo "guidance-dashboard-restore $STAMP" > "$REPORT"

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

declare -A BEFORE_HASH
for rel in "${PROTECTED[@]}"; do
  BEFORE_HASH["$rel"]="$(hash_file "$rel")"
done
ENV_HASH_BEFORE="$(hash_file ".env")"

step "1. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing $rel"
  backup_file "$rel"
  mkdir -p "$(dirname "$rel")"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied $rel"
done

grep -q "GuidancePlatformDashboard" app/portal/student/services/guidance/page.tsx \
  || die "page.tsx does not render GuidancePlatformDashboard"
grep -q "GuidanceStudentDashboardPanels" app/portal/student/services/guidance/page.tsx \
  && die "page.tsx still renders GuidanceStudentDashboardPanels"
grep -q 'view === "plans"' app/portal/student/services/guidance/page.tsx \
  || die "view=plans redirect missing"
grep -q "guidanceJourneyV2StepPath(10)" app/portal/student/services/guidance/page.tsx \
  || die "Step 10 plans path missing"
grep -q "GUIDANCE_STEPS_ENTRY" components/guidance/platform/GuidancePlatformDashboard.tsx \
  || die "yellow CTA missing GUIDANCE_STEPS_ENTRY"
grep -q "guidanceDashboardGreetingName" components/guidance/platform/GuidancePlatformDashboard.tsx \
  || die "placeholder greeting helper missing"
grep -q "وضعیت مسیر شما" components/guidance/platform/GuidancePlatformDashboard.tsx \
  && die "pulse panel leaked into platform dashboard"

if grep -q "GuidanceV2EarlyStepsStub" \
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx" 2>/dev/null; then
  die "page.early.tsx looks like the local stub — aborting"
fi
ok "dashboard contract verified"

step "2. prisma generate + tsc + build (no migrate)"
export NODE_OPTIONS="--max-old-space-size=4096"
npx prisma generate || die "prisma generate failed"
npx tsc --noEmit || die "tsc failed"
npm run build || die "build failed"
ok "generate/tsc/build"

step "3. PM2 restart + readiness"
npx pm2 restart "$PM2_NAME" --update-env || die "pm2 restart failed"
sleep 5
if curl -fsS -o /dev/null -m 20 "http://127.0.0.1:3000/portal/login"; then
  ok "readiness /portal/login"
else
  die "readiness wait failed"
fi

step "4. Protected files unchanged"
for rel in "${PROTECTED[@]}"; do
  after="$(hash_file "$rel")"
  [[ "${BEFORE_HASH[$rel]}" == "$after" ]] || die "protected file changed: $rel"
  ok "protected unchanged $rel"
done
[[ "$ENV_HASH_BEFORE" == "$(hash_file ".env")" ]] || die ".env changed"
ok ".env unchanged"

echo "FINAL: PASS" | tee -a "$REPORT"
