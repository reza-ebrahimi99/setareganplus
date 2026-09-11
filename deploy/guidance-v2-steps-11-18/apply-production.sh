#!/usr/bin/env bash
#
# ==============================================================================
# Guidance V2 Steps 11–18 — production applier (DO NOT run until operators intend)
# ==============================================================================
#
# Completes the 18-step student journey and Counselor OS operational workspace.
# Does NOT touch Nginx, env, middleware, moshaver host routing, payment/Zibal,
# SMS, Holland checkout/entitlement, or question-bank.
#
# NEVER:
#   git pull / reset / checkout / clean / stash / commit
#   prisma db push / migrate dev / migrate reset / seed
#   DROP tables or columns on rollback
#   overwrite globals.css or schema.prisma wholesale
#   copy holland question-bank / scoring / store
#   copy page.early.tsx stub over a preserved production dispatcher
#
# Usage (after this folder is on the server):
#   bash deploy/guidance-v2-steps-11-18/apply-production.sh
# ==============================================================================

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
CSS_FRAGMENT="${SCRIPT_DIR}/guidance-v2-late.css"
SCHEMA_FRAGMENT="${SCRIPT_DIR}/schema-guidance-v2-late.prisma"
SCHEMA_MERGER="${SCRIPT_DIR}/merge_schema.py"
MIGRATION_NAME="20260904180000_guidance_v2_steps_11_18"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-v2-steps-11-18-${STAMP}"
MANIFEST="${BACKUP}/MANIFEST.txt"
PLANNED="${BACKUP}/PLANNED.txt"
REPORT="${BACKUP}/REPORT.txt"

CSS_START="/* ===== GUIDANCE V2 STEPS 11-18 ===== */"
CSS_END="/* ===== END GUIDANCE V2 STEPS 11-18 ===== */"

STEP_PAGE_DIR="app/portal/student/services/guidance/journey/steps/[step]"
STEP_PAGE="${STEP_PAGE_DIR}/page.tsx"
STEP_EARLY="${STEP_PAGE_DIR}/page.early.tsx"

COPY_FILES=(
  "lib/guidance/journey-v2/catalog.ts"
  "lib/guidance/journey-v2/constants.ts"
  "lib/guidance/journey-v2/labels.ts"
  "lib/guidance/journey-v2/plan.ts"
  "lib/guidance/journey-v2/state.ts"
  "lib/guidance/journey-v2/guard.ts"
  "lib/guidance/journey-v2/advance.ts"
  "lib/guidance/journey-v2/appointments.ts"
  "lib/guidance/journey-v2/documents.ts"
  "lib/guidance/journey-v2/konkur.ts"
  "lib/guidance/journey-v2/konkur-shared.ts"
  "lib/booking/generate-slots.ts"
  "lib/counselor-os/schedule.ts"
  "lib/forms/file-upload-config.ts"
  "lib/guidance/journey-v2/choices.ts"
  "lib/guidance/journey-v2/sanjesh.ts"
  "lib/guidance/journey-v2/completion.ts"
  "lib/guidance/journey-v2/render-late-page.tsx"
  "lib/counselor-os/booking.ts"
  "lib/counselor-os/dashboard.ts"
  "lib/counselor-os/appointments.ts"
  "lib/counselor-os/reports.ts"
  "lib/counselor-os/late-journey.ts"
  "lib/counselor-os/late-reports.ts"
  "app/portal/student/services/guidance/steps/page.tsx"
  "app/portal/student/services/guidance/journey/steps/page.tsx"
  "app/portal/student/services/guidance/journey/steps/[step]/page.tsx"
  "app/portal/student/services/guidance/journey/steps/actions/late.ts"
  "app/portal/student/services/guidance/journey/advisor-photo/route.ts"
  "app/portal/student/services/guidance/documents/[documentId]/download/route.ts"
  "app/admin/counselor/late-actions.ts"
  "app/admin/counselor/actions.ts"
  "app/admin/counselor/calendar/page.tsx"
  "app/admin/counselor/settings/page.tsx"
  "app/admin/counselor/appointments/page.tsx"
  "app/admin/counselor/students/[studentId]/page.tsx"
  "app/admin/counselor/students/[studentId]/choices/page.tsx"
  "app/admin/counselor/students/[studentId]/export/[kind]/page.tsx"
  "components/guidance/v2-late/LateStepShell.tsx"
  "components/guidance/v2-late/SessionBookingPanel.tsx"
  "components/guidance/v2-late/KonkurResultForm.tsx"
  "components/guidance/v2-late/WaitingStatusCard.tsx"
  "components/guidance/v2-late/ChoiceReviewWorkspace.tsx"
  "components/guidance/v2-late/InformedConfirmPanel.tsx"
  "components/guidance/v2-late/SanjeshSubmissionPanel.tsx"
  "components/guidance/v2-late/JourneyCompleteCard.tsx"
  "components/guidance/shared/GuidanceFileUploadField.tsx"
  "components/counselor-os/CounselorScheduleForm.tsx"
  "components/counselor-os/ChoiceWorkspace.tsx"
  "components/counselor-os/CounselorLateJourneyPanel.tsx"
  "components/counselor-os/CounselorStudentCaseTabs.tsx"
  "components/counselor-os/LatePrintDocument.tsx"
  "prisma/migrations/${MIGRATION_NAME}/migration.sql"
)

