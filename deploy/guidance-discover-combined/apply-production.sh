#!/usr/bin/env bash
#
# ==============================================================================
# Combined: Discover detail cleanup + guidance logout return-to-entekhab
# ==============================================================================
#
# One run, one timestamped backup, one allowlist.
#
# 1) Discover encyclopedia details (no school/classroom photo covers)
# 2) Guidance dashboard logout form: hidden next="/" on existing POST
#    /portal/logout. Session clear is unchanged. Other portal logout
#    forms are not copied.
#
# CSS: MERGES the DISCOVER DETAIL CLEANUP block into app/globals.css.
# Never replaces globals.css wholesale. Idempotent if the block exists.
#
# NEVER:
#   git pull / reset / checkout / clean / stash / commit
#   prisma migrate / db push / seed
#   Counselor OS, payment libs, Zibal, SMS, Nginx, .env, middleware
#   Guidance V2 journey / step files
#   POST /portal/logout during smoke (would clear a real session)
#
# Usage (from anywhere, after this folder is on the server):
#   bash deploy/guidance-discover-combined/apply-production.sh
# ==============================================================================

set -euo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/discover-detail-cleanup.css"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-discover-combined-${STAMP}"
MANIFEST="${BACKUP}/MANIFEST.txt"
PLANNED="${BACKUP}/PLANNED.txt"

CSS_START="/* ===== DISCOVER DETAIL CLEANUP ===== */"
CSS_END="/* ===== END DISCOVER DETAIL CLEANUP ===== */"

ALLOWLIST=(
  "app/globals.css"
  "app/discover/systems/[slug]/page.tsx"
  "components/guidance/discover/SystemEncyclopediaDetail.tsx"
  "components/guidance/discover/DiscoverCover.tsx"
  "components/guidance/discover/ProgramEncyclopediaDetail.tsx"
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
)

COPY_FILES=(
  "app/discover/systems/[slug]/page.tsx"
  "components/guidance/discover/SystemEncyclopediaDetail.tsx"
  "components/guidance/discover/DiscoverCover.tsx"
  "components/guidance/discover/ProgramEncyclopediaDetail.tsx"
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
)

FORBIDDEN_RX='(^|/)(prisma/|generated/)|counselor|journey-v2|zibal|Zibal|middleware\.ts|\.env|sms|Sms|SMS|PackagePayment|step10-'

c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
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

require_needles() {
  local f="$1"
  local role="$2"
  shift 2
  [[ -f "$f" ]] || die "$role missing: $f"
  local needle
  for needle in "$@"; do
    grep -qF -- "$needle" "$f" \
      || die "$role $f missing expected marker: $needle"
  done
}

forbid_needles() {
  local f="$1"
  local role="$2"
  shift 2
  [[ -f "$f" ]] || die "$role missing: $f"
  local needle
  for needle in "$@"; do
    grep -qF -- "$needle" "$f" \
      && die "$role $f still contains forbidden marker: $needle"
  done
}

assert_no_v2_in_copy_set() {
  local rel
  for rel in "${COPY_FILES[@]}"; do
    if [[ "$rel" == *journey-v2* ]]; then
      die "COPY_FILES accidentally includes a V2 step file: $rel"
    fi
  done
}

# ==============================================================================
# 0. Preflight
# ==============================================================================
step "0. Preflight"

[[ -d "$APP_ROOT" ]] || die "app root not found: $APP_ROOT"
cd "$APP_ROOT"
[[ -f package.json ]] || die "$APP_ROOT is not the Next.js app root"
[[ -d "$BUNDLE" ]] || die "bundle missing: $BUNDLE (copy deploy/guidance-discover-combined onto the server)"
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

SYSTEMS_PAGE="app/discover/systems/[slug]/page.tsx"
PROGRAMS_PAGE="app/discover/programs/[slug]/page.tsx"
COVER="components/guidance/discover/DiscoverCover.tsx"
PROGRAM_DETAIL="components/guidance/discover/ProgramEncyclopediaDetail.tsx"
DASHBOARD_UI="components/guidance/platform/GuidancePlatformDashboard.tsx"
DASHBOARD_PAGE="app/portal/student/services/guidance/page.tsx"
RESOLVER="app/portal/student/services/guidance/steps/page.tsx"

assert_no_v2_in_copy_set
ok "COPY_FILES contains no Guidance V2 step files"

[[ -f "$SYSTEMS_PAGE" ]] || die "missing $SYSTEMS_PAGE"
[[ -f "$PROGRAMS_PAGE" ]] || die "missing $PROGRAMS_PAGE"
[[ -f "$COVER" ]] || die "missing $COVER"
[[ -f "$PROGRAM_DETAIL" ]] || die "missing production ProgramEncyclopediaDetail"
[[ -f "$DASHBOARD_UI" ]] || die "missing production guidance dashboard"
[[ -f "lib/guidance/discover/systems.ts" ]] || die "missing systems data source"
[[ -f "lib/guidance/discover/programs.ts" ]] || die "missing programs data source"

