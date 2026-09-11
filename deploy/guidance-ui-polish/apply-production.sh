#!/usr/bin/env bash
#
# ==============================================================================
# Guidance UI Polish — production applier
# ==============================================================================
#
# Presentation only. Copies the polished dashboard + V2 step chrome, applies
# the universities hub fix, and MERGES the GUIDANCE UI POLISH CSS block into
# app/globals.css. Never replaces globals.css wholesale.
#
# NEVER:
#   git pull / reset / checkout / clean / stash
#   prisma migrate / db push / seed
#   Counselor OS, payment libs, Zibal, SMS, Nginx, .env, middleware
#
# Usage (from anywhere, after this folder is on the server):
#   bash deploy/guidance-ui-polish/apply-production.sh
# ==============================================================================

set -euo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/guidance-ui-polish.css"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-ui-polish-${STAMP}"
MANIFEST="${BACKUP}/MANIFEST.txt"
PLANNED="${BACKUP}/PLANNED.txt"
WORK="${BACKUP}/.tools"

CSS_START="/* ===== GUIDANCE UI POLISH — dashboard + V2 presentation ===== */"
CSS_END="/* ===== END GUIDANCE UI POLISH ===== */"

# Destination-relative paths this run is allowed to touch. Anything else aborts
# before tsc/build/pm2.
ALLOWLIST=(
  "app/globals.css"
  "app/portal/student/services/guidance/page.tsx"
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
  "components/guidance/shared/GuidanceFileUploadField.tsx"
  "components/guidance/journey-v2/GuidanceJourneyV2Nav.tsx"
  "components/guidance/journey-v2/GuidanceJourneyV2Shell.tsx"
  "components/guidance/journey-v2/HollandV2Step.tsx"
  "components/guidance/journey-v2/HollandResultV2Step.tsx"
  "components/guidance/journey-v2/FinalGradesV2Step.tsx"
  "components/guidance/journey-v2/PersonalInfoV2Step.tsx"
  "components/guidance/journey-v2/ExamGroupsV2Step.tsx"
  "components/guidance/journey-v2/EducationPreferencesV2Step.tsx"
  "components/guidance/journey-v2/CityPreferencesV2Step.tsx"
  "components/guidance/journey-v2/MajorPreferencesV2Step.tsx"
  "components/guidance/journey-v2/PriorityFactorsV2Step.tsx"
  "components/guidance/journey-v2/PackagePaymentV2Step.tsx"
)

COPY_FILES=(
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
  "components/guidance/shared/GuidanceFileUploadField.tsx"
  "components/guidance/journey-v2/GuidanceJourneyV2Nav.tsx"
  "components/guidance/journey-v2/GuidanceJourneyV2Shell.tsx"
  "components/guidance/journey-v2/HollandV2Step.tsx"
  "components/guidance/journey-v2/HollandResultV2Step.tsx"
  "components/guidance/journey-v2/FinalGradesV2Step.tsx"
  "components/guidance/journey-v2/PersonalInfoV2Step.tsx"
  "components/guidance/journey-v2/ExamGroupsV2Step.tsx"
  "components/guidance/journey-v2/EducationPreferencesV2Step.tsx"
  "components/guidance/journey-v2/CityPreferencesV2Step.tsx"
  "components/guidance/journey-v2/MajorPreferencesV2Step.tsx"
  "components/guidance/journey-v2/PriorityFactorsV2Step.tsx"
  "components/guidance/journey-v2/PackagePaymentV2Step.tsx"
)

FORBIDDEN_RX='(^|/)(prisma/|generated/)|counselor|lib/guidance/journey-v2|zibal|Zibal|middleware\.ts|\.env|sms|Sms|SMS'