ALLOWLIST=(
  "${COPY_FILES[@]}"
  "app/globals.css"
  "prisma/schema.prisma"
  "${STEP_EARLY}"
)

FORBIDDEN_RX='zibal|Zibal|middleware\.ts|\.env|nginx|pm2\.|ecosystem\.config|GuidancePlatformDashboard|holland-payment|question-bank\.ts|holland/scoring|holland/store'

PROTECTED_FILES=(
  "middleware.ts"
  "app/portal/student/services/guidance/page.tsx"
  "components/guidance/platform/GuidancePlatformDashboard.tsx"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "lib/communication/sms-provider.ts"
  "app/admin/(dashboard)/guidance/page.tsx"
  "lib/guidance/journey-v2/holland/question-bank.ts"
  "lib/guidance/journey-v2/holland/scoring.ts"
  "lib/guidance/journey-v2/holland/store.ts"
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
    echo >&2 "Database additive tables/columns are NOT auto-dropped."
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

capture_prisma_migrate_status() {
  local out="$1"
  if npx prisma migrate status > "$out" 2>&1; then
    MIGRATE_STATUS_RC=0
  else
    MIGRATE_STATUS_RC=$?
  fi
}

# Print pending migration directory names from `prisma migrate status` output.
list_pending_migrations() {
  local file="$1"
  awk '
    /not yet been applied/ { flag=1; next }
    flag && /To apply pending|To apply migrations|prisma migrate deploy/ { exit }
    flag {
      n = split($0, parts, /[[:space:]]+/)
      for (i = 1; i <= n; i++) {
        if (parts[i] ~ /^[0-9]{14}_[A-Za-z0-9_]+$/) print parts[i]
      }
    }
  ' "$file"
}

# Decide from migrate-status text + exit code. Prints:
#   already-applied | deploy | abort:<reason>
# Does not require the target name to appear in an "up to date" report.
migration_gate_decision() {
  local file="$1"
  local rc="$2"
  local name has_target=0 has_other=0 pending_count=0

  if [[ ! -f "$file" ]]; then
    echo "abort:missing-status-file"
    return 1
  fi
  if grep -Eiq 'have failed|failed to apply|P3009|P3015|rolled back' "$file"; then
    echo "abort:failed-or-rolled-back"
    return 1
  fi
  if grep -Eiq 'Drift detected|diverg' "$file"; then
    echo "abort:divergent-history"
    return 1
  fi

  if [[ "$rc" -eq 0 ]] && grep -Fq 'Database schema is up to date!' "$file"; then
    echo "already-applied"
    return 0
  fi

  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    pending_count=$((pending_count + 1))
    if [[ "$name" == "$MIGRATION_NAME" ]]; then
      has_target=1
    else
      has_other=1
    fi
  done < <(list_pending_migrations "$file")

  if [[ "$has_other" -eq 1 ]]; then
    echo "abort:unrelated-pending"
    return 1
  fi
  if [[ "$has_target" -eq 1 && "$pending_count" -eq 1 ]]; then
    echo "deploy"
    return 0
  fi
  echo "abort:unrecognized-status"
  return 1
}

assert_migrate_status_safe() {
  local file="$1"
  local role="$2"
  local name
  [[ -f "$file" ]] || die "$role missing migrate status output"
  if grep -Eiq 'have failed|failed to apply|P3009|P3015|rolled back' "$file"; then
    die "Prisma reports a failed or rolled-back migration ($role) — refusing"
  fi
  if grep -Eiq 'Drift detected|diverg' "$file"; then
    die "Prisma reports divergent migration history ($role) — refusing"
  fi
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    if [[ "$name" != "$MIGRATION_NAME" ]]; then
      die "other pending Prisma migrations exist ($role): $name — refusing to continue"
    fi
  done < <(list_pending_migrations "$file")
}

run_migration_gate_selftest() {
  local tmpdir got fail=0
  tmpdir="$(mktemp -d)"
  trap - ERR

  write_status() { printf '%s\n' "$2" > "${tmpdir}/$1"; }

  write_status uptodate "$(cat <<'EOF'
73 migrations found in prisma/migrations

Database schema is up to date!
EOF
)"
  got="$(migration_gate_decision "${tmpdir}/uptodate" 0 || true)"
  if [[ "$got" == "already-applied" ]]; then
    ok "selftest: exit 0 + up to date => skip migrate deploy"
  else
    c_red "selftest FAIL uptodate got=$got"
    fail=1
  fi

  write_status pending_target "$(cat <<EOF
Following migration have not yet been applied:

${MIGRATION_NAME}

To apply migrations in production run prisma migrate deploy.
EOF
)"
  got="$(migration_gate_decision "${tmpdir}/pending_target" 1 || true)"
  if [[ "$got" == "deploy" ]]; then
    ok "selftest: target-only pending => run migrate deploy"
  else
    c_red "selftest FAIL pending_target got=$got"
    fail=1
  fi

  write_status pending_other "$(cat <<'EOF'
