#!/usr/bin/env bash
#
# Guidance discount + checkout engine — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset, prisma migrate/db push, edit .env,
#        overwrite middleware, Zibal HTTP, page.early.tsx,
#        Prisma schema, or the Step 10 package catalog prices.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/guidance-discount-manager.css"
SPINNER_FRAGMENT="${SCRIPT_DIR}/guidance-checkout-spinner.css"
STEP10_PATCH="${SCRIPT_DIR}/patch_step10_checkout.py"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-discount-checkout-engine-${STAMP}"
READY_URL="http://127.0.0.1:3000"

CSS_START="/* ===== GUIDANCE DISCOUNT MANAGER ===== */"
CSS_END="/* ===== END GUIDANCE DISCOUNT MANAGER ===== */"

COPY_FILES=(
  "lib/guidance/discounts/engine.ts"
  "lib/guidance/discounts/money.ts"
  "lib/guidance/discounts/quote.ts"
  "lib/guidance/discounts/student.ts"
  "lib/guidance/discounts/store.ts"
  "lib/guidance/discounts/legacy.ts"
  "lib/guidance/discounts/status.ts"
  "lib/guidance/discounts/validate.ts"
  "lib/guidance/discounts/generate.ts"
  "lib/guidance/discounts/packages.ts"
  "lib/guidance/packages/resolve-payable.ts"
  "lib/guidance/checkout/financials.ts"
  "lib/guidance/journey/payment.ts"
  "app/admin/(dashboard)/guidance/discounts/page.tsx"
  "app/admin/(dashboard)/guidance/discounts/actions.ts"
  "components/admin/guidance/DiscountCodeManager.tsx"
  "components/guidance/journey-v2/PackagePaymentV2Step.tsx"
  "components/guidance/journey-v2/GuidanceJourneyV2Nav.tsx"
  "app/portal/student/services/guidance/journey/steps/actions/step10.ts"
  "app/payments/callback/guidance/page.tsx"
  "app/payments/mock/guidance-checkout/[sessionId]/actions.ts"
  "scripts/guidance-discount-engine-unit-tests.ts"
  "scripts/guidance-checkout-handoff-unit-tests.ts"
)

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "lib/guidance/journey-v2/steps/step10-packages.ts"
  "prisma/schema.prisma"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$1"; }

PM2_STARTED=0
on_err() {
  if [[ "$PM2_STARTED" -eq 0 ]]; then
    echo "FAILED before PM2 restart — running process left untouched. backup=$BACKUP"
  else
    echo "FAILED after PM2 restart. backup=$BACKUP"
  fi
}
trap on_err ERR

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal.ts|*/zibal-http.ts|*middleware.ts*|*/step10-packages.ts|*schema.prisma*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

[[ -f "$CSS_FRAGMENT" ]] || die "missing CSS fragment"
grep -qF "$CSS_START" "$CSS_FRAGMENT" || die "CSS fragment missing start marker"
grep -qF "$CSS_END" "$CSS_FRAGMENT" || die "CSS fragment missing end marker"
[[ -f "$SPINNER_FRAGMENT" ]] || die "missing spinner CSS"
[[ -f "$STEP10_PATCH" ]] || die "missing Step 10 patch"

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

step "Backup"
mkdir -p "$BACKUP"
backup_file() {
  local rel="$1"
  [[ -f "$APP_ROOT/$rel" ]] || return 0
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$APP_ROOT/$rel" "$BACKUP/$rel"
}
for rel in "${COPY_FILES[@]}" "${PROTECTED[@]}" "app/globals.css"; do
  backup_file "$rel"
done
ok "$BACKUP"

step "Refuse local stubs / protected overwrites"
EARLY="app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
if [[ -f "$EARLY" ]] && grep -q "GuidanceV2EarlyStepsStub" "$EARLY"; then
  die "production page.early.tsx looks like the local stub — aborting"
fi
for rel in "${PROTECTED[@]}"; do
  if [[ -f "${BUNDLE}/${rel}" ]]; then
    die "bundle must not contain protected file: $rel"
  fi
done
ok "protected paths not in bundle"

step "Copy engine files"
for rel in "${COPY_FILES[@]}"; do
  src="$BUNDLE/$rel"
  [[ -f "$src" ]] || die "missing bundle file: $rel"
  mkdir -p "$APP_ROOT/$(dirname "$rel")"
  cp -a "$src" "$APP_ROOT/$rel"
  ok "$rel"
