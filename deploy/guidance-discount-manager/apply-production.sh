#!/usr/bin/env bash
#
# Guidance package discount-code manager — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset, prisma db push, migrate reset, overwrite Zibal,
#        middleware, page.early.tsx, or the Steps 11–18 bundle.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/guidance-discount-manager.css"
SCHEMA_FRAGMENT="${SCRIPT_DIR}/schema-guidance-discount.prisma"
SCHEMA_MERGER="${SCRIPT_DIR}/merge_schema.py"
STEP10_PATCH="${SCRIPT_DIR}/patch_step10.py"
MIGRATION_NAME="20260905220000_guidance_discount_codes"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-discount-manager-${STAMP}"

CSS_START="/* ===== GUIDANCE DISCOUNT MANAGER ===== */"
CSS_END="/* ===== END GUIDANCE DISCOUNT MANAGER ===== */"

COPY_FILES=(
  "lib/guidance/discounts/packages.ts"
  "lib/guidance/discounts/money.ts"
  "lib/guidance/discounts/legacy.ts"
  "lib/guidance/discounts/generate.ts"
  "lib/guidance/discounts/quote.ts"
  "lib/guidance/discounts/store.ts"
  "lib/guidance/discounts/student.ts"
  "lib/guidance/journey/payment.ts"
  "app/admin/(dashboard)/guidance/discounts/page.tsx"
  "app/admin/(dashboard)/guidance/discounts/actions.ts"
  "components/admin/guidance/DiscountCodeManager.tsx"
  "prisma/migrations/${MIGRATION_NAME}/migration.sql"
)

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal.ts|*middleware.ts*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

[[ -f "$CSS_FRAGMENT" ]] || die "missing CSS fragment"
grep -qF "$CSS_START" "$CSS_FRAGMENT" || die "CSS fragment missing start marker"
grep -qF "$CSS_END" "$CSS_FRAGMENT" || die "CSS fragment missing end marker"
[[ -f "$SCHEMA_FRAGMENT" ]] || die "missing schema fragment"
[[ -f "$SCHEMA_MERGER" ]] || die "missing schema merger"

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
start = "/* ===== GUIDANCE DISCOUNT MANAGER ===== */"
end = "/* ===== END GUIDANCE DISCOUNT MANAGER ===== */"
frag = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8").strip()
from_ = text.find(start)
to = text.find(end)
if from_ < 0 or to < 0 or to <= from_:
    raise SystemExit("existing discount CSS markers unusable")
css.write_text(text[:from_] + frag + text[to + len(end):], encoding="utf-8", newline="\n")
PY
  ok "replaced discount CSS block"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  ok "appended discount CSS block"
fi
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count discount CSS blocks — expected 1"

step "3. Merge Prisma schema"
backup_file "prisma/schema.prisma"
python3 "$SCHEMA_MERGER" prisma/schema.prisma "$SCHEMA_FRAGMENT"
ok "schema merge"
grep -q "model GuidanceDiscountCode" prisma/schema.prisma || die "schema merge missing model"

step "4. Overlay Step 10 preview if present"
STEP10="app/portal/student/services/guidance/journey/steps/actions/step10.ts"
if [[ -f "$STEP10" ]]; then
  backup_file "$STEP10"
  python3 "$STEP10_PATCH" "$STEP10"
  ok "step10 overlay"
else
  ok "step10.ts not present — skipped (V1 payment.ts still accepts discountCode)"
fi

step "5. Nav + workspace link"
if ! grep -q "/admin/guidance/discounts" content/admin.ts; then
  backup_file "content/admin.ts"
  python3 - <<'PY'
from pathlib import Path
p = Path("content/admin.ts")
text = p.read_text(encoding="utf-8")
needle = '''        href: "/admin/counselor",
        label: "سامانه مشاور",'''
extra = '''
      {
        href: "/admin/guidance/discounts",
        label: "کدهای تخفیف انتخاب رشته",
        icon: "finance",
        enabled: true,
        permission: "settings.manage",
      },'''
if needle not in text:
    raise SystemExit("nav anchor missing")
idx = text.find(needle)
end = text.find("},", idx)
if end < 0:
    raise SystemExit("nav block end missing")
end = end + 2
p.write_text(text[:end] + extra + text[end:], encoding="utf-8", newline="\n")
PY
  ok "nav inserted"
else
  ok "nav already present"
fi

GUIDANCE_PAGE="app/admin/(dashboard)/guidance/page.tsx"
if [[ -f "$GUIDANCE_PAGE" ]] && ! grep -q "/admin/guidance/discounts" "$GUIDANCE_PAGE"; then
  backup_file "$GUIDANCE_PAGE"
  python3 - <<'PY'
from pathlib import Path
p = Path("app/admin/(dashboard)/guidance/page.tsx")
text = p.read_text(encoding="utf-8")
if "/admin/guidance/discounts" in text:
    raise SystemExit(0)
needle = '{canReview ? "" : " · دسترسی شما فقط مشاهده است."}'
insert = '''{canReview ? "" : " · دسترسی شما فقط مشاهده است."}
        {hasPermission(session, "settings.manage") ? (
          <>
            {" · "}
            <Link href="/admin/guidance/discounts">مدیریت کدهای تخفیف</Link>
          </>
        ) : null}'''
if needle not in text:
    raise SystemExit("guidance page anchor missing")
p.write_text(text.replace(needle, insert, 1), encoding="utf-8", newline="\n")
PY
  ok "workspace link inserted"
else
  ok "workspace link already present or page missing"
fi

step "6. Prisma migrate"
STATUS="$(npx prisma migrate status 2>&1 || true)"
if echo "$STATUS" | grep -qi "Database schema is up to date"; then
  ok "schema up to date — $MIGRATION_NAME already applied, no pending migrations"
elif echo "$STATUS" | grep -A40 "have not yet been applied" | grep -q "$MIGRATION_NAME"; then
  npx prisma migrate deploy
  ok "migration deployed"
elif echo "$STATUS" | grep -q "$MIGRATION_NAME"; then
  ok "migration $MIGRATION_NAME already applied"
else
  npx prisma migrate deploy
  AFTER="$(npx prisma migrate status 2>&1 || true)"
  if echo "$AFTER" | grep -q "$MIGRATION_NAME"; then
    ok "migration deployed or already present"
  else
    die "discount migration $MIGRATION_NAME is missing after migrate deploy"
  fi
fi
npx prisma generate
ok "prisma generate"

step "7. Typecheck + build"
export NODE_OPTIONS="--max-old-space-size=4096"
npx tsc --noEmit
ok "tsc"
npm run build
ok "build"

step "8. PM2"
npx pm2 restart "$PM2_NAME"
ok "pm2 restarted"

step "9. Smoke"
[[ -f "app/admin/(dashboard)/guidance/discounts/page.tsx" ]] || die "admin page missing"
grep -q "quoteGuidancePackageDiscount" lib/guidance/discounts/quote.ts || die "resolver missing"
grep -q "findLegacyGuidanceDiscountAsync" lib/guidance/discounts/legacy.ts || die "legacy fallback missing"
[[ ! -f "lib/payment/providers/zibal.ts" ]] || ok "zibal file left in place"
ok "smoke checks passed"
printf '\nDONE backup=%s\n' "$BACKUP"
