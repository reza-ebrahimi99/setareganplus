#!/usr/bin/env bash
# =============================================================================
#  Roll setareganplus.ir back to the OLD app (nginx upstream → old port).
#  بازگرداندن سایت به نسخهٔ قبلی
#
#    bash /var/www/setareganplus-lean/deploy/lean/rollback.sh [--stop-lean] [--force] [--dir DIR]
#
#  Restores the nginx files that install.sh changed (exact backups), checks
#  `nginx -t`, reloads, and makes sure the old PM2 process is running.
#  The lean app, its DB and uploads are NOT deleted.
#    --stop-lean   also stop the setareganplus-lean PM2 process
#    --force       restore even if the nginx file was edited after the switch
#    --dir DIR     a specific backup dir (default: /var/backups/setareganplus-lean/nginx-latest)
#    --no-reload   (internal) restore files without reloading nginx
# =============================================================================
set -Eeuo pipefail
STATE_DIR="${STATE_DIR:-/var/backups/setareganplus-lean}"
DOMAIN="${DOMAIN:-setareganplus.ir}"
OLD_PM2="${OLD_PM2:-setareganplus}"
PM2_NAME="${PM2_NAME:-setareganplus-lean}"
NEW_PORT="${NEW_PORT:-3100}"
DIR="$STATE_DIR/nginx-latest"; FORCE=0; STOP_LEAN=0; RELOAD=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --stop-lean) STOP_LEAN=1; shift ;;
    --no-reload) RELOAD=0; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
ok()   { echo "  ✔ $1"; echo "    $2"; }
warn() { echo "  ⚠ $1"; echo "    $2"; }
die()  { echo "  ✘ $1" >&2; echo "    $2" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "باید با root اجرا شود" "Run as root."

if command -v pm2 >/dev/null; then PM2=(pm2)
elif [[ -x /var/www/setareganplus/node_modules/.bin/pm2 ]]; then PM2=(/var/www/setareganplus/node_modules/.bin/pm2)
else PM2=(npx --yes pm2); fi

# 1) make sure the old app is up BEFORE pointing nginx at it
if "${PM2[@]}" describe "$OLD_PM2" >/dev/null 2>&1; then
  if ! "${PM2[@]}" jlist 2>/dev/null | python3 -c "import json,sys; sys.exit(0 if any(p['name']=='$OLD_PM2' and p['pm2_env']['status']=='online' for p in json.load(sys.stdin)) else 1)"; then
    "${PM2[@]}" start "$OLD_PM2" && ok "نسخهٔ قدیم دوباره اجرا شد" "Old PM2 process '$OLD_PM2' started"
  else
    ok "نسخهٔ قدیم در حال اجراست" "Old process '$OLD_PM2' is online"
  fi
else
  warn "پروسهٔ $OLD_PM2 در PM2 پیدا نشد" "PM2 process '$OLD_PM2' not found; start the old app manually"
fi

# 2) restore nginx files
DIR="$(readlink -f "$DIR" 2>/dev/null || echo "$DIR")"
if [[ -f "$DIR/manifest.tsv" ]]; then
  while IFS=$'\t' read -r orig backup sha_after; do
    [[ -f "$backup" ]] || die "فایل پشتیبان پیدا نشد: $backup" "Backup missing: $backup"
    cur="$(sha256sum "$orig" 2>/dev/null | cut -d' ' -f1 || true)"
    if [[ "$cur" != "$sha_after" && $FORCE -eq 0 ]]; then
      die "فایل $orig بعد از سوییچ تغییر کرده است" "$orig was edited after the switch. Re-run with --force to overwrite it with the pre-switch backup ($backup)."
    fi
    cp -a "$orig" "$DIR/$(basename "$backup").before-rollback" 2>/dev/null || true
    cp -a "$backup" "$orig"
    ok "بازگردانی شد: $orig" "Restored $orig"
  done < "$DIR/manifest.tsv"
else
  # no backup manifest: reverse the switch in place (apex vhost only)
  OLD_PORT="$(cat "$STATE_DIR/old_port" 2>/dev/null || echo 3000)"
  HELPER="$(dirname "$(readlink -f "$0")")/nginx_switch.py"
  [[ -f "$HELPER" ]] || die "پشتیبان nginx پیدا نشد" "No backup manifest in $DIR and no helper; restore from $STATE_DIR/*/nginx/etc-nginx.tgz manually"
  RB="$STATE_DIR/rollback-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$RB"
  python3 "$HELPER" switch --domain "$DOMAIN" --old "$NEW_PORT" --new "$OLD_PORT" --backup-dir "$RB"
  warn "بازگشت تقریبی انجام شد (فقط پورت)" "Approximate rollback (ports only). Exact pre-switch config: $STATE_DIR/<stamp>/nginx/etc-nginx.tgz"
fi

if nginx -t; then
  (( RELOAD )) && { systemctl reload nginx 2>/dev/null || nginx -s reload; }
  ok "nginx دوباره به نسخهٔ قدیم اشاره می‌کند" "nginx restored$( (( RELOAD )) && echo ' and reloaded')"
else
  die "nginx -t خطا داد؛ reload انجام نشد" "nginx -t failed after restore; nginx NOT reloaded. Full backup: $STATE_DIR/*/nginx/etc-nginx.tgz"
fi

if (( STOP_LEAN )); then
  "${PM2[@]}" stop "$PM2_NAME" && "${PM2[@]}" save >/dev/null && ok "نسخهٔ جدید متوقف شد" "Stopped $PM2_NAME"
fi
echo "  پایان بازگشت | Rollback done. Lean app/DB/uploads were kept."
