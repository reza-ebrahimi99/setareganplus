#!/usr/bin/env bash
#
# ==============================================================================
# Counselor OS SAFE — admin-only production applier
# ==============================================================================
#
# Activates /admin/counselor/* only. Does NOT wire student booking cards,
# GuidancePlatformDashboard, middleware, Nginx, or /admin/guidance.
#
# NEVER:
#   git pull / reset / checkout / clean / stash / commit
#   prisma db push / migrate dev / migrate reset / seed
#   DROP Counselor tables on rollback
#   overwrite globals.css or schema.prisma wholesale
#   touch Guidance V2, payment, SMS, middleware, env, PM2 config
#
# Usage (after this folder is on the server):
#   bash deploy/counselor-os-safe/apply-production.sh
# ==============================================================================

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/counselor-os-safe.css"
SCHEMA_FRAGMENT="${SCRIPT_DIR}/schema-counselor-os.prisma"
SCHEMA_MERGER="${SCRIPT_DIR}/merge_schema.py"
MIGRATION_NAME="20260903120000_counselor_os_foundation"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/counselor-os-safe-${STAMP}"
MANIFEST="${BACKUP}/MANIFEST.txt"
PLANNED="${BACKUP}/PLANNED.txt"
REPORT="${BACKUP}/REPORT.txt"

CSS_START="/* ===== COUNSELOR OS SAFE ===== */"
CSS_END="/* ===== END COUNSELOR OS SAFE ===== */"

