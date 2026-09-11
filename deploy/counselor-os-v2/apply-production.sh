#!/usr/bin/env bash
#
# ==============================================================================
# Counselor OS v2 — production applier (DO NOT run until operators intend)
# ==============================================================================
#
# Upgrades /admin/counselor only. Does NOT touch Nginx, env, middleware,
# moshaver host routing, payment/Zibal, SMS, or student guidance dashboard.
#
# NEVER:
#   git pull / reset / checkout / clean / stash / commit
#   prisma db push / migrate dev / migrate reset / seed
#   DROP tables on rollback
#   overwrite globals.css or schema.prisma wholesale
#
# Usage (after this folder is on the server):
#   bash deploy/counselor-os-v2/apply-production.sh
# ==============================================================================

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/counselor-os-v2.css"
SCHEMA_FRAGMENT="${SCRIPT_DIR}/schema-counselor-os-v2.prisma"
SCHEMA_MERGER="${SCRIPT_DIR}/merge_schema.py"
MIGRATION_NAME="20260904080000_counselor_os_case_corrections"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/counselor-os-v2-${STAMP}"
MANIFEST="${BACKUP}/MANIFEST.txt"
PLANNED="${BACKUP}/PLANNED.txt"
REPORT="${BACKUP}/REPORT.txt"

CSS_START="/* ===== COUNSELOR OS V2 ===== */"
CSS_END="/* ===== END COUNSELOR OS V2 ===== */"

COPY_FILES=(
  "lib/counselor-os/advisor.ts"
  "lib/counselor-os/appointments.ts"
  "lib/counselor-os/auth.ts"
  "lib/counselor-os/booking.ts"
  "lib/counselor-os/constants.ts"
  "lib/counselor-os/corrections.ts"
  "lib/counselor-os/dashboard.ts"
  "lib/counselor-os/finance.ts"
  "lib/counselor-os/follow-ups.ts"
  "lib/counselor-os/host.ts"
  "lib/counselor-os/index.ts"
  "lib/counselor-os/labels.ts"
  "lib/counselor-os/notes.ts"
  "lib/counselor-os/reports.ts"
  "lib/counselor-os/sessions.ts"
  "lib/counselor-os/student-advisor.ts"
  "lib/counselor-os/students.ts"
  "lib/counselor-os/v2-catalog.ts"
  "lib/counselor-os/v2-dossier.ts"
  "lib/counselor-os/view-models.ts"
  "app/admin/counselor/actions.ts"
  "app/admin/counselor/layout.tsx"
  "app/admin/counselor/page.tsx"
  "app/admin/counselor/appointments/page.tsx"
  "app/admin/counselor/calendar/page.tsx"
  "app/admin/counselor/follow-ups/page.tsx"
  "app/admin/counselor/settings/page.tsx"
  "app/admin/counselor/sessions/[sessionId]/page.tsx"
  "app/admin/counselor/students/page.tsx"
  "app/admin/counselor/students/[studentId]/page.tsx"
  "app/admin/counselor/students/[studentId]/export/[kind]/page.tsx"
  "app/admin/counselor/students/[studentId]/documents/[documentId]/download/route.ts"
  "components/counselor-os/AvailabilityRuleForm.tsx"
  "components/counselor-os/CounselorShell.tsx"
  "components/counselor-os/CounselorStudentCaseTabs.tsx"
  "components/counselor-os/OpenSessionButton.tsx"
  "components/counselor-os/SessionWorkspaceForm.tsx"
  "content/admin.ts"
  "prisma/migrations/20260904080000_counselor_os_case_corrections/migration.sql"
)

ALLOWLIST=(
  "${COPY_FILES[@]}"
  "app/globals.css"
  "prisma/schema.prisma"
)

FORBIDDEN_RX='journey-v2|PackagePayment|zibal|Zibal|middleware\.ts|\.env|nginx|pm2\.|ecosystem\.config|GuidancePlatformDashboard|counseling-actions|StudentCounselingPanel|StudentCounselingBookingForm|guidance/page\.tsx|SmsTemplate|smsir|sms-provider|sms-params'

PROTECTED_FILES=(
  "middleware.ts"
  "app/portal/student/services/guidance/page.tsx"
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
  "app/portal/student/services/guidance/steps/page.tsx"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "lib/communication/sms-provider.ts"
  "app/admin/(dashboard)/guidance/page.tsx"
)