The following migration(s) have not yet been applied:

20240101000000_unrelated_change

To apply pending migrations run prisma migrate deploy.
EOF
)"
  got="$(migration_gate_decision "${tmpdir}/pending_other" 1 || true)"
  if [[ "$got" == "abort:unrelated-pending" ]]; then
    ok "selftest: unrelated pending => abort"
  else
    c_red "selftest FAIL pending_other got=$got"
    fail=1
  fi

  write_status failed "$(cat <<EOF
The following migration(s) have failed:

${MIGRATION_NAME}

P3009
EOF
)"
  got="$(migration_gate_decision "${tmpdir}/failed" 1 || true)"
  if [[ "$got" == "abort:failed-or-rolled-back" ]]; then
    ok "selftest: failed migration => abort"
  else
    c_red "selftest FAIL failed got=$got"
    fail=1
  fi

  write_status drift "$(cat <<'EOF'
Drift detected: Your database schema is not in sync with your migration history.
EOF
)"
  got="$(migration_gate_decision "${tmpdir}/drift" 1 || true)"
  if [[ "$got" == "abort:divergent-history" ]]; then
    ok "selftest: divergent history => abort"
  else
    c_red "selftest FAIL drift got=$got"
    fail=1
  fi

  rm -rf "$tmpdir"
  [[ "$fail" -eq 0 ]] || exit 1
  ok "migration gate selftest passed"
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

is_late_wrapper() {
  local f="$1"
  [[ -f "$f" ]] && grep -qF "GUIDANCE_V2_LATE_DISPATCH" "$f"
}

is_early_stub() {
  local f="$1"
  [[ -f "$f" ]] && grep -qE 'GuidanceV2EarlyStepsStub|Local stub for steps 1' "$f"
}