COPY_FILES=(
  "lib/counselor-os/advisor.ts"
  "lib/counselor-os/appointments.ts"
  "lib/counselor-os/auth.ts"
  "lib/counselor-os/booking.ts"
  "lib/counselor-os/constants.ts"
  "lib/counselor-os/dashboard.ts"
  "lib/counselor-os/follow-ups.ts"
  "lib/counselor-os/host.ts"
  "lib/counselor-os/index.ts"
  "lib/counselor-os/notes.ts"
  "lib/counselor-os/sessions.ts"
  "lib/counselor-os/student-advisor.ts"
  "lib/counselor-os/students.ts"
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
  "components/counselor-os/AvailabilityRuleForm.tsx"
  "components/counselor-os/CounselorShell.tsx"
  "components/counselor-os/CounselorStudentCaseTabs.tsx"
  "components/counselor-os/OpenSessionButton.tsx"
  "components/counselor-os/SessionWorkspaceForm.tsx"
  "prisma/migrations/20260903120000_counselor_os_foundation/migration.sql"
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
    echo >&2 "Database Counselor tables are NOT auto-dropped."
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

has_needle() {
  local f="$1" needle="$2"
  grep -qF -- "$needle" "$f"
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

reject_if_present() {
  local f="$1"
  local role="$2"
  shift 2
  [[ -f "$f" ]] || die "$role missing: $f"
  local needle
  for needle in "$@"; do
    if grep -qF -- "$needle" "$f"; then
      die "$role $f contains forbidden marker: $needle"
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

# ==============================================================================
# 0. Preflight
# ==============================================================================
step "0. Preflight"

if grep -q $'\r' "$0"; then
  die "apply-production.sh has CRLF line endings — convert to LF"
fi

[[ -d "$APP_ROOT" ]] || die "app root not found: $APP_ROOT"
cd "$APP_ROOT"
[[ "$(pwd -P)" == "$APP_ROOT" ]] || [[ -f "$APP_ROOT/package.json" ]] || die "not in $APP_ROOT"
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

info "app root : $(pwd)"
info "bundle   : $BUNDLE"
info "backup   : $BACKUP"

mkdir -p "$BACKUP"
PROTECTED_BEFORE="${BACKUP}/protected-before.sha256"
PROTECTED_AFTER_PREFLIGHT="${BACKUP}/protected-after-preflight.sha256"
PROTECTED_AFTER_APPLY="${BACKUP}/protected-after-apply.sha256"
snapshot_protected "$PROTECTED_BEFORE"
ok "recorded protected production file hashes (read-only)"

for rel in "${COPY_FILES[@]}"; do
  if [[ "$rel" =~ $FORBIDDEN_RX ]]; then
    die "COPY_FILES contains forbidden path: $rel"
  fi
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing ${rel}"
  in_allowlist "$rel" || die "COPY_FILES entry is not allowlisted: $rel"
done
ok "all bundled copy files present and allowlisted"

# Bundle tree must contain exactly COPY_FILES — no extras.
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

# Reject student-facing / V2 / payment files if someone added them later.
for bad in \
  "app/portal/student/services/guidance/page.tsx" \
  "app/portal/student/services/guidance/counseling-actions.ts" \
  "components/guidance/platform/GuidancePlatformDashboard.tsx" \
  "components/counselor-os/StudentCounselingPanel.tsx" \
  "components/counselor-os/StudentCounselingBookingForm.tsx" \
  "middleware.ts"
do
  if [[ -f "${BUNDLE}/${bad}" ]]; then
    die "bundle must not contain $bad"
  fi
  in_allowlist "$bad" && die "allowlist accidentally includes $bad"
done
ok "student dashboard, V2, middleware, and student counseling files are not in the bundle"

[[ -f "app/admin/login/actions.ts" ]] || die "missing production admin login"
require_needles "app/admin/login/actions.ts" "production" \
  "function safeAdminNext" \
  'nextPath.startsWith("/admin")'
ok "production /admin/login supports safe /admin/* next"

[[ -f "app/admin/(dashboard)/guidance/page.tsx" ]] || die "missing /admin/guidance — refusing to run"
ok "legacy Counselor Review Center /admin/guidance is present and will NOT be modified"

[[ -f "components/guidance/platform/GuidancePlatformDashboard.tsx" ]] || die "missing GuidancePlatformDashboard"
ok "production Guidance dashboard component present — will NOT be modified"

RESOLVER="app/portal/student/services/guidance/steps/page.tsx"
if [[ -f "$RESOLVER" ]]; then
  if ! grep -q 'guidanceJourneyV2StepPath' "$RESOLVER"; then
    die "$RESOLVER is not the production V2 resolver"
  fi
  ok "production V2 resolver present — will NOT be modified"
fi

[[ -f "app/globals.css" ]] || die "missing app/globals.css"
[[ -f "prisma/schema.prisma" ]] || die "missing prisma/schema.prisma"

require_needles "prisma/schema.prisma" "production" \
  "model BookingAdvisor" \
  "model BookingReservation" \
  "model BookingAvailabilityRule" \
  "model BookingSlot" \
  "model GuidancePlan" \
  "model Student"
ok "required existing Booking + Guidance models are present"

MIGRATION_SQL="${BUNDLE}/prisma/migrations/${MIGRATION_NAME}/migration.sql"
require_needles "$MIGRATION_SQL" "bundle" \
  "CREATE TABLE \"counselor_student_assignments\"" \
  "CREATE TABLE \"counselor_appointments\"" \
  "CREATE TABLE \"counseling_session_records\"" \
  "CREATE TABLE \"counselor_notes\"" \
  "CREATE TABLE \"counselor_follow_ups\""

if grep -Eiq 'drop table|drop column|truncate |delete from |alter table .+\bdrop\b' "$MIGRATION_SQL"; then
  die "migration SQL contains destructive operations"
fi
if grep -q 'guidance_step_reviews' "$MIGRATION_SQL"; then
  die "migration SQL must not touch Phase 2 guidance_step_reviews"
fi
ok "migration SQL is additive Counselor OS only"
if grep -q '20260831090000_guidance_counselor_workspace_phase_2' "$MIGRATION_SQL"; then
  die "bundle migration SQL must not mention the Phase 2 guidance counselor workspace migration"
fi

# Inspect migration status without applying yet.
step "0b. Prisma migration status (inspect only)"
MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-preflight.txt"
set +e
npx prisma migrate status > "$MIGRATE_STATUS_FILE" 2>&1
migrate_rc=$?
set -e
info "prisma migrate status exit=$migrate_rc (1 is normal when pending)"
if [[ -s "$MIGRATE_STATUS_FILE" ]]; then
  sed 's/^/    /' "$MIGRATE_STATUS_FILE" | head -n 80
fi

if grep -q '20260831090000_guidance_counselor_workspace_phase_2' "$MIGRATE_STATUS_FILE"; then
  if grep -Eiq "not yet been applied|Pending" "$MIGRATE_STATUS_FILE"; then
    if grep -E 'not yet been applied|Pending' -A 20 "$MIGRATE_STATUS_FILE" | grep -q '20260831090000_guidance_counselor_workspace_phase_2'; then
      die "Phase 2 guidance counselor workspace migration is pending — refusing to run migrate deploy"
    fi
  fi
fi

# Other pending migrations besides ours are a hard stop.
if grep -Eiq "have not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  pending_block="$(
    awk '/not yet been applied|Following migration/{flag=1;next} /^$/{if(flag){exit}} flag' "$MIGRATE_STATUS_FILE" || true
  )"
  if echo "$pending_block" | grep -E '^[0-9]{14}_' | grep -v "$MIGRATION_NAME" >/dev/null; then
    echo "$pending_block"
    die "other pending Prisma migrations exist — refusing to continue"
  fi
  ok "no unexpected pending Prisma migrations (Counselor OS folder is not on disk yet)"
else
  ok "prisma migrate status has no unexpected pending list"
fi

snapshot_protected "$PROTECTED_AFTER_PREFLIGHT"
assert_protected_unchanged "$PROTECTED_BEFORE" "$PROTECTED_AFTER_PREFLIGHT" "during preflight"
ok "preflight was read-only on ${APP_ROOT} — no application files written yet"

# ==============================================================================
# 1. Backup + rollback (files only; DB rollback is manual)
# ==============================================================================
step "1. Backup scaffolding"

: > "$MANIFEST"
: > "$PLANNED"

cat > "${BACKUP}/ROLLBACK.sh" <<ROLLBACK
#!/usr/bin/env bash
# Restore every FILE this Counselor OS safe run touched, then rebuild and restart.
# Does NOT DROP Counselor OS tables. Database rollback is intentionally manual.
set -Eeuo pipefail
cd "${APP_ROOT}"
echo "==> Restoring files from ${BACKUP}"
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
echo
echo "File rollback complete."
echo "Database: Counselor OS tables were NOT dropped."
echo "If you must revert schema, do it manually after backup review."
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
  echo "prisma/schema.prisma"
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
ok "planned set matches the allowlist"

# ==============================================================================
# 3. Copy allowlisted files
# ==============================================================================
step "3. Copy Counselor OS admin files"

for rel in "${COPY_FILES[@]}"; do
  backup_file "$rel"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied  $rel"
done

require_needles "app/admin/counselor/layout.tsx" "after-copy" \
  "requireCounselorContext" \
  "CounselorShell"
require_needles "components/counselor-os/CounselorShell.tsx" "after-copy" \
  "/admin/counselor"
if [[ -f "components/counselor-os/StudentCounselingPanel.tsx" ]]; then
  info "StudentCounselingPanel exists on disk from a previous copy — this run did not write it"
fi
ok "admin Counselor OS files copied"

# ==============================================================================
# 4. Surgical CSS merge
# ==============================================================================
step "4. Merge COUNSELOR OS SAFE CSS"

backup_file "app/globals.css"
if grep -qF "$CSS_START" app/globals.css; then
  ok "CSS block already present — not duplicated"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  if ! grep -qF "$CSS_START" app/globals.css; then
    die "CSS merge failed: start marker missing"
  fi
  ok "appended COUNSELOR OS SAFE CSS block"
fi
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count Counselor OS CSS blocks — expected 1"

# ==============================================================================
# 5. Surgical Prisma schema merge
# ==============================================================================
step "5. Surgical Prisma schema merge"

backup_file "prisma/schema.prisma"
python3 "$SCHEMA_MERGER" prisma/schema.prisma "$SCHEMA_FRAGMENT"
require_needles "prisma/schema.prisma" "after-merge" \
  "model CounselorStudentAssignment" \
  "model CounselorAppointment" \
  "model CounselingSessionRecord" \
  "model CounselorNote" \
  "model CounselorFollowUp" \
  "model BookingAdvisor"
ok "schema contains Counselor OS models and existing BookingAdvisor"

# ==============================================================================
# 6. Manifest vs allowlist
# ==============================================================================
step "6. Confirm no unexpected writes"

unexpected=0
while IFS= read -r line; do
  f="${line#NEW:}"
  if ! in_allowlist "$f"; then
    c_red "    unexpected: $f"
    unexpected=1
  fi
  if [[ "$f" =~ $FORBIDDEN_RX ]]; then
    c_red "    protected: $f"
    unexpected=1
  fi
done < "$MANIFEST"
[[ "$unexpected" -eq 0 ]] || die "manifest contains files outside the allowlist"

# Hard verify forbidden production files were not written this run.
for protected in \
  "middleware.ts" \
  "app/portal/student/services/guidance/page.tsx" \
  "components/guidance/platform/GuidancePlatformDashboard.tsx" \
  "app/portal/student/services/guidance/steps/page.tsx"
do
  if grep -qF "$protected" "$MANIFEST"; then
    die "manifest includes protected $protected"
  fi
done
ok "manifest is contained by the allowlist"
echo
echo "Files actually backed up / written:"
sed 's/^/  /' "$MANIFEST"

snapshot_protected "$PROTECTED_AFTER_APPLY"
assert_protected_unchanged "$PROTECTED_BEFORE" "$PROTECTED_AFTER_APPLY" "after allowlisted writes"
ok "protected production files are unchanged after copies/merges"

# ==============================================================================
# 7. Database — migrate deploy only if this one migration is pending
# ==============================================================================
step "7. Database migration (additive only)"

MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-pre-apply.txt"
set +e
npx prisma migrate status > "$MIGRATE_STATUS_FILE" 2>&1
migrate_rc=$?
set -e
info "prisma migrate status (after file copy) exit=$migrate_rc"
if [[ -s "$MIGRATE_STATUS_FILE" ]]; then
  sed 's/^/    /' "$MIGRATE_STATUS_FILE" | head -n 80
fi

PRISMA_MIG_SQL="${BACKUP}/.prisma-migrations.sql"
cat > "$PRISMA_MIG_SQL" <<SQL
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '${MIGRATION_NAME}',
  '20260831090000_guidance_counselor_workspace_phase_2'
)
ORDER BY migration_name;
SQL

recorded_ours=0
recorded_phase2=0
set +e
if npx prisma db execute --file "$PRISMA_MIG_SQL" > "${BACKUP}/.prisma-migrations.out" 2>&1; then
  if grep -q "$MIGRATION_NAME" "${BACKUP}/.prisma-migrations.out"; then
    recorded_ours=1
  fi
  if grep -q '20260831090000_guidance_counselor_workspace_phase_2' "${BACKUP}/.prisma-migrations.out"; then
    recorded_phase2=1
  fi
  sed 's/^/    /' "${BACKUP}/.prisma-migrations.out" || true
else
  info "could not query _prisma_migrations directly; using migrate status only"
  if grep -q "$MIGRATION_NAME" "$MIGRATE_STATUS_FILE"; then
    if ! grep -Eiq "not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
      recorded_ours=1
    fi
  fi
fi
set -e
info "_prisma_migrations counselor foundation recorded=${recorded_ours} phase2_recorded=${recorded_phase2}"

tables_exist=0
table_check_ran=0
TABLE_PRE_SQL="${BACKUP}/.table-precheck.sql"
cat > "$TABLE_PRE_SQL" <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'counselor_student_assignments',
    'counselor_appointments',
    'counseling_session_records',
    'counselor_notes',
    'counselor_follow_ups'
  )
ORDER BY table_name;
SQL
set +e
if npx prisma db execute --file "$TABLE_PRE_SQL" > "${BACKUP}/.table-precheck.out" 2>&1; then
  table_check_ran=1
  table_hits=0
  for t in counselor_student_assignments counselor_appointments counseling_session_records counselor_notes counselor_follow_ups; do
    if grep -q "$t" "${BACKUP}/.table-precheck.out"; then
      table_hits=$((table_hits + 1))
    fi
  done
  if [[ "$table_hits" -eq 5 ]]; then
    tables_exist=1
  elif [[ "$table_hits" -gt 0 ]]; then
    set -e
    die "partial Counselor OS tables already exist (${table_hits}/5) — refusing to migrate"
  fi
fi
set -e
info "counselor tables already present: ${tables_exist} (check_ran=${table_check_ran})"

if grep -Eiq "have not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  pending_block="$(
    awk '/not yet been applied|Following migration/{flag=1;next} /^$/{if(flag){exit}} flag' "$MIGRATE_STATUS_FILE" || true
  )"
  if echo "$pending_block" | grep -q '20260831090000_guidance_counselor_workspace_phase_2'; then
    die "refusing to rerun Phase 2 guidance counselor workspace migration"
  fi
  if echo "$pending_block" | grep -E '^[0-9]{14}_' | grep -v "$MIGRATION_NAME" >/dev/null; then
    echo "$pending_block"
    die "migrate deploy would apply unexpected additional migrations"
  fi
fi

MIGRATION_RESULT="skipped"
if [[ "$recorded_ours" -eq 1 ]]; then
  if [[ "$table_check_ran" -eq 1 && "$tables_exist" -eq 0 ]]; then
    die "migration is recorded but Counselor OS tables are missing — manual inspect required"
  fi
  MIGRATION_RESULT="already-applied"
  ok "migration already recorded — skipped"
elif [[ "$tables_exist" -eq 1 ]]; then
  die "Counselor OS tables exist but ${MIGRATION_NAME} is not in _prisma_migrations — refusing CREATE"
elif grep -q "$MIGRATION_NAME" "$MIGRATE_STATUS_FILE" && grep -Eiq "not yet been applied|Following migration" "$MIGRATE_STATUS_FILE"; then
  info "applying ${MIGRATION_NAME} via prisma migrate deploy (no other pending migrations)"
  if ! npx prisma migrate deploy; then
    die "prisma migrate deploy failed. Files can be rolled back; DB rollback is manual."
  fi
  MIGRATION_RESULT="applied"
  ok "prisma migrate deploy completed"
else
  die "cannot determine a safe migrate deploy gate for ${MIGRATION_NAME}; status file: ${MIGRATE_STATUS_FILE}"
fi

step "7b. Verify Counselor OS tables"
TABLE_CHECK="${BACKUP}/.table-check.sql"
cat > "$TABLE_CHECK" <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'counselor_student_assignments',
    'counselor_appointments',
    'counseling_session_records',
    'counselor_notes',
    'counselor_follow_ups'
  )