c_red() { printf '\033[31m%s\033[0m\n' "$*"; }
step()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()    { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
info()  { printf '    ..   %s\n' "$*"; }

die() {
  echo >&2
  c_red "ABORT: $*"
  if [[ -f "${BACKUP}/ROLLBACK.sh" ]]; then
    echo >&2 "Restore files with: bash ${BACKUP}/ROLLBACK.sh"
    echo >&2 "Database counselor_case_corrections is NOT auto-dropped."
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

require_needles() {
  local f="$1"
  local role="$2"
  shift 2
  [[ -f "$f" ]] || die "$role missing: $f"
  local needle
  for needle in "$@"; do
    if ! grep -qF -- "$needle" "$f"; then
      die "$role $f missing expected marker: $needle"
    fi
  done
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

hash_file() {
  local f="$1"
  if [[ -f "$f" ]]; then
    sha256sum -- "$f" | awk '{print $1}'
  else
    echo "MISSING"
  fi
}

snapshot_protected() {
  local out="$1"
  : > "$out"
  local f
  for f in "${PROTECTED_FILES[@]}"; do
    printf '%s %s\n' "$(hash_file "$f")" "$f" >> "$out"
  done
}

assert_protected_unchanged() {
  local before="$1"
  local after="$2"
  local role="$3"
  if ! cmp -s "$before" "$after"; then
    echo "protected file hash drift ($role):" >&2
    diff -u "$before" "$after" >&2 || true
    die "a protected production file changed $role — aborting"
  fi
}

step "0. Preflight"

if grep -q $'\r' "$0"; then
  die "apply-production.sh has CRLF line endings — convert to LF"
fi

[[ -d "$APP_ROOT" ]] || die "app root not found: $APP_ROOT"
cd "$APP_ROOT"
[[ -f package.json ]] || die "$APP_ROOT is not the Next.js app root"
[[ -d "$BUNDLE" ]] || die "bundle missing: $BUNDLE"
[[ -f "$CSS_FRAGMENT" ]] || die "missing CSS fragment"
[[ -f "$SCHEMA_FRAGMENT" ]] || die "missing schema fragment"
[[ -f "$SCHEMA_MERGER" ]] || die "missing merge_schema.py"

if ! grep -qF "$CSS_START" "$CSS_FRAGMENT"; then
  die "CSS fragment missing start marker"
fi
if ! grep -qF "$CSS_END" "$CSS_FRAGMENT"; then
  die "CSS fragment missing end marker"
fi
if grep -qF "guidance-counseling" "$CSS_FRAGMENT"; then
  die "CSS fragment contains student counseling styles — refuse"
fi

require_cmd python3
require_cmd npx
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd install
require_cmd sha256sum
require_cmd cmp
require_cmd find

mkdir -p "$BACKUP"
PROTECTED_BEFORE="${BACKUP}/protected-before.sha256"
PROTECTED_AFTER_PREFLIGHT="${BACKUP}/protected-after-preflight.sha256"
PROTECTED_AFTER_APPLY="${BACKUP}/protected-after-apply.sha256"
snapshot_protected "$PROTECTED_BEFORE"
ok "recorded protected production file hashes"

for rel in "${COPY_FILES[@]}"; do
  if [[ "$rel" =~ $FORBIDDEN_RX ]]; then
    die "COPY_FILES contains forbidden path: $rel"
  fi
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing ${rel}"
  in_allowlist "$rel" || die "COPY_FILES entry is not allowlisted: $rel"
done
ok "all bundled copy files present and allowlisted"

bundle_extra=0
while IFS= read -r -d '' found; do
  rel="${found#${BUNDLE}/}"
  rel="${rel#/}"
  expected=0
  for copy in "${COPY_FILES[@]}"; do
    if [[ "$rel" == "$copy" ]]; then
      expected=1
      break
    fi
  done
  if [[ "$expected" -ne 1 ]]; then
    c_red "    unexpected bundle file: $rel"
    bundle_extra=1
  fi
done < <(find "$BUNDLE" -type f -print0)
[[ "$bundle_extra" -eq 0 ]] || die "bundle files/ contains files outside COPY_FILES"

for bad in \
  "app/portal/student/services/guidance/page.tsx" \
  "components/guidance/platform/GuidancePlatformDashboard.tsx" \
  "components/counselor-os/StudentCounselingPanel.tsx" \
  "middleware.ts"
do
  if [[ -f "${BUNDLE}/${bad}" ]]; then
    die "bundle must not contain $bad"
  fi
done

require_needles "prisma/schema.prisma" "production" \
  "model BookingAdvisor" \
  "model GuidancePlan" \
  "model Student" \
  "model CounselorFollowUp"
ok "Counselor OS foundation models are present"

MIGRATION_SQL="${BUNDLE}/prisma/migrations/${MIGRATION_NAME}/migration.sql"
require_needles "$MIGRATION_SQL" "bundle" \
  "CREATE TABLE \"counselor_case_corrections\"" \
  "cos_corr_org_stu_at_idx"
if grep -Eiq 'drop table|drop column|truncate |delete from |alter table .+\bdrop\b' "$MIGRATION_SQL"; then
  die "migration SQL contains destructive operations"
fi

step "0b. Prisma migration status (inspect only)"
MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-preflight.txt"
set +e
npx prisma migrate status > "$MIGRATE_STATUS_FILE" 2>&1
migrate_rc=$?
set -e
info "prisma migrate status exit=$migrate_rc"
if [[ -s "$MIGRATE_STATUS_FILE" ]]; then
  sed 's/^/    /' "$MIGRATE_STATUS_FILE" | head -n 80
fi
if grep -q '20260831090000_guidance_counselor_workspace_phase_2' "$MIGRATE_STATUS_FILE"; then
  if grep -Eiq "not yet been applied|Pending" "$MIGRATE_STATUS_FILE"; then
    if grep -E 'not yet been applied|Pending' -A 20 "$MIGRATE_STATUS_FILE" | grep -q '20260831090000_guidance_counselor_workspace_phase_2'; then
      die "Phase 2 guidance counselor workspace migration is pending — refusing"
    fi
  fi
fi
if grep -Eiq "have not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  pending_block="$(
    awk '/not yet been applied|Following migration/{flag=1;next} /^$/{if(flag){exit}} flag' "$MIGRATE_STATUS_FILE" || true
  )"
  if echo "$pending_block" | grep -E '^[0-9]{14}_' | grep -v "$MIGRATION_NAME" >/dev/null; then
    echo "$pending_block"
    die "other pending Prisma migrations exist — refusing to continue"
  fi
fi

snapshot_protected "$PROTECTED_AFTER_PREFLIGHT"
assert_protected_unchanged "$PROTECTED_BEFORE" "$PROTECTED_AFTER_PREFLIGHT" "during preflight"

step "1. Backup scaffolding"
: > "$MANIFEST"
: > "$PLANNED"
cat > "${BACKUP}/ROLLBACK.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
cd "${APP_ROOT}"
echo "==> Restoring files from ${BACKUP}"
while IFS= read -r line; do
  case "\$line" in
    NEW:*)
      f="\${line#NEW:}"
      [[ -f "\$f" ]] && rm -f "\$f"
      ;;
    "")
      ;;
    *)
      install -D "${BACKUP}/\$line" "\$line"
      ;;
  esac
