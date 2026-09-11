#!/usr/bin/env bash
#
# Counselor scheduling fix — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset, prisma migrate/db push, edit .env,
#        overwrite middleware, Zibal, payment, page.early.tsx,
#        or unrelated Counselor OS / Steps 11–18 files.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/counselor-scheduling-fix.css"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/counselor-scheduling-fix-${STAMP}"

CSS_START="/* ===== COUNSELOR SCHEDULING FIX ===== */"
CSS_END="/* ===== END COUNSELOR SCHEDULING FIX ===== */"

COPY_FILES=(
  "lib/counselor-os/advisor.ts"
  "lib/counselor-os/profiles.ts"
  "lib/counselor-os/schedule.ts"
  "lib/counselor-os/booking.ts"
  "app/admin/counselor/calendar/page.tsx"
  "app/admin/counselor/settings/page.tsx"
  "app/admin/counselor/actions.ts"
  "components/counselor-os/CounselorScheduleForm.tsx"
  "components/counselor-os/CounselorCalendarSelect.tsx"
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

[[ -f "$CSS_FRAGMENT" ]] || die "missing CSS fragment"
grep -qF "$CSS_START" "$CSS_FRAGMENT" || die "CSS fragment missing start marker"
grep -qF "$CSS_END" "$CSS_FRAGMENT" || die "CSS fragment missing end marker"

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

step "2. Merge CSS"
backup_file "app/globals.css"
if grep -qF "$CSS_START" app/globals.css; then
  CSS_FRAGMENT="$CSS_FRAGMENT" python3 - <<'PY'
from pathlib import Path
import os
css = Path("app/globals.css")
text = css.read_text(encoding="utf-8")
start = "/* ===== COUNSELOR SCHEDULING FIX ===== */"
end = "/* ===== END COUNSELOR SCHEDULING FIX ===== */"
frag = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8").strip()
from_ = text.find(start)
to = text.find(end)
if from_ < 0 or to < 0 or to <= from_:
    raise SystemExit("existing scheduling CSS markers unusable")
css.write_text(text[:from_] + frag + text[to + len(end):], encoding="utf-8", newline="\n")
PY
  ok "replaced scheduling CSS block"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  ok "appended scheduling CSS block"
fi
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count scheduling CSS blocks — expected 1"

step "3. Typecheck + build"
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
ok "tsc"
npm run build
ok "build"

step "4. PM2"
npx pm2 restart "$PM2_NAME" --update-env
ok "pm2 restarted"

step "5. Smoke"
[[ -f "app/admin/counselor/calendar/page.tsx" ]] || die "calendar page missing"
[[ -f "app/admin/counselor/settings/page.tsx" ]] || die "settings page missing"
[[ -f "app/admin/counselor/counselors/page.tsx" ]] || die "counselors page missing"
grep -q "CounselorCalendarSelect" app/admin/counselor/calendar/page.tsx \
  || die "calendar missing counselor selector"
grep -q "resolveManagedBookingAdvisor" lib/counselor-os/advisor.ts \
  || die "managed advisor resolver missing"
grep -q "refreshCounselorGeneratedSlots" lib/counselor-os/schedule.ts \
  || die "slot refresh missing"
[[ ! -f "lib/payment/providers/zibal.ts" ]] || ok "zibal file left in place"
ok "smoke checks passed"
printf '\nDONE backup=%s\n' "$BACKUP"