ORDER BY table_name;
SQL

table_ok=0
TABLES_VERIFIED="unverified"
set +e
if npx prisma db execute --file "$TABLE_CHECK" > "${BACKUP}/.table-check.out" 2>&1; then
  table_ok=1
fi
set -e
if [[ "$table_ok" -eq 1 ]]; then
  sed 's/^/    /' "${BACKUP}/.table-check.out" || true
  missing=0
  for t in counselor_student_assignments counselor_appointments counseling_session_records counselor_notes counselor_follow_ups; do
    if ! grep -q "$t" "${BACKUP}/.table-check.out"; then
      c_red "    missing table: $t"
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]] || die "one or more Counselor OS tables are missing"
  TABLES_VERIFIED="all-five-present"
  ok "five Counselor OS tables verified"
else
  info "prisma db execute unavailable — falling back to schema map names"
  require_needles "prisma/schema.prisma" "tables-fallback" \
    '@@map("counselor_student_assignments")' \
    '@@map("counselor_appointments")' \
    '@@map("counseling_session_records")' \
    '@@map("counselor_notes")' \
    '@@map("counselor_follow_ups")'
  TABLES_VERIFIED="schema-maps-only"
  info "table SQL verify skipped; schema maps are present. Confirm in DB if migrate reported applied."
