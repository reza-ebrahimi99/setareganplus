#!/usr/bin/env bash
# =============================================================================
#  setareganplus.ir: lean redesign installer (run as root on the server)
#  نصب نسخهٔ جدید (lean) کنار نسخهٔ فعلی، سپس سوییچ nginx
#
#  Recommended (needs a terminal for the admin password prompt):
#    curl -fsSL --retry 5 https://raw.githubusercontent.com/reza-ebrahimi99/setareganplus/lean-redesign/deploy/lean/install.sh -o /root/lean-install.sh && bash /root/lean-install.sh
#
#  Flags:
#    --tarball FILE   use a source tarball instead of git (if GitHub is unreachable)
#    --skip-nginx     install + start on :3100 but do NOT switch nginx
#    --stop-old       after a successful switch, stop the old PM2 process
#    --reset-admin    prompt again for the admin username/password (rewrites the hash only)
#    --old-port N     old app port (default: auto-detected from nginx, else 3000)
#    -h|--help
#
#  Safe to re-run: existing DB/.env/uploads are reused; the seed runs only once;
#  nothing of the old app is modified except the nginx proxy target (backed up).
# =============================================================================
set -Eeuo pipefail

# ---------- settings (override with env vars) ----------
REPO_URL="${REPO_URL:-https://github.com/reza-ebrahimi99/setareganplus.git}"
BRANCH="${BRANCH:-lean-redesign}"
DOMAIN="${DOMAIN:-setareganplus.ir}"
OLD_DIR="${OLD_DIR:-/var/www/setareganplus}"
OLD_PM2="${OLD_PM2:-setareganplus}"
APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
DATA_DIR="${DATA_DIR:-/var/www/setareganplus-lean-data}"
STATE_DIR="${STATE_DIR:-/var/backups/setareganplus-lean}"
PM2_NAME="${PM2_NAME:-setareganplus-lean}"
NEW_PORT="${NEW_PORT:-3100}"
DB_NAME="${DB_NAME:-setareganplus_lean}"
DB_USER="${DB_USER:-setaregan_lean}"
OLD_PORT="${OLD_PORT:-}"
TARBALL=""; SKIP_NGINX=0; STOP_OLD=0; RESET_ADMIN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tarball) TARBALL="$(readlink -f "$2")"; shift 2 ;;
    --skip-nginx) SKIP_NGINX=1; shift ;;
    --stop-old) STOP_OLD=1; shift ;;
    --reset-admin) RESET_ADMIN=1; shift ;;
    --old-port) OLD_PORT="$2"; shift 2 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="${STATE_DIR}/${STAMP}"
LOG="${RUN_DIR}/install.log"

# ---------- output helpers ----------
if [[ -t 1 ]]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; C=$'\e[36m'; N=$'\e[0m'; else B= G= Y= R= C= N=; fi
step() { echo; echo "${B}${C}==> $1${N}"; echo "    $2"; }
ok()   { echo "${G}  ✔ $1${N}"; echo "    $2"; }
warn() { echo "${Y}  ⚠ $1${N}"; echo "    $2"; }
die()  { echo "${R}  ✘ $1${N}" >&2; echo "    $2" >&2; echo "    log: ${LOG}" >&2; exit 1; }
trap 'echo "${R}  ✘ خطا در خط $LINENO | Failed at line $LINENO: $BASH_COMMAND${N}" >&2; echo "    log: ${LOG}" >&2' ERR

retry() { # retry <tries> <sleep> cmd...
  local n=$1 s=$2 i=1; shift 2
  until "$@"; do
    (( i >= n )) && return 1
    warn "تلاش $i ناموفق بود؛ دوباره تلاش می‌کنیم…" "Attempt $i/$n failed; retrying in ${s}s…"
    sleep "$s"; i=$((i + 1)); s=$((s * 2))
  done
}