done

STEP10_REL="app/portal/student/services/guidance/journey/steps/actions/step10.ts"
step "Harden Step 10 checkout return (no external redirect)"
python3 "$STEP10_PATCH" "$APP_ROOT/$STEP10_REL"
ok "step10 return-url guard"

step "Patch admin CSS"
export APP_ROOT CSS_FRAGMENT SPINNER_FRAGMENT
python3 - <<'PY'
from pathlib import Path
import os
root = Path(os.environ.get("APP_ROOT", "/var/www/setareganplus"))
css_path = root / "app/globals.css"
fragment = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8")
spinner = Path(os.environ["SPINNER_FRAGMENT"]).read_text(encoding="utf-8")
text = css_path.read_text(encoding="utf-8")
start = "/* ===== GUIDANCE DISCOUNT MANAGER ===== */"
end = "/* ===== END GUIDANCE DISCOUNT MANAGER ===== */"
from_ = text.find(start)
to = text.find(end)
if from_ >= 0 and to > from_:
    text = text[:from_] + fragment.rstrip() + "\n" + text[to + len(end):].lstrip("\n")
elif start not in text:
    text = text.rstrip() + "\n\n" + fragment
if ".gjv2-nav__spinner" not in text:
    text = text.rstrip() + "\n\n" + spinner + "\n"
css_path.write_text(text, encoding="utf-8", newline="\n")
print("css-updated")
PY
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count discount CSS blocks — expected 1"
ok "css patched"

step "Unit tests"
npx tsx scripts/guidance-discount-engine-unit-tests.ts
ok "discount engine tests"
npx tsx scripts/guidance-checkout-handoff-unit-tests.ts
ok "checkout handoff tests"

step "Typecheck"
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
ok "tsc"

step "Build"
NODE_OPTIONS="--max-old-space-size=4096" npm run build
ok "build"

step "PM2 restart"
if command -v pm2 >/dev/null 2>&1; then
  PM2_STARTED=1
  pm2 restart "$PM2_NAME" --update-env
  pm2 status
  ok "pm2 restarted"
else
  die "pm2 not found; aborting without a manual restart"
fi

step "Readiness + smoke"
ready=0
attempt=0
while [[ "$attempt" -lt 45 ]]; do
  attempt=$((attempt + 1))
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$READY_URL" || true)"
  case "$code" in
    200|301|302|303|307|308) ready=1; break ;;
  esac
  sleep 1
done
[[ "$ready" -eq 1 ]] || die "app did not become ready at $READY_URL"

smoke() {
  local url="$1"
  local code
  code="$(curl -sS -o /tmp/guidance-discount-checkout-smoke.body -w '%{http_code}' --max-time 20 "$url" || true)"
  case "$code" in
    200|301|302|303|307|308) ok "$code  $url" ;;
    *) die "smoke failed: $url returned '$code'" ;;
  esac
}
BASE="$READY_URL"
smoke "${BASE}/admin/guidance/discounts"
smoke "${BASE}/portal/student/services/guidance"
smoke "${BASE}/portal/student/services/guidance/journey/steps"
smoke "${BASE}/payments/callback/guidance"

[[ -f "lib/guidance/discounts/engine.ts" ]] || die "engine missing"
grep -q "calculateGuidanceDiscount" lib/guidance/discounts/engine.ts || die "canonical engine missing"
grep -q "assertCanonicalStoredFixedAmountRials" lib/guidance/discounts/quote.ts || die "FIXED fail-closed missing"
grep -q "checkoutUrl: started.checkoutUrl" "$STEP10_REL" || die "step10 must return checkoutUrl"
grep -q "window.location.assign(state.checkoutUrl)" components/guidance/journey-v2/PackagePaymentV2Step.tsx \
  || die "secure-payment client navigation missing"
[[ ! -f "lib/payment/providers/zibal.ts" ]] || ok "zibal file left in place"
[[ -f "lib/guidance/journey-v2/steps/step10-packages.ts" ]] || die "production catalog missing"
if grep -q "GuidanceV2EarlyStepsStub" "$EARLY" 2>/dev/null; then
  die "page.early.tsx became the local stub"
fi
ok "smoke checks passed"

trap - ERR
printf '\nDONE backup=%s\n' "$BACKUP"