fi

# ==============================================================================
# 8. generate + tsc + build  (PM2 only after all pass)
# ==============================================================================
step "8. prisma generate"
if ! npx prisma generate; then
  die "prisma generate failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh"
fi
ok "prisma generate passed"

step "9. Typecheck"
if ! npx tsc --noEmit; then
  die "TypeScript failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh (DB not auto-reverted)"
fi
ok "tsc --noEmit passed"

step "10. Build"
if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
  die "Build failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh (DB not auto-reverted)"
fi
ok "npm run build passed"

# Confirm protected files still look like production after build (untouched).
if [[ -f "app/portal/student/services/guidance/steps/page.tsx" ]]; then
  if ! grep -q 'guidanceJourneyV2StepPath' "app/portal/student/services/guidance/steps/page.tsx"; then
    die "V2 resolver marker missing after build — aborting before restart"
  fi
  ok "V2 resolver marker still present"
fi
if [[ -f "middleware.ts" ]]; then
  ok "middleware.ts exists and was not in the write manifest"
fi
require_needles "components/guidance/platform/GuidancePlatformDashboard.tsx" "post-build" \
  "ورود به مسیر انتخاب رشته"
ok "Guidance dashboard + V2 resolver still present; middleware not in this run"
snapshot_protected "${BACKUP}/protected-after-build.sha256"
assert_protected_unchanged "$PROTECTED_BEFORE" "${BACKUP}/protected-after-build.sha256" "after build"