stamp_early_preserved() {
  [[ -f "$STEP_EARLY" ]] || die "cannot stamp missing $STEP_EARLY"
  is_late_wrapper "$STEP_EARLY" && die "refusing to stamp the late wrapper as page.early.tsx"
  is_early_stub "$STEP_EARLY" && die "refusing to stamp the local notFound stub as page.early.tsx"
  if grep -qF "GUIDANCE_V2_EARLY_PRESERVED" "$STEP_EARLY"; then
    return 0
  fi
  STEP_EARLY="$STEP_EARLY" python3 - <<'PY'
from pathlib import Path
import os
p = Path(os.environ["STEP_EARLY"])
text = p.read_text(encoding="utf-8")
stamp = "/** GUIDANCE_V2_EARLY_PRESERVED — live production steps 1–10 dispatcher. Do not replace with the late wrapper. */\n"
if "GUIDANCE_V2_EARLY_PRESERVED" not in text:
    p.write_text(stamp + text, encoding="utf-8", newline="\n")
PY
}

assert_early_is_live_dispatcher() {
  local role="$1"
  [[ -f "$STEP_EARLY" ]] || die "$role: $STEP_EARLY is missing — steps 1–10 would 404"
  is_late_wrapper "$STEP_EARLY" && die "$role: $STEP_EARLY is the late wrapper — refusing recursion"
  is_early_stub "$STEP_EARLY" && die "$role: $STEP_EARLY is the local notFound stub — refusing to destroy steps 1–10"
  grep -qF "GUIDANCE_V2_EARLY_PRESERVED" "$STEP_EARLY" || die "$role: $STEP_EARLY is not the stamped live production dispatcher"
}

if [[ "${1:-}" == "--migration-gate-selftest" ]]; then
  run_migration_gate_selftest
  exit 0
fi

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
  "lib/guidance/journey-v2/holland/question-bank.ts" \
  "lib/guidance/journey-v2/holland/scoring.ts" \
  "lib/guidance/journey-v2/holland/store.ts" \
  "lib/guidance/journey-v2/steps.ts" \
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx" \
  "middleware.ts"
do
  if [[ -f "${BUNDLE}/${bad}" ]]; then
    die "bundle must not contain $bad"
  fi
done

require_needles "prisma/schema.prisma" "production" \
  "model GuidancePlan" \
  "journeyVersion" \
  "packagePaidAt" \
  "model BookingAdvisor" \
  "model CounselorStudentAssignment" \
  "model CounselorAppointment" \
  "model CounselorCaseCorrection"
ok "production GuidancePlan.journeyVersion and Counselor OS models are present"

require_needles "${BUNDLE}/${STEP_PAGE}" "bundle" \
  "GUIDANCE_V2_LATE_DISPATCH" \
  "renderGuidanceV2LateStep"
require_needles "${BUNDLE}/lib/guidance/journey-v2/advance.ts" "bundle" \
  "journeyVersion !== 2" \
  "GUIDANCE_V2_STEP_COUNT"
require_needles "${BUNDLE}/lib/counselor-os/booking.ts" "bundle" \
  "purpose: params.purpose ?? null" \
  "journeyVersion: 2"
require_needles "${BUNDLE}/app/portal/student/services/guidance/steps/page.tsx" "bundle" \
  "guidanceJourneyV2StepPath" \
  "loadGuidanceV2Plan"

MIGRATION_SQL="${BUNDLE}/prisma/migrations/${MIGRATION_NAME}/migration.sql"
require_needles "$MIGRATION_SQL" "bundle" \
  "guidance_choice_lists" \
  'ADD COLUMN IF NOT EXISTS "purpose"' \
  "SANJESH_RECEIPT" \
  "STEP18_COMPLETED"
if grep -Eiq 'drop table|drop column|truncate |delete from ' "$MIGRATION_SQL"; then
  die "migration SQL contains destructive operations"
fi