done < "${MANIFEST}"
npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
pm2 restart ${PM2_NAME} --update-env
echo "File rollback complete. counselor_case_corrections was NOT dropped."
ROLLBACK
chmod +x "${BACKUP}/ROLLBACK.sh"

{
  printf '%s\n' "${COPY_FILES[@]}"
  echo "app/globals.css"
  echo "prisma/schema.prisma"
} | sort -u > "$PLANNED"

step "3. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  backup_file "$rel"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied  $rel"
done

step "4. Merge COUNSELOR OS V2 CSS"
backup_file "app/globals.css"
if grep -qF "$CSS_START" app/globals.css; then
  ok "CSS block already present — not duplicated"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  grep -qF "$CSS_START" app/globals.css || die "CSS merge failed"
  ok "appended COUNSELOR OS V2 CSS block"
fi
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count V2 CSS blocks — expected 1"

step "5. Surgical Prisma schema merge"
backup_file "prisma/schema.prisma"
python3 "$SCHEMA_MERGER" prisma/schema.prisma "$SCHEMA_FRAGMENT"
require_needles "prisma/schema.prisma" "after-merge" \
  "model CounselorCaseCorrection" \
  "model CounselorFollowUp" \
  "model BookingAdvisor"

snapshot_protected "$PROTECTED_AFTER_APPLY"
assert_protected_unchanged "$PROTECTED_BEFORE" "$PROTECTED_AFTER_APPLY" "after allowlisted writes"

step "7. Database migration (additive only)"
MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-pre-apply.txt"
set +e
npx prisma migrate status > "$MIGRATE_STATUS_FILE" 2>&1
set -e

PRISMA_MIG_SQL="${BACKUP}/.prisma-migrations.sql"
cat > "$PRISMA_MIG_SQL" <<SQL
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '${MIGRATION_NAME}',
  '20260903120000_counselor_os_foundation',
  '20260831090000_guidance_counselor_workspace_phase_2'
)
ORDER BY migration_name;
SQL

