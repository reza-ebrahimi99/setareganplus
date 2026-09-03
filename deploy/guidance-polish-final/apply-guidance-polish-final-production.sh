#!/usr/bin/env bash
#
# Guidance Polish Final — production applier.
#
# Copies ONLY the six Guidance component files that contain no Counselor OS code.
# It deliberately does NOT touch app/globals.css, page.tsx, or middleware.ts:
# those need a surgical merge (see PRODUCTION_SAFETY.md) because they also carry
# Counselor OS work that must not go live.
#
# Never: git reset/clean/pull/checkout, prisma migrate, seeding, SMS, payment edits.

set -Eeuo pipefail

SRC="${1:?usage: $0 <source-tree> [target-tree]}"
DST="${2:-/var/www/setareganplus}"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-polish-${STAMP}"

FILES=(
  "components/guidance/platform/GuidanceUniversitiesBrowser.tsx"
  "components/guidance/platform/GuidanceUniversitiesHub.tsx"
  "components/guidance/GradesUploadForm.tsx"
  "components/guidance/shared/GuidanceFileUploadField.tsx"
  "components/guidance/steps/step2/InterestAssessmentStep.tsx"
  "components/guidance/steps/step12/FinalApprovalStep.tsx"
)

# Anything matching these must never reach production in this deployment.
FORBIDDEN=("counselor-os" "admin/counselor" "counselor_os_foundation")

die() { echo "ABORT: $*" >&2; exit 1; }

[[ -d "$SRC" ]] || die "source tree not found: $SRC"
[[ -d "$DST" ]] || die "target tree not found: $DST"
[[ -f "$DST/package.json" ]] || die "target is not the app root: $DST"

echo "==> Verifying source files exist and are Counselor-OS-free"
for f in "${FILES[@]}"; do
  [[ -f "$SRC/$f" ]] || die "missing source file: $f"
  for bad in "${FORBIDDEN[@]}"; do
    if grep -q "$bad" "$SRC/$f"; then
      die "$f references '$bad' — refusing to deploy Counselor OS code"
    fi
  done
done

echo "==> Backing up target files to $BACKUP"
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -f "$DST/$f" ]]; then
    install -D "$DST/$f" "$BACKUP/$f"
  else
    echo "    (new file on production: $f)"
  fi
done

echo "==> Copying Guidance files"
for f in "${FILES[@]}"; do
  install -D "$SRC/$f" "$DST/$f"
  echo "    $f"
done

cat <<'EOS'

==> Copied component files only.

STILL REQUIRED, BY HAND:
  1. app/globals.css — append the five Guidance CSS blocks listed in
     PRODUCTION_DEPLOY.md step 3. Do NOT copy cos-* / guidance-counseling-*.
  2. Production V2 patches for issues 6, 8(V2) and 9 — see PRODUCTION_SAFETY.md.

THEN:
  export NODE_OPTIONS="--max-old-space-size=4096"
  npx tsc --noEmit && npm run build && pm2 restart setareganplus

NOT performed by this script (by design):
  prisma migrate, seeding, BookingAdvisor linking, Counselor OS routes, SMS, payment.
EOS

echo "Backup: $BACKUP"