step "0b. Prisma migration status (inspect only)"
MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-preflight.txt"
capture_prisma_migrate_status "$MIGRATE_STATUS_FILE"
info "prisma migrate status exit=$MIGRATE_STATUS_RC"
if [[ -s "$MIGRATE_STATUS_FILE" ]]; then
  sed 's/^/    /' "$MIGRATE_STATUS_FILE" | head -n 80
fi
assert_migrate_status_safe "$MIGRATE_STATUS_FILE" "preflight"

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
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
pm2 restart ${PM2_NAME} --update-env
echo "File rollback complete. Additive V2 late tables/columns were NOT dropped."
ROLLBACK
chmod +x "${BACKUP}/ROLLBACK.sh"

{
  printf '%s\n' "${COPY_FILES[@]}"
  echo "app/globals.css"
  echo "prisma/schema.prisma"
  echo "${STEP_EARLY}"
} | sort -u > "$PLANNED"

step "2. Preserve production V2 steps 1–10 dispatcher"
mkdir -p "${STEP_PAGE_DIR}"

# Never treat the local notFound stub or the new wrapper as the 1–10 implementation.
if is_late_wrapper "$STEP_EARLY"; then
  die "page.early.tsx already contains GUIDANCE_V2_LATE_DISPATCH — refusing (wrapper recursion)"
fi

if ! is_late_wrapper "$STEP_PAGE"; then
  [[ -f "$STEP_PAGE" ]] || die "production live dispatcher missing: $STEP_PAGE"
  if [[ ! -f "$STEP_EARLY" ]] || is_early_stub "$STEP_EARLY"; then
    backup_file "$STEP_EARLY"
    install -D "$STEP_PAGE" "$STEP_EARLY"
    stamp_early_preserved
    ok "preserved live production dispatcher as page.early.tsx"
  else
    stamp_early_preserved
    info "page.early.tsx already present and is not a stub/wrapper — left in place"
  fi
else
  if [[ ! -f "$STEP_EARLY" ]] || is_early_stub "$STEP_EARLY"; then
    die "wrapper already installed but page.early.tsx is missing or is the local notFound stub — aborting to protect steps 1–10"
  fi
  stamp_early_preserved
  info "rerun: keeping preserved production page.early.tsx (not copying wrapper onto it)"
fi

assert_early_is_live_dispatcher "after-preserve"

step "3. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  backup_file "$rel"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied  $rel"
done

# COPY_FILES includes the new wrapper page.tsx and must never include page.early.tsx.
assert_early_is_live_dispatcher "after-copy"
require_needles "$STEP_PAGE" "installed-wrapper" \
  "GUIDANCE_V2_LATE_DISPATCH" \
  "renderGuidanceV2LateStep"
if grep -qF "GuidanceV2EarlyStepsStub" "$STEP_PAGE"; then
  die "installed wrapper page.tsx looks like the local stub"
fi

step "4. Merge GUIDANCE V2 STEPS 11-18 CSS"
backup_file "app/globals.css"
if grep -qF "$CSS_START" app/globals.css; then
  CSS_FRAGMENT="$CSS_FRAGMENT" python3 - <<'PY'
from pathlib import Path
import os
css = Path("app/globals.css")
text = css.read_text(encoding="utf-8")
start = "/* ===== GUIDANCE V2 STEPS 11-18 ===== */"
end = "/* ===== END GUIDANCE V2 STEPS 11-18 ===== */"
frag = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8").strip()
from_ = text.find(start)
to = text.find(end)
if from_ < 0 or to < 0 or to <= from_:
    raise SystemExit("existing late CSS markers are unusable")
to_end = to + len(end)
css.write_text(text[:from_] + frag + text[to_end:], encoding="utf-8", newline="\n")
PY
  ok "replaced existing GUIDANCE V2 STEPS 11-18 CSS block"
else
  printf '\n' >> app/globals.css
  cat "$CSS_FRAGMENT" >> app/globals.css
  grep -qF "$CSS_START" app/globals.css || die "CSS merge failed"
  ok "appended GUIDANCE V2 STEPS 11-18 CSS block"
fi
css_count="$(grep -cF "$CSS_START" app/globals.css || true)"
[[ "$css_count" == "1" ]] || die "globals.css has $css_count late CSS blocks — expected 1"