if grep -qF 'SystemEncyclopediaDetail' "$SYSTEMS_PAGE"; then
  ok "systems detail already uses SystemEncyclopediaDetail — copy will refresh it"
elif grep -qF 'DiscoverCover' "$SYSTEMS_PAGE" && grep -qF 'discover-article' "$SYSTEMS_PAGE"; then
  ok "systems detail is the legacy article + DiscoverCover template"
else
  die "$SYSTEMS_PAGE is neither the legacy article nor the new encyclopedia page — refusing to overwrite"
fi

require_needles "$PROGRAMS_PAGE" "production" "ProgramEncyclopediaDetail"
ok "program details already use ProgramEncyclopediaDetail"

require_needles "$DASHBOARD_UI" "production" \
  "ورود به مسیر انتخاب رشته" \
  "خروج از حساب" \
  'action="/portal/logout"'
ok "production dashboard is the polished four-card surface with existing logout"

if [[ -f "$DASHBOARD_PAGE" ]]; then
  grep -q 'GuidancePlatformDashboard' "$DASHBOARD_PAGE" \
    || die "$DASHBOARD_PAGE does not render GuidancePlatformDashboard"
  ok "guidance page still mounts GuidancePlatformDashboard — page will NOT be modified"
fi

if [[ -f "$RESOLVER" ]]; then
  grep -q 'guidanceJourneyV2StepPath' "$RESOLVER" \
    || die "$RESOLVER is not the production V2 resolver"
  ok "production V2 resolver present — will NOT be modified"
fi

[[ -d "components/guidance/journey-v2" ]] || die "production V2 UI tree missing — refusing to run"
ok "V2 UI tree present — this run will not copy any file under it"

[[ -f "app/globals.css" ]] || die "missing app/globals.css"

for protected in \
  "lib/guidance/journey-v2/steps/step10-payment.ts" \
  "lib/guidance/journey-v2/steps/step10-discount.ts" \
  "lib/guidance/journey-v2/steps/step10-packages.ts" \
  "components/guidance/journey-v2/PackagePaymentV2Step.tsx" \
  "lib/guidance/discover/systems.ts" \
  "lib/guidance/discover/programs.ts" \
  "lib/guidance/discover/types.ts" \
  "app/portal/logout/route.ts" \
  "middleware.ts" \
  "prisma/schema.prisma"
do
  [[ -f "$protected" ]] || continue
  in_allowlist "$protected" && die "allowlist accidentally includes protected $protected"
done
ok "logout route, payment libs, middleware, Prisma, and Discover data are not in the allowlist"

for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing ${rel}"
  if [[ "$rel" == *journey-v2* ]]; then
    die "bundle path is a V2 file: $rel"
  fi
done

require_needles "${BUNDLE}/app/discover/systems/[slug]/page.tsx" "bundle" \
  "SystemEncyclopediaDetail" \
  "getDiscoverSystem" \
  "discoverWebPageJsonLd"
forbid_needles "${BUNDLE}/app/discover/systems/[slug]/page.tsx" "bundle" \
  "DiscoverCover" \
  "discover-article" \
  "next/image"

require_needles "${BUNDLE}/components/guidance/discover/SystemEncyclopediaDetail.tsx" "bundle" \
  "program-encyclopedia-hero--compact" \
  "item.overview" \
  "item.admission" \
  "item.tuition" \
  "item.studentLife" \
  "item.advantages" \
  "item.challenges" \
  "DiscoverFaq" \
  "DiscoverInsight" \
  "relatedForSystem"
forbid_needles "${BUNDLE}/components/guidance/discover/SystemEncyclopediaDetail.tsx" "bundle" \
  "discoverPhotoForSlug" \
  "next/image" \
  "/images/gallery/"

require_needles "${BUNDLE}/components/guidance/discover/DiscoverCover.tsx" "bundle" \
  "discover-cover--mark"
forbid_needles "${BUNDLE}/components/guidance/discover/DiscoverCover.tsx" "bundle" \
  "discoverPhotoForSlug" \
  "next/image" \
  "/images/gallery/"

require_needles "${BUNDLE}/components/guidance/discover/ProgramEncyclopediaDetail.tsx" "bundle" \
  "program-encyclopedia-back" \
  "item.description" \
  "item.suitableFor" \
  "ProgramAtAGlance"

require_needles "${BUNDLE}/${DASHBOARD_UI}" "bundle" \
  "ورود به مسیر انتخاب رشته" \
  "خروج از حساب" \
  'action="/portal/logout"' \
  'name="next"' \
  'value="/"'
forbid_needles "${BUNDLE}/${DASHBOARD_UI}" "bundle" \
  "journey-v2" \
  "PackagePayment" \
  "zibal"
ok "bundled Discover + dashboard files have the expected presentation contracts"