# ==============================================================================
# 11. Restart + readiness + smoke
# ==============================================================================
step "11. PM2 restart"
pm2 restart "$PM2_NAME" --update-env
pm2 status
ok "pm2 restarted $PM2_NAME"

step "12. Wait for local HTTP readiness (up to 45s)"
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
[[ "$ready" -eq 1 ]] || die "app did not become ready at $READY_URL within 45s"

step "13. Local HTTP smoke tests"

smoke() {
  local url="$1"
  local extra="${2:-}"
  local code
  # shellcheck disable=SC2086
  code="$(curl -sS -o /tmp/counselor-os-safe-smoke.body -w '%{http_code}' \
    --max-time 20 $extra "$url" || true)"
  case "$code" in
    200|301|302|303|307|308)
      ok "$code  $url"
      ;;
    404|500|502|503)
      die "smoke failed: $url returned $code"
      ;;
    *)
      die "smoke failed: $url returned '$code' (expected 200/3xx)"
      ;;
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
smoke "${BASE}/portal/student/services/guidance"
smoke "${BASE}/discover/systems/payam-noor"
smoke "${BASE}/entekhab"

ok "smoke routes responded with 200/3xx (unauthenticated login redirects are OK)"

# ==============================================================================
# 14. Report
# ==============================================================================
trap - ERR

