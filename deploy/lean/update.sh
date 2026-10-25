#!/usr/bin/env bash
# =============================================================================
#  setareganplus.ir: update the lean site + move the booklet shop into it
#  به‌روزرسانی سایت جدید و انتقال فروشگاه جزوه به آن (با یک دستور)
#
#  Run as root on the server:
#    cd /var/www/setareganplus-lean && git fetch --depth 1 origin lean-redesign && git reset --hard FETCH_HEAD && bash deploy/lean/update.sh
#
#  What it does (the old app in /var/www/setareganplus is NEVER modified):
#    1. git fetch + reset --hard origin/lean-redesign (.env / uploads are untouched)
#    2. copies Zibal + SMS.ir keys from the old .env into the lean .env (silently)
#    3. npm ci, build into .next-build (live site keeps running), full backup (backup.sh, reuses
#       one from the last 6 h) + nightly backup timer, prisma migrate deploy (NO seed)
#    4. imports booklets + orders from the old DB (read-only, idempotent)
#    5. pm2 reload + health checks (auto-restores the previous build on failure)
#    6. nginx: /shop /booklet /order /o now go to the lean app; /payments,
#       /ghalamchi/register/receipt and /images stay on the old app.
#       nginx -t + live checks, automatic rollback on failure
#    7. imports orders again (catches orders made during the update) and
#       schedules two more silent re-syncs (+20 min, +2 h)
#
#  Flags: --skip-nginx  --skip-migrate  --resync-secrets (overwrite keys already in lean .env)
#  Rollback: bash /var/www/setareganplus-lean/deploy/lean/update-rollback.sh
# =============================================================================
set -Eeuo pipefail

BRANCH="${BRANCH:-lean-redesign}"
DOMAIN="${DOMAIN:-setareganplus.ir}"
OLD_DIR="${OLD_DIR:-/var/www/setareganplus}"
APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
STATE_DIR="${STATE_DIR:-/var/backups/setareganplus-lean}"
PM2_NAME="${PM2_NAME:-setareganplus-lean}"
NEW_PORT="${NEW_PORT:-3100}"
OLD_PORT="${OLD_PORT:-$(cat "$STATE_DIR/old_port" 2>/dev/null || echo 3000)}"
SNIPPET="${SNIPPET:-/etc/nginx/snippets/sp-booklet.conf}"
SKIP_NGINX=0; SKIP_MIGRATE=0; FORCE_SECRETS=0
for a in "$@"; do case "$a" in
  --skip-nginx) SKIP_NGINX=1 ;; --skip-migrate) SKIP_MIGRATE=1 ;; --resync-secrets) FORCE_SECRETS=1 ;;
  -h|--help) sed -n '2,24p' "$0"; exit 0 ;; *) echo "Unknown option: $a" >&2; exit 2 ;;
esac; done

STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$STATE_DIR/update-$STAMP"
LOG="$RUN_DIR/update.log"
if [[ -t 1 ]]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; C=$'\e[36m'; N=$'\e[0m'; else B= G= Y= R= C= N=; fi
step() { echo; echo "${B}${C}==> $1${N}"; echo "    $2"; }
ok()   { echo "${G}  ✔ $1${N}"; [[ -n "${2:-}" ]] && echo "    $2"; return 0; }
warn() { echo "${Y}  ⚠ $1${N}"; [[ -n "${2:-}" ]] && echo "    $2"; return 0; }
die()  { echo "${R}  ✘ $1${N}" >&2; echo "    $2" >&2; echo "    log: $LOG" >&2; exit 1; }
trap 'echo "${R}  ✘ خطا در خط $LINENO | Failed at line $LINENO${N}" >&2; echo "    log: $LOG" >&2' ERR