recorded_ours=0
set +e
if npx prisma db execute --file "$PRISMA_MIG_SQL" > "${BACKUP}/.prisma-migrations.out" 2>&1; then
  if grep -q "$MIGRATION_NAME" "${BACKUP}/.prisma-migrations.out"; then
    recorded_ours=1
  fi
fi
set -e

TABLE_PRE_SQL="${BACKUP}/.table-precheck.sql"
cat > "$TABLE_PRE_SQL" <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'counselor_case_corrections';
SQL
tables_exist=0
set +e
if npx prisma db execute --file "$TABLE_PRE_SQL" > "${BACKUP}/.table-precheck.out" 2>&1; then
  if grep -q counselor_case_corrections "${BACKUP}/.table-precheck.out"; then
    tables_exist=1
  fi
fi
set -e

if grep -Eiq "have not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  pending_block="$(
    awk '/not yet been applied|Following migration/{flag=1;next} /^$/{if(flag){exit}} flag' "$MIGRATE_STATUS_FILE" || true
  )"
  if echo "$pending_block" | grep -q '20260831090000_guidance_counselor_workspace_phase_2'; then
    die "refusing to rerun Phase 2 guidance counselor workspace migration"
  fi
  if echo "$pending_block" | grep -E '^[0-9]{14}_' | grep -v "$MIGRATION_NAME" >/dev/null; then
    die "migrate deploy would apply unexpected additional migrations"
  fi
fi

MIGRATION_RESULT="skipped"
if [[ "$recorded_ours" -eq 1 ]]; then
  MIGRATION_RESULT="already-applied"
  ok "migration already recorded — skipped"
elif [[ "$tables_exist" -eq 1 ]]; then
  die "counselor_case_corrections exists but ${MIGRATION_NAME} is not recorded"
elif grep -q "$MIGRATION_NAME" "$MIGRATE_STATUS_FILE" && grep -Eiq "not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  if ! npx prisma migrate deploy; then
    die "prisma migrate deploy failed. Files can be rolled back; DB rollback is manual."
  fi
  MIGRATION_RESULT="applied"
  ok "prisma migrate deploy completed"
else
  die "cannot determine a safe migrate deploy gate for ${MIGRATION_NAME}"
fi

step "8. prisma generate"
npx prisma generate || die "prisma generate failed"

step "9. Typecheck"
npx tsc --noEmit || die "TypeScript failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh"

step "10. Build"
NODE_OPTIONS="--max-old-space-size=4096" npm run build || die "Build failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh"

if [[ -f "app/portal/student/services/guidance/steps/page.tsx" ]]; then
  grep -q 'guidanceJourneyV2StepPath' "app/portal/student/services/guidance/steps/page.tsx" \
    || die "V2 resolver marker missing after build"
fi
snapshot_protected "${BACKUP}/protected-after-build.sha256"
assert_protected_unchanged "$PROTECTED_BEFORE" "${BACKUP}/protected-after-build.sha256" "after build"

step "11. PM2 restart"
pm2 restart "$PM2_NAME" --update-env
pm2 status

step "12. Readiness + smoke"
READY_URL="http://127.0.0.1:3000"
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
  code="$(curl -sS -o /tmp/counselor-os-v2-smoke.body -w '%{http_code}' --max-time 20 "$url" || true)"
  case "$code" in
    200|301|302|303|307|308) ok "$code  $url" ;;
    *) die "smoke failed: $url returned '$code'" ;;
  esac
}
BASE="http://127.0.0.1:3000"
smoke "${BASE}/admin/counselor"
smoke "${BASE}/admin/counselor/students"
smoke "${BASE}/admin/counselor/calendar"
smoke "${BASE}/admin/counselor/appointments"
smoke "${BASE}/admin/counselor/follow-ups"
smoke "${BASE}/admin/counselor/settings"
smoke "${BASE}/admin/guidance"

trap - ERR
{
  echo "=== COUNSELOR OS V2 DEPLOY REPORT ==="
  echo "backup: ${BACKUP}"
  echo "migration: ${MIGRATION_RESULT} (${MIGRATION_NAME})"
  echo "tsc: PASS"
  echo "build: PASS"
  echo "pm2: restarted ${PM2_NAME}"
  echo "protected files: unchanged"
  echo "rollback: bash ${BACKUP}/ROLLBACK.sh"
} | tee "$REPORT"