# ==============================================================================
# 1. Backup + rollback
# ==============================================================================
step "1. Backup scaffolding"

mkdir -p "$BACKUP"
: > "$MANIFEST"
: > "$PLANNED"

cat > "${BACKUP}/ROLLBACK.sh" <<ROLLBACK
#!/usr/bin/env bash
# Restore every file this combined run touched, then rebuild and restart.
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
# 2. Planned change list
# ==============================================================================
step "2. Planned change list"

{
  printf '%s\n' "${COPY_FILES[@]}"
  echo "app/globals.css"
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
step "3. Copy Discover + dashboard presentation files"

for rel in "${COPY_FILES[@]}"; do
  backup_file "$rel"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied  $rel"
done

require_needles "$SYSTEMS_PAGE" "after-copy" "SystemEncyclopediaDetail"
forbid_needles "$SYSTEMS_PAGE" "after-copy" "DiscoverCover" "discover-article"
forbid_needles "$COVER" "after-copy" "discoverPhotoForSlug" "next/image"
require_needles "$PROGRAM_DETAIL" "after-copy" "program-encyclopedia-back"
require_needles "$DASHBOARD_UI" "after-copy" \
  'action="/portal/logout"' \
  'name="next"' \
  'value="/"' \
  "خروج از حساب"
ok "copied files still expose the expected presentation contracts"

# ==============================================================================
# 4. Merge CSS (append once)
# ==============================================================================
step "4. Merge DISCOVER DETAIL CLEANUP CSS"

backup_file "app/globals.css"

if grep -qF "$CSS_START" app/globals.css; then
  ok "CSS block already present — not duplicated"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  grep -qF "$CSS_START" app/globals.css || die "CSS merge failed: start marker missing"
  grep -qF "$CSS_END" app/globals.css || die "CSS merge failed: end marker missing"
  ok "appended DISCOVER DETAIL CLEANUP block to app/globals.css"
fi

count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$count" == "1" ]] || die "globals.css has $count cleanup CSS blocks — expected 1"

# ==============================================================================
# 5. Manifest vs allowlist
# ==============================================================================
step "5. Confirm no unexpected writes"

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
# 6. Typecheck + build  (PM2 only after both pass)
# ==============================================================================
step "6. Typecheck"
if ! npx tsc --noEmit; then
  die "TypeScript failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "tsc --noEmit passed"

step "7. Build"
if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
  die "Build failed. Roll back with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "npm run build passed"

# ==============================================================================
# 8. Restart + readiness wait + smoke
# ==============================================================================
step "8. PM2 restart"
pm2 restart "$PM2_NAME" --update-env
pm2 status
ok "pm2 restarted $PM2_NAME"

step "9. Wait for local HTTP readiness (up to 45s)"

READY_URL="http://127.0.0.1:3000"
ready=0
attempt=0
while [[ "$attempt" -lt 45 ]]; do
  attempt=$((attempt + 1))
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$READY_URL" || true)"
  case "$code" in
    200|301|302|303|307|308)
      ok "ready after ${attempt}s ($code  $READY_URL)"
      ready=1
      break
      ;;
  esac
  info "waiting (${attempt}/45) got '${code:-none}'"
  sleep 1
done
[[ "$ready" -eq 1 ]] || die "app did not become ready at $READY_URL within 45s after PM2 restart"

step "10. Local HTTP smoke tests"

smoke() {
  local url="$1"
  local extra="${2:-}"
  local code
  # shellcheck disable=SC2086
  code="$(curl -sS -o /tmp/guidance-discover-combined-smoke.body -w '%{http_code}' \
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
smoke "${BASE}/discover/systems/payam-noor"
smoke "${BASE}/discover/systems/farhangian"
smoke "${BASE}/discover/systems"
smoke "${BASE}/discover/programs/payam-noor"
smoke "${BASE}/discover/programs"
smoke "${BASE}/entekhab"
smoke "${BASE}/" "-H Host: entekhab.setareganplus.ir"

# Logout is verified statically only. Never POST/GET /portal/logout here —
# that would revoke a real portal session cookie if one is present.
require_needles "$DASHBOARD_UI" "post-smoke" \
  'action="/portal/logout"' \
  'name="next"' \
  'value="/"'
ok "logout form still posts to existing /portal/logout with next=/ (no live session was cleared)"

ok "combined routes responded without 5xx"

trap - ERR

echo
echo "=== GUIDANCE + DISCOVER COMBINED FIX DEPLOYED ==="
echo "backup: ${BACKUP}"
echo "typecheck: PASS"
echo "build: PASS"
echo "pm2: restarted ${PM2_NAME}"
echo "nginx: NOT MODIFIED"
echo "middleware: NOT MODIFIED"
echo "logout route: NOT MODIFIED"
echo
echo "Rollback:"
echo "  bash ${BACKUP}/ROLLBACK.sh"
