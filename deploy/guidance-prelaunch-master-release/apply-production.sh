#!/usr/bin/env bash
#
# Guidance prelaunch master release — production applier.
# Does NOT deploy itself. Operators run this on the server.
#
# Never: git pull/reset/clean/stash/checkout, edit .env, PM2 config,
#        Nginx, overwrite middleware, Zibal internals, or page.early.tsx.
#

set -Eeuo pipefail

APP_ROOT="/var/www/setareganplus"
PM2_NAME="setareganplus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE="${SCRIPT_DIR}/files"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="/var/backups/guidance-prelaunch-master-${STAMP}"
REPORT="${BACKUP}/APPLY-REPORT.txt"
PASS=1

mapfile -t COPY_FILES < <(grep -v '^[[:space:]]*$' "${SCRIPT_DIR}/COPY_FILES.txt")

PROTECTED=(
  "middleware.ts"
  "lib/payment/providers/zibal.ts"
  "lib/payment/providers/zibal-http.ts"
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx"
)

die() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; PASS=0; echo "FAIL: $*" >> "$REPORT"; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; echo "==> $*" >> "$REPORT"; }
ok() { printf '    \033[32mOK\033[0m   %s\n' "$*"; echo "OK: $*" >> "$REPORT"; }

[[ -d "$APP_ROOT" ]] || die "APP_ROOT missing: $APP_ROOT"
cd "$APP_ROOT"
mkdir -p "$BACKUP" /var/backups
echo "guidance-prelaunch-master-release $STAMP" > "$REPORT"

for rel in "${COPY_FILES[@]}"; do
  case "$rel" in
    *page.early.tsx*|*/zibal.ts|*/zibal-http.ts|*middleware.ts*)
      die "COPY_FILES contains protected path: $rel"
      ;;
  esac
done

[[ -f "${SCRIPT_DIR}/guidance-prelaunch-master.css" ]] || die "missing CSS fragment"

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

backup_file() {
  local rel="$1"
  [[ -f "$rel" ]] || return 0
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$rel" "$BACKUP/$rel"
}

hash_file() {
  local rel="$1"
  if [[ -f "$rel" ]]; then
    sha256sum "$rel" | awk '{print $1}'
  else
    echo "missing"
  fi
}

declare -A BEFORE_HASH
for rel in "${PROTECTED[@]}"; do
  BEFORE_HASH["$rel"]="$(hash_file "$rel")"
done
ENV_HASH_BEFORE="$(hash_file ".env")"

step "1. Detect app root and backup"
ok "APP_ROOT=$APP_ROOT backup=$BACKUP"

step "2. Copy allowlisted files"
for rel in "${COPY_FILES[@]}"; do
  [[ -f "${BUNDLE}/${rel}" ]] || die "bundle missing $rel"
  backup_file "$rel"
  mkdir -p "$(dirname "$rel")"
  install -D "${BUNDLE}/${rel}" "$rel"
  ok "copied $rel"
done

if grep -q "GuidanceV2EarlyStepsStub" \
  "app/portal/student/services/guidance/journey/steps/[step]/page.early.tsx" 2>/dev/null; then
  die "page.early.tsx looks like the local stub — aborting"
fi

step "3. Merge CSS"
backup_file "app/globals.css"
CSS_FRAGMENT="${SCRIPT_DIR}/guidance-prelaunch-master.css" python3 - <<'PY'
from pathlib import Path
import os
css = Path("app/globals.css")
text = css.read_text(encoding="utf-8")
start = "/* ===== GUIDANCE PRELAUNCH MASTER ===== */"
end = "/* ===== END GUIDANCE PRELAUNCH MASTER ===== */"
frag = Path(os.environ["CSS_FRAGMENT"]).read_text(encoding="utf-8").strip()
from_ = text.find(start)
to = text.find(end)
if from_ >= 0 and to > from_:
    css.write_text(text[:from_] + frag + text[to + len(end):], encoding="utf-8", newline="\n")
elif start not in text:
    css.write_text(text.rstrip() + "\n\n" + frag + "\n", encoding="utf-8", newline="\n")
else:
    raise SystemExit("CSS markers unusable")
PY
ok "CSS merged"

step "4. Prisma migrate"
export NODE_OPTIONS="--max-old-space-size=4096"
npx prisma migrate status || die "prisma migrate status failed"
npx prisma migrate deploy || die "prisma migrate deploy failed / unsafe"
ok "migrate deploy"

step "5. prisma generate + tsc + build"
npx prisma generate || die "prisma generate failed"
npx tsc --noEmit || die "tsc failed"
npm run build || die "build failed"
ok "generate/tsc/build"

step "6. PM2 restart + readiness"
npx pm2 restart "$PM2_NAME" --update-env || die "pm2 restart failed"
sleep 5
if curl -fsS -o /dev/null -m 20 "http://127.0.0.1:3000/portal/login"; then
  ok "readiness /portal/login"
else
  die "readiness wait failed"
fi

step "7. Smoke"
bash "${SCRIPT_DIR}/smoke.sh" || die "smoke failed"
ok "smoke"

step "8. Protected files unchanged"
for rel in "${PROTECTED[@]}"; do
  after="$(hash_file "$rel")"
  [[ "${BEFORE_HASH[$rel]}" == "$after" ]] || die "protected file changed: $rel"
  ok "protected unchanged $rel"
done
[[ "$ENV_HASH_BEFORE" == "$(hash_file ".env")" ]] || die ".env changed"
ok ".env unchanged"

if [[ "$PASS" -eq 1 ]]; then
  echo "FINAL: PASS" | tee -a "$REPORT"
else
  echo "FINAL: FAIL" | tee -a "$REPORT"
  exit 1
fi