step "5. Surgical Prisma schema merge"
backup_file "prisma/schema.prisma"
python3 "$SCHEMA_MERGER" prisma/schema.prisma "$SCHEMA_FRAGMENT"
require_needles "prisma/schema.prisma" "after-merge" \
  "journeyVersion" \
  "packagePaidAt" \
  "STEP18_COMPLETED" \
  "SANJESH_RECEIPT" \
  "model GuidanceChoiceList" \
  "v2SanjeshStatus" \
  "model BookingAdvisor" \
  "model CounselorStudentAssignment" \
  "model CounselorCaseCorrection"
if ! grep -qF "journeyVersion" prisma/schema.prisma; then
  die "GuidancePlan.journeyVersion missing after merge"
fi

snapshot_protected "$PROTECTED_AFTER_APPLY"
assert_protected_unchanged "$PROTECTED_BEFORE" "$PROTECTED_AFTER_APPLY" "after allowlisted writes"

step "7. Database migration (additive only)"
MIGRATE_STATUS_FILE="${BACKUP}/.migrate-status-pre-apply.txt"
capture_prisma_migrate_status "$MIGRATE_STATUS_FILE"
info "prisma migrate status exit=$MIGRATE_STATUS_RC"
assert_migrate_status_safe "$MIGRATE_STATUS_FILE" "pre-apply"

MIGRATION_RESULT="skipped"
GATE_DECISION="$(migration_gate_decision "$MIGRATE_STATUS_FILE" "$MIGRATE_STATUS_RC" || true)"
case "$GATE_DECISION" in
  already-applied)
    MIGRATION_RESULT="already-applied"
    ok "target migration already applied — skipping migrate deploy"
    ;;
  deploy)
    if ! npx prisma migrate deploy; then
      die "prisma migrate deploy failed. Files can be rolled back; DB rollback is manual."
    fi
    MIGRATION_RESULT="applied"
    ok "prisma migrate deploy completed"
    ;;
  *)
    die "cannot determine a safe migrate deploy gate for ${MIGRATION_NAME} (${GATE_DECISION})"
    ;;
esac

step "8. prisma generate"
npx prisma generate || die "prisma generate failed"

step "9. Typecheck"
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit || die "TypeScript failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh"

step "10. Build"
NODE_OPTIONS="--max-old-space-size=4096" npm run build || die "Build failed. Roll back files with: bash ${BACKUP}/ROLLBACK.sh"

require_needles "prisma/schema.prisma" "after-build" "journeyVersion" "packagePaidAt" "model GuidanceChoiceList"
require_needles "$STEP_PAGE" "after-build" "GUIDANCE_V2_LATE_DISPATCH"
assert_early_is_live_dispatcher "after-build"
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
  code="$(curl -sS -o /tmp/guidance-v2-late-smoke.body -w '%{http_code}' --max-time 20 "$url" || true)"
  case "$code" in
    200|301|302|303|307|308) ok "$code  $url" ;;
    *) die "smoke failed: $url returned '$code'" ;;
  esac
}
BASE="http://127.0.0.1:3000"
smoke "${BASE}/admin/counselor"
smoke "${BASE}/admin/counselor/students"
smoke "${BASE}/admin/counselor/appointments"
smoke "${BASE}/portal/student/services/guidance"
smoke "${BASE}/portal/student/services/guidance/steps"
smoke "${BASE}/portal/student/services/guidance/journey/steps"

trap - ERR
{
  echo "=== GUIDANCE V2 STEPS 11-18 DEPLOY REPORT ==="
  echo "backup: ${BACKUP}"
  echo "migration: ${MIGRATION_RESULT} (${MIGRATION_NAME})"
  echo "tsc: PASS"
  echo "build: PASS"
  echo "pm2: restarted ${PM2_NAME}"
  echo "protected files: unchanged"
  echo "journeyVersion: preserved"
  echo "rollback: bash ${BACKUP}/ROLLBACK.sh"
} | tee "$REPORT"