c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()     { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
info()   { printf '    ..   %s\n' "$*"; }

die() {
  echo >&2
  c_red "ABORT: $*"
  if [[ -f "${BACKUP}/ROLLBACK.sh" ]]; then
    echo >&2 "Restore with: bash ${BACKUP}/ROLLBACK.sh"
  fi
  exit 1
}

trap 'die "unexpected failure at line ${LINENO}"' ERR

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

in_allowlist() {
  local f="$1" a
  for a in "${ALLOWLIST[@]}"; do
    [[ "$f" == "$a" ]] && return 0
  done
  return 1
}

backup_file() {
  local f="$1"
  if [[ "$f" =~ $FORBIDDEN_RX ]]; then
    die "refusing to modify protected path: $f"
  fi
  in_allowlist "$f" || die "refusing to modify non-allowlisted path: $f"
  if [[ -f "$f" ]]; then
    install -D "$f" "${BACKUP}/${f}"
    echo "$f" >> "$MANIFEST"
  else
    echo "NEW:$f" >> "$MANIFEST"
  fi
}

# Production receives packages as a prop and previews discounts via the Step 10
# action. These anchors prove we are looking at that same payment component,
# not a different generation.
require_payment_ui_anchors() {
  local f="$1"
  local role="$2"
  [[ -f "$f" ]] || die "$role missing: $f"
  local needle
  for needle in \
    "previewGuidanceV2Step10DiscountAction" \
    '@/lib/guidance/journey-v2/steps/step10-packages' \
    "function formatToman" \
    "async function applyDiscountCode" \
    "packages.map" \
    "selectedPackage?.requiresPayment" \
    'name="packageCode"' \
    'name="discountCode"'
  do
    grep -qF -- "$needle" "$f" \
      || die "$role $f missing $needle — refusing to treat this as the production payment UI"
  done
}

# ==============================================================================
# 0. Preflight
# ==============================================================================
step "0. Preflight"

[[ -d "$APP_ROOT" ]] || die "app root not found: $APP_ROOT"
cd "$APP_ROOT"
[[ -f package.json ]] || die "$APP_ROOT is not the Next.js app root"
[[ -d "$BUNDLE" ]] || die "bundle missing: $BUNDLE (copy deploy/guidance-ui-polish onto the server)"
[[ -f "$CSS_FRAGMENT" ]] || die "CSS fragment missing: $CSS_FRAGMENT"
grep -qF "$CSS_START" "$CSS_FRAGMENT" || die "CSS fragment missing start marker"
grep -qF "$CSS_END" "$CSS_FRAGMENT" || die "CSS fragment missing end marker"

require_cmd python3
require_cmd npx
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd install

info "app root : $(pwd)"
info "bundle   : $BUNDLE"
info "backup   : $BACKUP"

RESOLVER="app/portal/student/services/guidance/steps/page.tsx"
DASHBOARD_PAGE="app/portal/student/services/guidance/page.tsx"
DASHBOARD_UI="components/guidance/platform/GuidancePlatformDashboard.tsx"
PAYMENT_UI="components/guidance/journey-v2/PackagePaymentV2Step.tsx"

[[ -d "components/guidance/journey-v2" ]] || die "production V2 UI tree missing — refusing to run"
[[ -f "$RESOLVER" ]] || die "missing $RESOLVER"
grep -q 'guidanceJourneyV2StepPath' "$RESOLVER" || die "$RESOLVER is not the production V2 resolver"
ok "production V2 resolver present — will NOT be modified"

[[ -f "$DASHBOARD_PAGE" ]] || die "missing $DASHBOARD_PAGE"
grep -q 'GuidancePlatformDashboard' "$DASHBOARD_PAGE" || die "$DASHBOARD_PAGE does not render GuidancePlatformDashboard"
grep -q 'GuidanceUniversitiesHub' "$DASHBOARD_PAGE" || die "$DASHBOARD_PAGE does not import GuidanceUniversitiesHub"
ok "production guidance page is the V2/dashboard tree"

[[ -f "$DASHBOARD_UI" ]] || die "missing $DASHBOARD_UI"
grep -q 'ورود به مسیر انتخاب رشته' "$DASHBOARD_UI" || die "$DASHBOARD_UI is not the four-card production dashboard"
ok "production four-card dashboard present"

require_payment_ui_anchors "$PAYMENT_UI" "production"
require_payment_ui_anchors "${BUNDLE}/${PAYMENT_UI}" "bundle"
ok "production and bundled PackagePaymentV2Step share the same payment-architecture anchors"

[[ -f "app/globals.css" ]] || die "missing app/globals.css"

# Payment / counselor / routing files must stay out of this run.
for protected in \
  "lib/guidance/journey-v2/steps/step10-payment.ts" \
  "lib/guidance/journey-v2/steps/step10-discount.ts" \
  "lib/guidance/journey-v2/steps/step10-packages.ts" \
  "middleware.ts" \
  "prisma/schema.prisma"
 do
  [[ -f "$protected" ]] || continue
  in_allowlist "$protected" && die "allowlist accidentally includes protected $protected"
done
ok "payment libs, middleware, and Prisma are not in the allowlist"

for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing ${rel}"
done
ok "all bundled presentation files present"

# ==============================================================================
# 1. Backup + rollback
# ==============================================================================
step "1. Backup scaffolding"

mkdir -p "$BACKUP" "$WORK"
: > "$MANIFEST"
: > "$PLANNED"

cat > "${BACKUP}/ROLLBACK.sh" <<ROLLBACK
#!/usr/bin/env bash
# Restore every file this polish run touched, then rebuild and restart.
set -euo pipefail
cd "${APP_ROOT}"
echo "==> Restoring ${BACKUP}"
while IFS= read -r line; do
  case "\$line" in
    NEW:*)
      f="\${line#NEW:}"
      if [[ -f "\$f" ]]; then
        rm -f "\$f"
        echo "removed  \$f"
      fi
      ;;
    "")
      ;;
    *)
      install -D "${BACKUP}/\$line" "\$line"
      echo "restored \$line"
      ;;
  esac