ask() { # ask VAR "prompt" [silent]
  local __v
  { : </dev/tty; } 2>/dev/null || die "ترمینال در دسترس نیست" "No TTY for prompts. Download the script and run: bash /root/lean-install.sh"
  if [[ "${3:-}" == silent ]]; then read -r -s -p "$2" __v </dev/tty; echo >/dev/tty; else read -r -p "$2" __v </dev/tty; fi
  printf -v "$1" '%s' "$__v"
}

# =============================================================================
step "۰. بررسی پیش‌نیازها" "0. Preflight checks"
[[ $EUID -eq 0 ]] || die "باید با root اجرا شود" "Run as root (sudo -i)."
mkdir -p "$RUN_DIR"; chmod 700 "$STATE_DIR"
exec > >(tee -a "$LOG") 2>&1

for c in git curl node npm psql pg_dump pg_restore openssl tar python3; do
  command -v "$c" >/dev/null || die "ابزار $c نصب نیست" "Missing command: $c"
done
NODE_V="$(node -p 'process.versions.node')"
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)' \
  || die "نسخهٔ Node باید ۲۰٫۱۹ یا بالاتر باشد (فعلی: $NODE_V)" "Node >= 20.19 required (found $NODE_V)."
ok "Node $NODE_V" "Node $NODE_V OK"

# PM2: global binary, else the old app's local copy, else install globally
if command -v pm2 >/dev/null; then PM2=(pm2)
elif [[ -x "$OLD_DIR/node_modules/.bin/pm2" ]]; then PM2=("$OLD_DIR/node_modules/.bin/pm2")
else retry 3 10 npm i -g pm2 --no-audit --no-fund || die "نصب pm2 ناموفق" "Could not install pm2"; PM2=(pm2); fi
ok "PM2: ${PM2[*]}" "PM2 found"

HAVE_NGINX=1; command -v nginx >/dev/null || HAVE_NGINX=0
if [[ $HAVE_NGINX -eq 0 && $SKIP_NGINX -eq 0 ]]; then die "nginx پیدا نشد" "nginx not found (use --skip-nginx to only install)."; fi

if ss -ltnp 2>/dev/null | grep -q ":${NEW_PORT} " && ! "${PM2[@]}" describe "$PM2_NAME" >/dev/null 2>&1; then
  die "پورت $NEW_PORT توسط برنامهٔ دیگری اشغال است" "Port $NEW_PORT is in use by something else. Set NEW_PORT=…"
fi

AVAIL_MB=$(df -Pm /var/www 2>/dev/null | awk 'NR==2{print $4}')
(( ${AVAIL_MB:-0} > 3000 )) || die "فضای دیسک کافی نیست (${AVAIL_MB}MB)" "Need > 3 GB free on /var/www (have ${AVAIL_MB} MB)."
MEM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo)
ok "RAM ${MEM_MB}MB، swap ${SWAP_MB}MB، دیسک آزاد ${AVAIL_MB}MB" "RAM ${MEM_MB}MB, swap ${SWAP_MB}MB, free disk ${AVAIL_MB}MB"

