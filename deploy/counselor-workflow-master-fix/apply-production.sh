#!/usr/bin/env bash
#
# Counselor workflow master fix — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset, prisma migrate/db push, edit .env,
#        overwrite middleware, Zibal, payment, page.early.tsx.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/counselor-workflow-master-fix-${STAMP}"

COPY_FILES=(
  "lib/guidance/journey-v2/booking-gate.ts"
  "lib/guidance/journey-v2/choice-feedback-map.ts"
  "lib/guidance/journey-v2/advance.ts"
  "lib/guidance/journey-v2/appointments.ts"
  "lib/guidance/journey-v2/choices.ts"
  "lib/guidance/journey-v2/constants.ts"
  "lib/guidance/choice-studio/status.ts"
  "lib/counselor-os/schedule-windows.ts"
  "lib/counselor-os/booking.ts"
  "lib/counselor-os/schedule.ts"
  "lib/counselor-os/follow-ups.ts"
  "lib/counselor-os/late-journey.ts"
  "lib/booking/generate-slots.ts"
  "app/portal/student/services/guidance/journey/steps/actions/late.ts"
  "app/admin/counselor/actions.ts"
  "app/admin/counselor/late-actions.ts"
  "app/admin/counselor/calendar/page.tsx"
  "app/admin/counselor/settings/page.tsx"
  "app/admin/counselor/follow-ups/page.tsx"
  "components/guidance/v2-late/SessionBookingPanel.tsx"
  "components/guidance/v2-late/ChoiceReviewWorkspace.tsx"
  "components/guidance/choice-studio/ChoiceStudio.tsx"
  "components/guidance/choice-studio/ChoiceConfirmDialog.tsx"
  "components/counselor-os/CounselorScheduleForm.tsx"
  "components/counselor-os/CounselorStudentCaseTabs.tsx"
  "components/counselor-os/SessionWorkspaceForm.tsx"
)

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "lib/guidance/journey/payment.ts"
  "prisma/schema.prisma"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal.ts|*/zibal-http.ts|*middleware.ts*|*/payment.ts|*schema.prisma*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

[[ -f "${SCRIPT_DIR}/guidance-v2-late.css" ]] || die "missing guidance-v2-late.css"
[[ -f "${SCRIPT_DIR}/guidance-choice-studio.css" ]] || die "missing guidance-choice-studio.css"

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

merge_css_block() {
  local fragment="$1"
  local start="$2"
  local end="$3"
  CSS_FRAGMENT="$fragment" CSS_START="$start" CSS_END="$end" python3 - <<'PY'
from pathlib import Path
import os
css = Path("app/globals.css")
text = css.read_text(encoding="utf-8")
start = os.environ["CSS_START"]
end = os.environ["CSS_END"]
frag = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8").strip()
from_ = text.find(start)
to = text.find(end)
if from_ < 0 or to < 0 or to <= from_:
    raise SystemExit(f"existing CSS markers unusable: {start}")
css.write_text(text[:from_] + frag + text[to + len(end):], encoding="utf-8", newline="\n")
PY
}

step "2. Merge CSS"
backup_file "app/globals.css"
merge_css_block "${SCRIPT_DIR}/guidance-v2-late.css" \
  "/* ===== GUIDANCE V2 STEPS 11-18 ===== */" \
  "/* ===== END GUIDANCE V2 STEPS 11-18 ===== */"
ok "replaced Guidance V2 late CSS block"
merge_css_block "${SCRIPT_DIR}/guidance-choice-studio.css" \
  "/* ===== GUIDANCE CHOICE STUDIO ===== */" \
  "/* ===== END GUIDANCE CHOICE STUDIO ===== */"
ok "replaced Choice Studio CSS block"

step "3. Prisma generate (no migrate — zero schema change)"
npx prisma generate
ok "prisma generate"

step "4. Typecheck + build"
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
ok "tsc"
npm run build
ok "build"

step "5. PM2"
npx pm2 restart "$PM2_NAME" --update-env
ok "pm2 restarted"

step "6. Smoke"
[[ -f "lib/guidance/journey-v2/booking-gate.ts" ]] || die "booking gate missing"
grep -q "assertQualifyingSessionBooking" lib/guidance/journey-v2/advance.ts \
  || die "advance booking gate missing"
grep -q "startFinalRevisionAction" app/admin/counselor/late-actions.ts \
  || die "revision action missing"
grep -q "JalaliDateTimeFields" components/counselor-os/CounselorStudentCaseTabs.tsx \
  || die "Jalali follow-up missing"
grep -q "برنامه زمانی جلسه اول" components/counselor-os/CounselorScheduleForm.tsx \
  || die "split schedule UI missing"
grep -q "ثبت نظر درباره چیدمان اولیه" components/guidance/v2-late/ChoiceReviewWorkspace.tsx \
  || die "step 14 action box missing"
[[ ! -f "lib/payment/providers/zibal.ts" ]] || ok "zibal file left in place"
ok "smoke checks passed"
printf '\nDONE backup=%s\n' "$BACKUP"