done < "${MANIFEST}"
echo "==> Typecheck"
npx tsc --noEmit
echo "==> Build"
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "==> Restart"
pm2 restart ${PM2_NAME} --update-env
pm2 status
echo "Rollback complete."
ROLLBACK
chmod +x "${BACKUP}/ROLLBACK.sh"
ok "rollback script: ${BACKUP}/ROLLBACK.sh"

# ==============================================================================
# 2. Planned change list (abort before writes if unexpected)
# ==============================================================================
step "2. Planned change list"

{
  printf '%s\n' "${COPY_FILES[@]}"
  echo "app/globals.css"
  echo "app/portal/student/services/guidance/page.tsx"
} | sort -u > "$PLANNED"

echo
echo "This run will touch ONLY these files:"
sed 's/^/  /' "$PLANNED"
echo

while IFS= read -r f; do
  in_allowlist "$f" || die "planned file is not allowlisted: $f"
  if [[ "$f" =~ $FORBIDDEN_RX ]]; then
    die "planned file is protected: $f"
  fi
done < "$PLANNED"
ok "planned set matches the allowlist — no unexpected files"

# ==============================================================================
# 3. Copy presentation files
# ==============================================================================
step "3. Copy polished presentation files"

for rel in "${COPY_FILES[@]}"; do
  backup_file "$rel"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied  $rel"
done

# Payment UI must still be the same business surface after the copy.
require_payment_ui_anchors "$PAYMENT_UI" "after-copy"
grep -q 'GuidanceFileUploadField' \
  "components/guidance/journey-v2/FinalGradesV2Step.tsx" \
  || die "FinalGradesV2Step did not receive the Persian uploader"
grep -q 'خروج از حساب' "$DASHBOARD_UI" \
  || die "dashboard copy is missing the logout control"
grep -q 'guidanceJourneyV2StepPath(3)' \
  "components/guidance/journey-v2/HollandV2Step.tsx" \
  || die "Holland completed state is missing the previous-step control"
ok "copied files still expose the expected presentation contracts"

# ==============================================================================
# 4. Universities page fix (anchored, never a wholesale page replace)
# ==============================================================================
step "4. Universities hub fix"

backup_file "$DASHBOARD_PAGE"

python3 - "$DASHBOARD_PAGE" <<'PY'
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()

already = (
    'if (view === "universities")' in src
    and 'return <GuidanceUniversitiesHub />' in src
    and 'title: "دانشگاه‌های پیشنهادی"' not in src
    and '| "universities"' not in src
)
if already:
    sys.stderr.write("    (universities hub already first-class, skipped)\n")
    sys.exit(0)

union_old = '  | "majors"\n  | "universities"\n  | "selection"'
union_new = '  | "majors"\n  | "selection"'
if src.count(union_old) != 1:
    sys.stderr.write("ANCHOR MISMATCH: PlaceholderView universities union\n")
    sys.exit(3)
src = src.replace(union_old, union_new)

block_old = '''  universities: {
    eyebrow: "به‌زودی",
    title: "دانشگاه‌های پیشنهادی",
    description:
      "لیست دانشگاه‌های هم‌راستا با پرونده‌ات در فازهای بعدی. بدون موتور پیشنهاد در این فاز.",
    icon: "grid",
    accent: "blue",
  },
'''
if src.count(block_old) != 1:
    sys.stderr.write("ANCHOR MISMATCH: PLACEHOLDERS.universities block\n")
    sys.exit(3)
src = src.replace(block_old, "")