{
  echo "=== COUNSELOR OS SAFE DEPLOY REPORT ==="
  echo "backup: ${BACKUP}"
  echo "copied files:"
  printf '  %s\n' "${COPY_FILES[@]}"
  echo "surgically modified:"
  echo "  app/globals.css  (idempotent CSS merge)"
  echo "  prisma/schema.prisma  (idempotent Counselor OS merge)"
  echo "migration: ${MIGRATION_RESULT} (${MIGRATION_NAME})"
  echo "tables: ${TABLES_VERIFIED}"
  echo "tsc: PASS"
  echo "build: PASS"
  echo "pm2: restarted ${PM2_NAME}"
  echo "middleware: NOT MODIFIED"
  echo "guidance/page.tsx: NOT MODIFIED"
  echo "Guidance V2: NOT MODIFIED"
  echo "payment/SMS/Nginx/env: NOT MODIFIED"
  echo "DB rollback: NOT automatic (tables preserved on file rollback)"
  echo "login: /admin/login?next=/admin/counselor"
  echo "rollback: bash ${BACKUP}/ROLLBACK.sh"
} | tee "$REPORT"

echo
echo "Counselor login URL: /admin/login?next=/admin/counselor"
echo "Rollback (files only): bash ${BACKUP}/ROLLBACK.sh"