# ---------------------------------------------------------------------------
step "۰. بررسی‌ها" "0. Preflight"
[[ $EUID -eq 0 ]] || die "باید با root اجرا شود" "Run as root."
[[ -d "$APP_DIR/.git" && -f "$APP_DIR/.env" ]] || die "سایت جدید نصب نیست" "$APP_DIR is not installed yet; run install.sh first."
mkdir -p "$RUN_DIR"; chmod 700 "$STATE_DIR"
exec > >(tee -a "$LOG") 2>&1
if command -v pm2 >/dev/null; then PM2=(pm2); elif [[ -x "$OLD_DIR/node_modules/.bin/pm2" ]]; then PM2=("$OLD_DIR/node_modules/.bin/pm2"); else die "pm2 پیدا نشد" "pm2 not found"; fi
"${PM2[@]}" describe "$PM2_NAME" >/dev/null 2>&1 || die "پروسهٔ $PM2_NAME در pm2 نیست" "PM2 process $PM2_NAME not found; run install.sh"
pm2_info() { # prints "<status> <pid> <restarts>" for $PM2_NAME
  "${PM2[@]}" jlist 2>/dev/null | python3 -c 'import json,sys
n=sys.argv[1]
for p in json.load(sys.stdin):
    if p.get("name")==n: print(p["pm2_env"].get("status"), p.get("pid"), p["pm2_env"].get("restart_time",0)); break
else: print("missing 0 0")' "$PM2_NAME"
}
port_pid() { ss -ltnpH "sport = :$NEW_PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; }
pm2_healthy() { # online, owns the port, not crash-looping
  local a b; read -r a _ ra <<<"$(pm2_info)"; sleep 6; read -r b pid rb <<<"$(pm2_info)"
  [[ "$a" == online && "$b" == online && "$ra" == "$rb" ]] || { echo "    pm2 status: $b (restarts $ra -> $rb)"; return 1; }
  local owner; owner="$(port_pid)"
  [[ -z "$owner" || "$owner" == "$pid" ]] || pgrep -P "$pid" 2>/dev/null | grep -qx "$owner" || { echo "    port $NEW_PORT is held by pid $owner, not by pm2 ($pid)"; return 1; }
  return 0
}
cd "$APP_DIR"
ok "آماده" "old port $OLD_PORT, lean port $NEW_PORT, backups in $RUN_DIR"

# ---------------------------------------------------------------------------
step "۱. دریافت آخرین نسخه" "1. git fetch + reset --hard origin/$BRANCH"
# previous *deployed* commit (for update-rollback.sh --app): last successful update, else the commit
# before the operator's own `git reset` (ORIG_HEAD), else HEAD
PREV="${SP_PREV_COMMIT:-$(cat "$STATE_DIR/deployed_commit" 2>/dev/null || git rev-parse -q --verify ORIG_HEAD 2>/dev/null || git rev-parse HEAD)}"
echo "$PREV" > "$RUN_DIR/prev_commit"; export SP_PREV_COMMIT="$PREV"
export GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=60
ok_fetch=0
for i in 1 2 3 4 5; do git fetch --depth 1 origin "$BRANCH" && { ok_fetch=1; break; }; warn "تلاش $i ناموفق" "fetch attempt $i failed; retrying"; sleep $((i * 10)); done
(( ok_fetch )) || die "دسترسی به GitHub ممکن نشد" "git fetch failed; nothing changed."
SELF_BEFORE="$(sha1sum "$0" 2>/dev/null | cut -d' ' -f1 || true)"
git checkout -q -B "$BRANCH" FETCH_HEAD && git reset -q --hard FETCH_HEAD
ok "نسخه: $(git log -1 --format='%h %s')"
if [[ -z "${SP_UPDATE_REEXEC:-}" && "$(readlink -f "$0")" == "$APP_DIR/deploy/lean/update.sh" && "$SELF_BEFORE" != "$(sha1sum "$0" | cut -d' ' -f1)" ]]; then
  echo "    script updated; restarting it…"; export SP_UPDATE_REEXEC=1; exec bash "$APP_DIR/deploy/lean/update.sh" "$@"
fi

# ---------------------------------------------------------------------------
step "۲. کلیدهای زیبال و پیامک" "2. Copying Zibal / SMS.ir keys from the old .env (values are never printed)"
cp -p .env "$RUN_DIR/lean.env.bak"; chmod 600 "$RUN_DIR/lean.env.bak"
if [[ -f "$OLD_DIR/.env" ]]; then
  FORCE="$FORCE_SECRETS" OLD_ENV="$OLD_DIR/.env" NEW_ENV="$APP_DIR/.env" DOMAIN="$DOMAIN" python3 - <<'PY'
import os, re
def parse(p):
    out = {}
    for line in open(p, encoding="utf-8", errors="replace"):
        m = re.match(r'^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$', line.rstrip("\n"))
        if m: out[m.group(1)] = m.group(2).strip()
    return out
old, newp = parse(os.environ["OLD_ENV"]), os.environ["NEW_ENV"]
new = parse(newp)
want = [k for k in old if k in ("ZIBAL_MERCHANT_ID", "ZIBAL_TIMEOUT_MS", "ZIBAL_BASE_URL") or k.startswith("SMSIR_") or k.startswith("STAROS_SMS_")]
want = [k for k in want if k not in ("SMSIR_TEST_BASE_URL",)]
force = os.environ.get("FORCE") == "1"
lines = open(newp, encoding="utf-8").read().splitlines()
changed = []
for k in want:
    v = old[k]
    if v.strip("\"'") == "": continue
    if k in new and new[k].strip("\"'") != "" and not force: continue
    lines = [l for l in lines if not re.match(rf'^\s*(?:export\s+)?{k}\s*=', l)]
    lines.append(f"{k}={v}"); changed.append(k)
if "SITE_URL" not in new or not new["SITE_URL"].strip("\"'"):
    lines.append(f"SITE_URL=https://{os.environ['DOMAIN']}"); changed.append("SITE_URL")
if changed:
    open(newp, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("    keys set:", ", ".join(changed) if changed else "(none, already present)")
print("    zibal:", "yes" if any(k == "ZIBAL_MERCHANT_ID" for k in want) or "ZIBAL_MERCHANT_ID" in new else "MISSING",
      "| sms key:", "yes" if "SMSIR_API_KEY" in want or "SMSIR_API_KEY" in new else "MISSING")
PY
  chmod 600 .env
  ok "کلیدها منتقل شد (مقادیر نمایش داده نمی‌شوند)"
else
  warn "فایل $OLD_DIR/.env پیدا نشد" "Old .env not found; set ZIBAL_MERCHANT_ID / SMSIR_* in $APP_DIR/.env manually"
fi

# ---------------------------------------------------------------------------
step "۳. نصب وابستگی‌ها" "3. npm ci"
export NEXT_TELEMETRY_DISABLED=1 npm_config_fund=false npm_config_audit=false
ok_ci=0
for i in 1 2 3; do npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 && { ok_ci=1; break; }; sleep $((i * 20)); done
(( ok_ci )) || die "npm ci ناموفق (شبکه؟)" "npm ci failed. Live site untouched (but code is updated; run update-rollback.sh --app to restore the previous code if needed)."
ok "وابستگی‌ها نصب شد"

# ---------------------------------------------------------------------------
MEM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
if (( MEM_MB >= 6000 )); then HEAP=4096; elif (( MEM_MB >= 3500 )); then HEAP=2560; else HEAP=1536; fi
step "۴. ساخت نسخهٔ جدید" "4. Building into .next-build (heap ${HEAP} MB); the live site keeps running"
rm -rf .next-build
NEXT_BUILD_DIST_DIR=.next-build NODE_OPTIONS="--max-old-space-size=${HEAP}" npm run build \
  || die "build ناموفق بود؛ سایت دست نخورده است" "Build failed; live site untouched."
ok "build موفق"

# ---------------------------------------------------------------------------
step "۵. به‌روزرسانی ساختار دیتابیس (بدون seed)" "5. prisma migrate deploy (seed is NEVER run)"
DBURL="$(grep -E '^DATABASE_URL=' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
pg_dump "${DBURL%%\?*}" -Fc -f "$RUN_DIR/lean-db.dump" && chmod 600 "$RUN_DIR/lean-db.dump" && ok "پشتیبان دیتابیس جدید: $RUN_DIR/lean-db.dump" \
  || warn "پشتیبان دیتابیس جدید گرفته نشد" "pg_dump of the lean DB failed (continuing)"
unset DBURL
# full backup (DB + uploads + .env + old DB) into /var/backups/setareganplus-lean, reusing one
# from the last 6 h; + make sure the nightly 03:30 backup timer is installed (idempotent)
if BK="$(bash "$APP_DIR/deploy/lean/backup.sh" --reuse-hours 6 --label pre-update --print-path)"; then
  ok "پشتیبان کامل: $BK"
else
  warn "پشتیبان کامل گرفته نشد! (ادامه می‌دهیم؛ پشتیبان دیتابیس بالا هست)" "backup.sh FAILED, see /var/backups/setareganplus-lean/backup.log (continuing: migrations are additive)"
fi
bash "$APP_DIR/deploy/lean/install-backup-timer.sh" || warn "تایمر پشتیبان شبانه نصب نشد" "backup timer install failed: bash $APP_DIR/deploy/lean/install-backup-timer.sh"
npx prisma migrate deploy || { sleep 5; npx prisma migrate deploy; } || die "migrate ناموفق" "prisma migrate deploy failed; live site still on the previous build."
ok "دیتابیس به‌روز شد"

# ---------------------------------------------------------------------------
run_migration() { # $1 = label
  [[ -f "$OLD_DIR/.env" ]] || { warn "دیتابیس قدیم پیدا نشد" "no $OLD_DIR/.env; import skipped"; return 0; }
  ( set +x
    OLD_DATABASE_URL="$(grep -E '^DATABASE_URL=' "$OLD_DIR/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')"
    OLD_DATABASE_URL="${OLD_DATABASE_URL%%\?*}"
    MEDIA="$(grep -E '^STAROS_MEDIA_ROOT=' "$OLD_DIR/.env" | head -1 | sed -E 's/^STAROS_MEDIA_ROOT=//; s/^"//; s/"$//')"
    export OLD_DATABASE_URL OLD_MEDIA_ROOT="${MEDIA:-/var/www/staros-media}"
    cd "$APP_DIR" && npx tsx scripts/migrate-old-shop.ts
  )
}
if (( SKIP_MIGRATE )); then warn "انتقال سفارش‌ها رد شد (--skip-migrate)"; else
  step "۶. انتقال جزوه‌ها و سفارش‌های قبلی" "6. Importing booklets + orders from the old DB (read-only on the old DB)"
  run_migration first || die "انتقال سفارش‌ها ناموفق بود؛ هنوز چیزی سوییچ نشده" "Import failed; nothing switched. Old shop still live."
  ok "جزوه‌ها و سفارش‌ها منتقل شد"
fi

# ---------------------------------------------------------------------------
step "۷. راه‌اندازی نسخهٔ جدید" "7. Swapping build + pm2 reload + health checks"
rm -rf .next.prev; [[ -d .next ]] && mv .next .next.prev; mv .next-build .next
"${PM2[@]}" reload "$PM2_NAME"
BASE="http://127.0.0.1:${NEW_PORT}"
sleep 3
for i in $(seq 1 45); do curl -fsS -o /dev/null -m 5 "$BASE/" && break; sleep 2; done
health() {
  local bad=0 code p
  local first="$(curl -s -m 15 "$BASE/shop" | grep -o 'href="/shop/[A-Za-z0-9%_-]*"' | grep -v '/shop/pay' | head -1 | sed 's/href="//; s/"$//')"
  for p in / /shop ${first:-} /register /education /ghalamchi /admin/login /media/seed/images__hero__hero.webp; do
    code="$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$BASE$p" || echo 000)"
    if [[ "$code" == 200 ]]; then echo "    ${G}200${N} $p"; else echo "    ${R}${code}${N} $p"; bad=1; fi
  done
  return $bad
}
if ! pm2_healthy || ! health; then
  "${PM2[@]}" logs "$PM2_NAME" --lines 40 --nostream || true
  if [[ -d .next.prev ]]; then rm -rf .next.failed; mv .next .next.failed; mv .next.prev .next; "${PM2[@]}" restart "$PM2_NAME"; fi
  die "نسخهٔ جدید سالم نبود؛ build قبلی برگردانده شد و nginx تغییر نکرد" "Health check failed; previous build restored, nginx untouched. Check: pm2 logs $PM2_NAME --lines 80 ; ss -ltnp | grep :$NEW_PORT"
fi
ok "نسخهٔ جدید سالم است"

# ---------------------------------------------------------------------------
if (( SKIP_NGINX )); then warn "nginx تغییر نکرد (--skip-nginx)"; else
  step "۸. سوییچ فروشگاه جزوه به سایت جدید" "8. nginx: /shop /booklet /order /o -> lean app"
  F="$(grep -rl 'sp-booklet.conf' /etc/nginx/sites-enabled/ /etc/nginx/sites-available/ /etc/nginx/conf.d/ 2>/dev/null | head -1 || true)"
  if [[ -z "$F" ]]; then
    warn "اسنیپت sp-booklet در nginx فعال نیست" "sp-booklet.conf is not included anywhere: the lean app already serves everything; skipped"
  else
    [[ -f "$SNIPPET" ]] && cp -p "$SNIPPET" "$RUN_DIR/sp-booklet.conf.bak"
    ln -sfn "$RUN_DIR" "$STATE_DIR/update-latest"
    cat > "$SNIPPET.new" <<NGX
# SP-BOOKLET v2 ($STAMP): the booklet shop now lives in the lean app (:$NEW_PORT).
# Only legacy payment callbacks / receipts / images stay on the old app (:$OLD_PORT).
proxy_http_version 1.1;
proxy_set_header Host \$host;
proxy_set_header X-Real-IP \$remote_addr;
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto \$scheme;
location ^~ /payments/ { proxy_pass http://127.0.0.1:$OLD_PORT; }
location ^~ /ghalamchi/register/receipt/ { proxy_pass http://127.0.0.1:$OLD_PORT; }
location ^~ /images/ { proxy_pass http://127.0.0.1:$OLD_PORT; }
location ^~ /_next/image { proxy_pass http://127.0.0.1:$NEW_PORT; proxy_intercept_errors on; error_page 400 404 500 508 = @sp_old; }
location ^~ /_next/ { proxy_pass http://127.0.0.1:$NEW_PORT; proxy_intercept_errors on; error_page 404 = @sp_old; }
location @sp_old { proxy_pass http://127.0.0.1:$OLD_PORT; }
location @sp_old_media { root /var/www/staros-media; rewrite ^/media/(.*)\$ /\$1 break; expires 30d; }
NGX
    mv "$SNIPPET.new" "$SNIPPET"
    restore_nginx() { if [[ -f "$RUN_DIR/sp-booklet.conf.bak" ]]; then cp -p "$RUN_DIR/sp-booklet.conf.bak" "$SNIPPET"; fi; nginx -t && { systemctl reload nginx 2>/dev/null || nginx -s reload; }; }
    if ! nginx -t; then restore_nginx; die "nginx -t خطا داد؛ تنظیمات قبلی برگشت" "nginx -t failed; previous snippet restored (old shop still live)."; fi
    systemctl reload nginx 2>/dev/null || nginx -s reload
    sleep 2
    live() { curl -sk -o /dev/null -m 20 -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}$1" 2>/dev/null || echo 000; }
    BAD=0
    for p in / /shop /register /media/seed/images__hero__hero.webp; do c="$(live "$p")"; echo "    $c $p"; [[ "$c" == 200 ]] || BAD=1; done
    # the shop page must now come from the lean app (it has the lean checkout marker)
    LEAN_OK=0
    for i in 1 2 3 4 5 6; do # old nginx workers may still answer for a few seconds after reload
      SHOP_HTML="$(curl -sk -m 20 --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/shop" 2>/dev/null || true)"
      [[ "$SHOP_HTML" == *data-sp-lean-shop* ]] && { LEAN_OK=1; break; }; sleep 2
    done
    (( LEAN_OK )) || { echo "    /shop is not served by the lean app"; BAD=1; }
    c="$(live /payments/callback/zibal)"; echo "    $c /payments/callback/zibal (old app)"; [[ "$c" == 502 || "$c" == 504 || "$c" == 000 ]] && BAD=1
    if (( BAD )); then restore_nginx; die "بررسی سایت ناموفق؛ فروشگاه قدیم برگردانده شد" "Live checks failed; nginx restored (old shop live again)."; fi
    ok "فروشگاه جزوه اکنون از سایت جدید سرو می‌شود" "https://${DOMAIN}/shop is now the lean shop"
  fi
fi

# ---------------------------------------------------------------------------
if (( ! SKIP_MIGRATE )); then
  step "۹. همگام‌سازی دوباره" "9. Second import pass + delayed re-syncs (+20 min, +2 h)"
  run_migration second || warn "همگام‌سازی دوم ناموفق" "second pass failed; run: bash $APP_DIR/deploy/lean/resync-old-shop.sh"
  if command -v systemd-run >/dev/null; then
    for d in 20m 2h; do systemd-run --quiet --on-active="$d" --unit="sp-shop-resync-$d-$STAMP" /bin/bash "$APP_DIR/deploy/lean/resync-old-shop.sh" >/dev/null 2>&1 || true; done
    ok "دو همگام‌سازی خودکار زمان‌بندی شد" "logs: $STATE_DIR/resync.log"
  fi
fi

git rev-parse HEAD > "$STATE_DIR/deployed_commit"
echo
echo "${B}${G}════════ پایان | DONE ════════${N}"
echo "  فروشگاه:   https://${DOMAIN}/shop"
echo "  مدیریت:    https://${DOMAIN}/admin/shop   (از این به بعد سفارش‌ها را فقط اینجا مدیریت کنید)"
echo "  پشتیبان:   $RUN_DIR  +  /var/backups/setareganplus-lean (هر شب ۳:۳۰)"
echo "  بازگشت:    bash $APP_DIR/deploy/lean/update-rollback.sh"