gate = '''  if (view in PLACEHOLDERS) {'''
insert = '''  if (view === "universities") {
    return <GuidanceUniversitiesHub />;
  }

  if (view in PLACEHOLDERS) {'''
if src.count(gate) != 1:
    sys.stderr.write("ANCHOR MISMATCH: view in PLACEHOLDERS gate\n")
    sys.exit(3)
src = src.replace(gate, insert, 1)

dead = '''  // Default: Guidance Platform dashboard (Major Selection home)
    if (view === "universities") {
    return <GuidanceUniversitiesHub />;
  }

'''
if dead in src:
    src = src.replace(dead, "  // Default: Guidance Platform dashboard (Major Selection home)\n", 1)

if 'title: "دانشگاه‌های پیشنهادی"' in src:
    sys.stderr.write("post-condition failed: placeholder university copy still present\n")
    sys.exit(3)
if src.count('return <GuidanceUniversitiesHub />') != 1:
    sys.stderr.write("post-condition failed: expected exactly one universities hub return\n")
    sys.exit(3)

open(path, "w", encoding="utf-8", newline="\n").write(src)
PY
ok "universities view now renders GuidanceUniversitiesHub"

# ==============================================================================
# 5. Merge CSS (append once)
# ==============================================================================
step "5. Merge GUIDANCE UI POLISH CSS"

backup_file "app/globals.css"

if grep -qF "$CSS_START" app/globals.css; then
  ok "CSS block already present — not duplicated"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  grep -qF "$CSS_START" app/globals.css || die "CSS merge failed: start marker missing"
  grep -qF "$CSS_END" app/globals.css || die "CSS merge failed: end marker missing"
  ok "appended GUIDANCE UI POLISH block to app/globals.css"
fi

count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$count" == "1" ]] || die "globals.css has $count polish CSS blocks — expected 1"

# ==============================================================================
# 6. Manifest vs allowlist
# ==============================================================================
step "6. Confirm no unexpected writes"

unexpected=0
while IFS= read -r line; do
  f="${line#NEW:}"
  in_allowlist "$f" || { c_red "    unexpected: $f"; unexpected=1; }
  if [[ "$f" =~ $FORBIDDEN_RX ]]; then
    c_red "    protected: $f"
    unexpected=1
  fi
done < "$MANIFEST"
[[ "$unexpected" -eq 0 ]] || die "manifest contains files outside the allowlist"

ok "manifest is contained by the allowlist"
echo
echo "Files actually backed up / written:"
sed 's/^/  /' "$MANIFEST"

# ==============================================================================
# 7. Typecheck + build
# ==============================================================================
step "7. Typecheck"
if ! npx tsc --noEmit; then
  die "TypeScript failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "tsc --noEmit passed"

step "8. Build"
if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
  die "Build failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "npm run build passed"

# ==============================================================================
# 9. Restart + smoke
# ==============================================================================
step "9. PM2 restart"
pm2 restart "$PM2_NAME" --update-env
pm2 status
ok "pm2 restarted $PM2_NAME"

step "10. Local HTTP smoke tests"

smoke() {
  local url="$1"
  local extra="${2:-}"
  local code
  # shellcheck disable=SC2086
  code="$(curl -sS -o /tmp/guidance-ui-polish-smoke.body -w '%{http_code}' \
    --max-time 20 $extra "$url" || true)"
  case "$code" in
    200|301|302|303|307|308)
      ok "$code  $url"
      ;;
    *)
      die "smoke failed: $url returned '$code' (expected 200/3xx)"
      ;;
  esac
}

BASE="http://127.0.0.1:3000"
smoke "${BASE}/portal/student/services/guidance"
smoke "${BASE}/portal/student/services/guidance?view=universities"
smoke "${BASE}/portal/student/services/guidance?view=plans"
smoke "${BASE}/portal/student/services/guidance/steps"
smoke "${BASE}/portal/login"
smoke "${BASE}/discover/majors"
smoke "${BASE}/discover/programs"
smoke "${BASE}/entekhab"
smoke "${BASE}/" "-H Host: entekhab.setareganplus.ir"

ok "canonical guidance routes responded without 5xx"

trap - ERR

echo
echo "=== GUIDANCE UI POLISH DEPLOYED ==="
echo "backup: ${BACKUP}"
echo "typecheck: PASS"
echo "build: PASS"
echo "pm2: restarted ${PM2_NAME}"
echo "nginx: NOT MODIFIED"
echo
echo "Rollback:"
echo "  bash ${BACKUP}/ROLLBACK.sh"
