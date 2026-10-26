#!/usr/bin/env bash
# Close the OLD shop subdomain shop.setareganplus.ir (run once, as root):
#   /admin...      -> 302 https://setareganplus.ir/admin
#   /book/<slug>   -> 301 https://setareganplus.ir/shop/<slug>
#   everything else-> 301 https://setareganplus.ir/shop
#   /.well-known/acme-challenge/ keeps working (certbot renewals).
# Only the shop.setareganplus.ir server blocks are edited. The old app on :3000
# and its data are NOT stopped or deleted (other subdomains still use it).
#
#   bash deploy/lean/close-old-shop.sh          # apply (idempotent)
#   bash deploy/lean/close-old-shop.sh --undo   # restore the latest backup
#
# Test overrides: SITES_DIR, BACKUP_ROOT, NGINX_BIN, RELOAD_CMD, SKIP_VERIFY=1
set -Eeuo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$HERE/close_old_shop.py"
SITES_DIR="${SITES_DIR:-/etc/nginx/sites-enabled}"
BACKUP_ROOT="${BACKUP_ROOT:-/root}"
NGINX_BIN="${NGINX_BIN:-nginx}"
RELOAD_CMD="${RELOAD_CMD:-systemctl reload nginx}"
PREFIX="nginx-old-shop-backup-"

say()  { printf '%s\n' "$*"; }
die()  { printf '\n❌ %s\n' "$1" >&2; [[ -n "${2:-}" ]] && printf '   (%s)\n' "$2" >&2; exit "${3:-1}"; }

if [[ "$SITES_DIR" == /etc/nginx/* && $EUID -ne 0 ]]; then
  die "این اسکریپت باید با کاربر root اجرا بشه." "run as root"
fi
command -v python3 >/dev/null || die "python3 روی سرور پیدا نشد." "python3 missing"
command -v "$NGINX_BIN" >/dev/null || die "nginx پیدا نشد." "nginx missing"

restore_from() {  # $1 = backup dir
  local d="$1" orig bk
  [[ -f "$d/manifest.tsv" ]] || return 1
  while IFS=$'\t' read -r orig bk; do
    bk="$d/${bk##*/}"  # survives renaming of the backup dir
    if [[ -n "$orig" && -f "$bk" ]]; then cp -p "$bk" "$orig"; fi
  done < "$d/manifest.tsv"
  return 0
}

nginx_ok() { "$NGINX_BIN" -t >/tmp/sp-close-old-shop-nginx-t.log 2>&1; }

reload_nginx() {
  # shellcheck disable=SC2086
  $RELOAD_CMD || die "nginx ری‌لود نشد. خروجی 'systemctl status nginx' رو بفرست." "reload failed"
}

verify() {
  [[ -n "${SKIP_VERIFY:-}" ]] && return 0
  sleep 2  # let reloaded workers take over
  command -v curl >/dev/null || return 0
  say ""
  say "بررسی از روی خود سرور:"
  local p code loc
  for p in /admin /admin/login / /book/arabi /cart /.well-known/acme-challenge/sp-test; do
    read -r code loc < <(curl -sk -o /dev/null -w '%{http_code} %{redirect_url}\n' --max-time 10 \
      --resolve "shop.setareganplus.ir:${VERIFY_PORT:-443}:127.0.0.1" "https://shop.setareganplus.ir:${VERIFY_PORT:-443}$p" || echo "ERR -")
    say "  $p  ->  $code ${loc:-}"
  done
}

# ---------------------------------------------------------------- --undo
if [[ "${1:-}" == "--undo" ]]; then
  LATEST="$(ls -1d "$BACKUP_ROOT/$PREFIX"* 2>/dev/null | grep -Ev '\.(undone|failed)$' | sort | tail -1 || true)"
  [[ -n "$LATEST" ]] || die "هیچ نسخه‌ی پشتیبانی پیدا نشد؛ چیزی برای برگردوندن نیست." "no backup in $BACKUP_ROOT"
  restore_from "$LATEST" || die "فایل manifest توی $LATEST نیست." "bad backup"
  if ! nginx_ok; then
    cat /tmp/sp-close-old-shop-nginx-t.log >&2
    die "تنظیمات برگردونده شد ولی nginx -t خطا داد. خروجی بالا رو بفرست." "nginx -t failed after undo"
  fi
  reload_nginx
  mv "$LATEST" "$LATEST.undone"
  say "✅ برگردونده شد. shop.setareganplus.ir دوباره مثل قبل کار می‌کنه."
  say "   (from $LATEST)"
  exit 0
fi
[[ -z "${1:-}" ]] || die "گزینه‌ی ناشناخته: $1  (فقط --undo مجازه)" "unknown option"

# ---------------------------------------------------------------- apply
set +e
FOUND="$(python3 "$PY" check --sites "$SITES_DIR" 2>&1)"; rc=$?
set -e
case $rc in
  0) ;;
  3) die "هیچ فایل nginx با server_name shop.setareganplus.ir توی $SITES_DIR پیدا نشد. چیزی تغییر نکرد." "no matching vhost" ;;
  4) die "بلوک shop.setareganplus.ir با دامنه‌های دیگه مشترکه؛ دست نزدم تا اون‌ها خراب نشن. این خط رو بفرست: $FOUND" "shared server block" ;;
  *) die "خطا در خوندن تنظیمات nginx. این رو بفرست: $FOUND" "check failed rc=$rc" ;;
esac

nginx_ok || { cat /tmp/sp-close-old-shop-nginx-t.log >&2; die "nginx همین الان هم (قبل از تغییر من) خطا داره. چیزی تغییر ندادم." "nginx -t failed before edit"; }

TS="$(date +%Y%m%d-%H%M%S)"
BK="$BACKUP_ROOT/$PREFIX$TS"
set +e
OUT="$(python3 "$PY" apply --sites "$SITES_DIR" --backup "$BK" 2>&1)"; rc=$?
set -e
say "$OUT"
if [[ $rc -eq 10 ]]; then
  rmdir "$BK" 2>/dev/null || true
  say "✅ پنل و فروشگاه قدیمی از قبل بسته شده بودن؛ چیزی تغییر نکرد."
  verify
  exit 0
fi
if [[ $rc -ne 0 ]]; then
  restore_from "$BK" || true
  die "ویرایش انجام نشد و همه‌چیز به حالت قبل برگشت." "apply failed rc=$rc"
fi

if ! nginx_ok; then
  cat /tmp/sp-close-old-shop-nginx-t.log >&2
  restore_from "$BK"
  mv "$BK" "$BK.failed"
  die "تنظیمات جدید nginx خطا داشت، برای همین همه‌چیز رو به حالت قبل برگردوندم. سایت‌ها مثل قبل کار می‌کنن. خروجی بالا رو بفرست." "nginx -t failed; restored" 2
fi
reload_nginx

say ""
say "✅ فروشگاه و پنل قدیمی بسته شد."
say "   shop.setareganplus.ir/admin  ->  setareganplus.ir/admin"
say "   بقیه‌ی صفحه‌های shop.setareganplus.ir  ->  setareganplus.ir/shop"
say "   برنامه‌ی قدیمی و زیردامنه‌های دیگه دست نخوردن."
say "   پشتیبان: $BK"
say "   برگردوندن: bash deploy/lean/close-old-shop.sh --undo"
verify