# ---------- collect admin credentials early (so the long build is unattended) ----------
NEED_ADMIN=0
[[ ! -f "$APP_DIR/.env" || $RESET_ADMIN -eq 1 ]] && NEED_ADMIN=1
if [[ $NEED_ADMIN -eq 1 ]]; then
  step "تعریف حساب مدیر سایت" "Admin account for /admin"
  ask ADMIN_USER "Admin username / نام کاربری مدیر [admin]: "; ADMIN_USER="${ADMIN_USER:-admin}"
  [[ "$ADMIN_USER" =~ ^[A-Za-z0-9._-]{3,32}$ ]] || die "نام کاربری نامعتبر" "Username: 3-32 chars, letters/digits/._-"
  while :; do
    ask ADMIN_PW "Admin password / رمز عبور (min 10): " silent
    ask ADMIN_PW2 "Repeat / تکرار رمز: " silent
    [[ ${#ADMIN_PW} -ge 10 ]] || { warn "رمز کوتاه است" "Password must be at least 10 characters."; continue; }
    [[ "$ADMIN_PW" == "$ADMIN_PW2" ]] || { warn "رمزها یکسان نیستند" "Passwords do not match."; continue; }
    break
  done
  unset ADMIN_PW2
  ok "اطلاعات مدیر دریافت شد" "Admin credentials captured (stored only as a scrypt hash)"
fi

# =============================================================================
step "۱. پشتیبان‌گیری از نسخهٔ فعلی" "1. Backing up current site + database"
if [[ -d "$OLD_DIR" ]]; then
  tar -C "$(dirname "$OLD_DIR")" -czf "$RUN_DIR/old-app.tgz" \
    --exclude="$(basename "$OLD_DIR")/node_modules" --exclude="$(basename "$OLD_DIR")/.next" \
    --exclude="$(basename "$OLD_DIR")/.next-*" --exclude="$(basename "$OLD_DIR")/generated" \
    "$(basename "$OLD_DIR")"
  ok "فایل‌های برنامهٔ فعلی: $RUN_DIR/old-app.tgz ($(du -h "$RUN_DIR/old-app.tgz" | cut -f1))" "Old app archived"
  OLD_DB_URL="$(grep -E '^DATABASE_URL=' "$OLD_DIR/.env" 2>/dev/null | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//' || true)"
  if [[ -n "$OLD_DB_URL" ]]; then
    if pg_dump "${OLD_DB_URL%%\?*}" -Fc -f "$RUN_DIR/old-db.dump" && pg_restore --list "$RUN_DIR/old-db.dump" >/dev/null; then
      chmod 600 "$RUN_DIR/old-db.dump"
      ok "پشتیبان دیتابیس: $RUN_DIR/old-db.dump ($(du -h "$RUN_DIR/old-db.dump" | cut -f1))" "Old DB dumped"
    else
      die "پشتیبان‌گیری دیتابیس ناموفق بود؛ هیچ تغییری اعمال نشد" "pg_dump of the old DB failed. Nothing was changed. (pg_dump version mismatch? see log)"
    fi
  else
    warn "DATABASE_URL در $OLD_DIR/.env پیدا نشد؛ از دیتابیس پشتیبان گرفته نشد" "No DATABASE_URL in old .env; DB dump skipped"
  fi
else
  warn "پوشهٔ $OLD_DIR وجود ندارد" "$OLD_DIR not found; skipping app backup"
  OLD_DB_URL=""
fi

# =============================================================================
step "۲. دریافت کد نسخهٔ جدید" "2. Fetching source ($BRANCH)"
mkdir -p "$(dirname "$APP_DIR")"
export GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=60
if [[ -n "$TARBALL" ]]; then
  [[ -f "$TARBALL" ]] || die "فایل tarball پیدا نشد" "Tarball not found: $TARBALL"
  TMP_SRC="$(mktemp -d)"; tar -xzf "$TARBALL" -C "$TMP_SRC"
  SRC_ROOT="$(dirname "$(find "$TMP_SRC" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | head -1)")"
  [[ -f "$SRC_ROOT/prisma/schema.prisma" ]] || die "tarball معتبر نیست" "Tarball does not look like the lean app"
  mkdir -p "$APP_DIR"
  tar -C "$SRC_ROOT" --exclude=node_modules --exclude=.next --exclude=.env -cf - . | tar -C "$APP_DIR" -xf -
  rm -rf "$TMP_SRC"
  ok "کد از tarball کپی شد" "Source extracted from tarball"
elif [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  retry 5 15 git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH" \
    || die "دسترسی به GitHub ممکن نشد" "git fetch failed. Fallback: upload a tarball and run with --tarball FILE (see DEPLOY.md)."
  git -C "$APP_DIR" checkout -q -B "$BRANCH" FETCH_HEAD
  git -C "$APP_DIR" reset -q --hard FETCH_HEAD
  ok "به‌روزرسانی شد: $(git -C "$APP_DIR" log -1 --format='%h %s')" "Updated to latest $BRANCH"
else
  [[ -e "$APP_DIR" && -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]] && die "$APP_DIR خالی نیست و git نیست" "$APP_DIR exists and is not a git checkout"
  rm -rf "$APP_DIR"
  retry 5 15 git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR" \
    || { rm -rf "$APP_DIR"; die "دسترسی به GitHub ممکن نشد" "git clone failed. Fallback: upload a tarball and run with --tarball FILE (see DEPLOY.md)."; }
  ok "کلون شد: $(git -C "$APP_DIR" log -1 --format='%h %s')" "Cloned $BRANCH"
fi
cd "$APP_DIR"

# old app port: --old-port > nginx (apex vhost) > remembered from a previous run > 3000
if [[ -z "$OLD_PORT" ]]; then
  DETECTED=""
  (( HAVE_NGINX )) && DETECTED="$(python3 "$APP_DIR/deploy/lean/nginx_switch.py" detect --domain "$DOMAIN" 2>/dev/null || true)"
  if [[ -n "$DETECTED" && "$DETECTED" != "$NEW_PORT" ]]; then OLD_PORT="$DETECTED"
  elif [[ -f "$STATE_DIR/old_port" ]]; then OLD_PORT="$(cat "$STATE_DIR/old_port")"
  else OLD_PORT=3000; fi
fi
[[ "$OLD_PORT" =~ ^[0-9]+$ && "$OLD_PORT" != "$NEW_PORT" ]] || die "پورت قدیم نامعتبر: $OLD_PORT" "Invalid old port: $OLD_PORT"
[[ -f "$STATE_DIR/old_port" ]] || echo "$OLD_PORT" > "$STATE_DIR/old_port"
ok "پورت نسخهٔ فعلی: $OLD_PORT ، پورت نسخهٔ جدید: $NEW_PORT" "Old app port: $OLD_PORT, new app port: $NEW_PORT"

# =============================================================================
step "۳. دیتابیس جدید" "3. New PostgreSQL database ($DB_NAME)"
if [[ -f "$APP_DIR/.env" ]] && grep -q '^DATABASE_URL=' "$APP_DIR/.env"; then
  ok "دیتابیس قبلاً ساخته شده (از .env موجود استفاده می‌شود)" "Reusing DATABASE_URL from existing .env"
else
  command -v sudo >/dev/null || die "sudo لازم است" "sudo is required to run psql as postgres"
  sudo -u postgres psql -tAc 'select 1' >/dev/null 2>&1 \
    || die "دسترسی به PostgreSQL محلی (کاربر postgres) ممکن نیست" "Cannot run psql as the local 'postgres' user. Create DB/user manually and put DATABASE_URL in $APP_DIR/.env, then re-run."
  PG_HOST=127.0.0.1; PG_PORT=5432
  if [[ "${OLD_DB_URL:-}" =~ @([^:/?]+)(:([0-9]+))?/ ]]; then
    case "${BASH_REMATCH[1]}" in localhost|127.0.0.1) PG_PORT="${BASH_REMATCH[3]:-5432}";; esac
  fi
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SQL
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -qc "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8' TEMPLATE template0"
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -qd "$DB_NAME" -c "ALTER SCHEMA public OWNER TO ${DB_USER}"
  NEW_DB_URL="postgresql://${DB_USER}:${DB_PASS}@${PG_HOST}:${PG_PORT}/${DB_NAME}?schema=public"
  psql "${NEW_DB_URL%%\?*}" -tAc 'select 1' >/dev/null \
    || die "اتصال با کاربر جدید ممکن نشد (pg_hba.conf؟)" "Cannot connect as ${DB_USER} over TCP (check pg_hba.conf allows md5/scram on 127.0.0.1)"
  ok "دیتابیس ${DB_NAME} و کاربر ${DB_USER} آماده است" "Database + user ready (password generated, stored only in .env)"
fi

# =============================================================================
step "۴. حافظهٔ swap" "4. Swap (low-memory build)"
if (( MEM_MB < 3500 && SWAP_MB < 2000 )); then
  if [[ ! -f /swapfile-setaregan ]]; then
    fallocate -l 2G /swapfile-setaregan 2>/dev/null || dd if=/dev/zero of=/swapfile-setaregan bs=1M count=2048 status=none
    chmod 600 /swapfile-setaregan; mkswap /swapfile-setaregan >/dev/null
  fi
  swapon --show=NAME | grep -q /swapfile-setaregan || swapon /swapfile-setaregan
  grep -q '/swapfile-setaregan' /etc/fstab || echo '/swapfile-setaregan none swap sw 0 0' >> /etc/fstab
  ok "swap دو گیگابایتی فعال شد" "2 GB swap enabled (/swapfile-setaregan)"
else
  ok "نیازی به swap اضافه نیست" "Enough memory/swap"
fi
if (( MEM_MB >= 6000 )); then HEAP=4096; elif (( MEM_MB >= 3500 )); then HEAP=2560; else HEAP=1536; fi

# =============================================================================
step "۵. نصب وابستگی‌ها (npm ci)" "5. Installing dependencies (may take a while)"
export NEXT_TELEMETRY_DISABLED=1 npm_config_fund=false npm_config_audit=false
retry 3 20 npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
  || die "npm ci ناموفق بود (شبکه؟)" "npm ci failed (network?). You can set npm_config_registry=<mirror> and re-run."
ok "وابستگی‌ها نصب شد" "Dependencies installed"

# =============================================================================
step "۶. فایل تنظیمات .env" "6. Writing .env"
mkdir -p "$DATA_DIR/uploads"; chmod 750 "$DATA_DIR"
if [[ ! -f "$APP_DIR/.env" ]]; then
  ADMIN_HASH="$(printf '%s' "$ADMIN_PW" | npx tsx scripts/hash-password.ts)"
  [[ "$ADMIN_HASH" == scrypt:* ]] || die "هش رمز ساخته نشد" "Password hashing failed"
  umask 077
  cat > "$APP_DIR/.env" <<ENV
# generated by deploy/lean/install.sh on ${STAMP}. Keep secret (chmod 600).
DATABASE_URL="${NEW_DB_URL}"
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD_HASH=${ADMIN_HASH}
SESSION_SECRET=$(openssl rand -hex 32)
UPLOAD_DIR=${DATA_DIR}/uploads
SITE_URL=https://${DOMAIN}
ENV
  umask 022
  unset ADMIN_PW ADMIN_HASH DB_PASS NEW_DB_URL
  ok ".env ساخته شد" ".env created (chmod 600)"
elif [[ $RESET_ADMIN -eq 1 ]]; then
  ADMIN_HASH="$(printf '%s' "$ADMIN_PW" | npx tsx scripts/hash-password.ts)"
  [[ "$ADMIN_HASH" == scrypt:* ]] || die "هش رمز ساخته نشد" "Password hashing failed"
  sed -i -E "s|^ADMIN_USERNAME=.*|ADMIN_USERNAME=${ADMIN_USER}|; s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=${ADMIN_HASH}|" "$APP_DIR/.env"
  unset ADMIN_PW ADMIN_HASH
  ok "رمز مدیر به‌روزرسانی شد" "Admin credentials updated"
else
  ok ".env موجود حفظ شد" "Existing .env kept"
fi
chmod 600 "$APP_DIR/.env"

# =============================================================================
step "۷. ساخت نسخهٔ production" "7. Building (heap ${HEAP} MB)"
rm -rf .next-build
NEXT_BUILD_DIST_DIR=.next-build NODE_OPTIONS="--max-old-space-size=${HEAP}" npm run build \
  || die "build ناموفق بود؛ سایت فعلی دست نخورده است" "Build failed; the live site is untouched."
ok "build موفق بود" "Build OK"

# =============================================================================
step "۸. مهاجرت و دادهٔ اولیه" "8. Database migration + first-time seed"
retry 2 5 npx prisma migrate deploy || die "migrate ناموفق" "prisma migrate deploy failed"
set -a; . "$APP_DIR/.env"; set +a
SETTINGS_COUNT="$(psql "${DATABASE_URL%%\?*}" -tAc 'select count(*) from "Setting"' 2>/dev/null || echo 0)"
if [[ "${SETTINGS_COUNT// /}" == "0" ]]; then
  npm run db:seed || die "seed ناموفق" "Seeding failed"
  touch "$STATE_DIR/seeded"
  ok "محتوای واقعی سایت بارگذاری شد" "Seeded real content + images"
else
  ok "دیتابیس محتوا دارد؛ seed اجرا نشد" "DB already has content; seed skipped (admin edits preserved)"
fi
unset DATABASE_URL ADMIN_PASSWORD_HASH SESSION_SECRET

# =============================================================================
step "۹. اجرای برنامه با PM2 روی پورت $NEW_PORT" "9. Starting PM2 process $PM2_NAME on :$NEW_PORT"
rm -rf .next.prev; if [[ -d .next ]]; then mv .next .next.prev; fi; mv .next-build .next
if "${PM2[@]}" describe "$PM2_NAME" >/dev/null 2>&1; then
  "${PM2[@]}" reload "$PM2_NAME" --update-env
else
  PORT="$NEW_PORT" NODE_ENV=production "${PM2[@]}" start "$APP_DIR/node_modules/next/dist/bin/next" \
    --name "$PM2_NAME" --cwd "$APP_DIR" --max-memory-restart 700M --time -- start -p "$NEW_PORT" -H 127.0.0.1
fi
"${PM2[@]}" save >/dev/null

BASE="http://127.0.0.1:${NEW_PORT}"
for i in $(seq 1 45); do curl -fsS -o /dev/null -m 5 "$BASE/" && break; sleep 2; done
FAILED=0
for p in / /education /ghalamchi /contact /register /admin/login /media/seed/images__hero__hero.webp; do
  code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$BASE$p" || echo 000)"
  if [[ "$code" == 200 ]]; then echo "    ${G}200${N} $p"; else echo "    ${R}${code}${N} $p"; FAILED=1; fi
done
if (( FAILED )); then
  "${PM2[@]}" logs "$PM2_NAME" --lines 40 --nostream || true
  die "بررسی سلامت ناموفق بود؛ nginx تغییر نکرد" "Health check failed. nginx NOT switched; old site still live."
fi
ok "نسخهٔ جدید روی $BASE سالم است" "New app healthy on $BASE"

# =============================================================================
if (( SKIP_NGINX )); then
  warn "سوییچ nginx انجام نشد (--skip-nginx)" "nginx untouched. Preview: ssh -L ${NEW_PORT}:127.0.0.1:${NEW_PORT} root@server, then open http://localhost:${NEW_PORT}"
else
  step "۱۰. سوییچ nginx از پورت $OLD_PORT به $NEW_PORT" "10. Switching nginx for ${DOMAIN} (other subdomains untouched)"
  NGX_DIR="$RUN_DIR/nginx"; mkdir -p "$NGX_DIR"
  nginx -T > "$NGX_DIR/nginx-T-before.txt" 2>&1 || die "تنظیمات فعلی nginx خطا دارد" "nginx -T fails on the CURRENT config; fix that first"
  tar -czf "$NGX_DIR/etc-nginx.tgz" -C /etc nginx
  OUT="$(python3 "$APP_DIR/deploy/lean/nginx_switch.py" switch --domain "$DOMAIN" --old "$OLD_PORT" --new "$NEW_PORT" --backup-dir "$NGX_DIR")"
  echo "$OUT" | sed 's/^/    /'
  CHANGES="$(echo "$OUT" | sed -n 's/^TOTAL_CHANGES=//p')"
  if [[ "${CHANGES:-0}" == 0 ]]; then
    if grep -q "127.0.0.1:${NEW_PORT}" "$NGX_DIR/nginx-T-before.txt"; then
      ok "nginx از قبل به نسخهٔ جدید اشاره می‌کند" "nginx already points to :$NEW_PORT"
    else
      warn "هیچ proxy_pass با پورت $OLD_PORT برای $DOMAIN پیدا نشد؛ nginx تغییر نکرد" "No proxy_pass to :$OLD_PORT found in the $DOMAIN server block. Edit manually (see $NGX_DIR/nginx-T-before.txt) or pass --old-port."
    fi
  else
    if ! nginx -t; then
      bash "$APP_DIR/deploy/lean/rollback.sh" --dir "$NGX_DIR" --no-reload --force || true
      die "nginx -t خطا داد؛ تنظیمات قبلی برگردانده شد" "nginx -t failed; original config restored."
    fi
    systemctl reload nginx 2>/dev/null || nginx -s reload
    ln -sfn "$NGX_DIR" "$STATE_DIR/nginx-latest"
    sleep 2
    live_code() { # live_code <path> : try https then http against local nginx
      local c
      c="$(curl -sk -o /dev/null -m 15 -L --max-redirs 5 -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}$1" 2>/dev/null)" || c=000
      [[ "$c" == 000 ]] && { c="$(curl -s -o /dev/null -m 15 -w '%{http_code}' --resolve "${DOMAIN}:80:127.0.0.1" "http://${DOMAIN}$1" 2>/dev/null)" || c=000; }
      echo "$c"
    }
    LIVE="$(live_code /media/seed/images__hero__hero.webp)"
    HOME_CODE="$(live_code /)"
    if [[ "$LIVE" == 200 && "$HOME_CODE" == 200 ]]; then
      ok "https://${DOMAIN} اکنون نسخهٔ جدید را نشان می‌دهد" "Live: https://${DOMAIN} now served by $PM2_NAME"
    else
      warn "بررسی https ناموفق بود (media=$LIVE home=$HOME_CODE)؛ بازگردانی nginx…" "HTTPS check failed (media=$LIVE, home=$HOME_CODE); rolling nginx back"
      bash "$APP_DIR/deploy/lean/rollback.sh" --dir "$NGX_DIR" --force || true
      die "سایت به نسخهٔ قبلی برگشت" "Rolled back to the old site. Inspect $NGX_DIR and the log."
    fi
  fi
fi

# =============================================================================
if (( STOP_OLD )); then
  step "۱۱. توقف نسخهٔ قدیم" "11. Stopping old PM2 process ($OLD_PM2)"
  if nginx -T 2>/dev/null | grep -Eq "proxy_pass\s+https?://(127\.0\.0\.1|localhost):${OLD_PORT}\b"; then
    warn "هنوز vhostهای دیگری (مثل shop. یا academy.) به پورت $OLD_PORT وصل‌اند؛ نسخهٔ قدیم متوقف نشد" \
         "Other vhosts still proxy to :$OLD_PORT (e.g. shop./academy.). Old process NOT stopped. Move/remove them first."
  else
    "${PM2[@]}" stop "$OLD_PM2" && "${PM2[@]}" save >/dev/null && ok "نسخهٔ قدیم متوقف شد" "Old process stopped (start again: pm2 start $OLD_PM2)"
  fi
else
  ok "نسخهٔ قدیم همچنان در حال اجراست (برای زیردامنه‌ها و بازگشت سریع)" "Old PM2 process '$OLD_PM2' left running"
fi

# =============================================================================
echo
echo "${B}${G}════════ پایان | DONE ════════${N}"
echo "  App dir / پوشهٔ برنامه:   $APP_DIR"
echo "  Uploads / فایل‌ها:        $DATA_DIR/uploads"
echo "  Secrets / رمزها:          $APP_DIR/.env  (chmod 600)"
echo "  Backups / پشتیبان‌ها:      $RUN_DIR"
echo "  Admin / مدیریت:           https://${DOMAIN}/admin"
echo "  Logs:                     ${PM2[*]} logs $PM2_NAME"
echo "  Rollback / بازگشت:        bash $APP_DIR/deploy/lean/rollback.sh"
