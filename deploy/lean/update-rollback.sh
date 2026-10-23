#!/usr/bin/env bash
# =============================================================================
#  Undo deploy/lean/update.sh  |  بازگشت به‌روزرسانی
#    bash /var/www/setareganplus-lean/deploy/lean/update-rollback.sh          # shop back to the old app (nginx only)
#    bash /var/www/setareganplus-lean/deploy/lean/update-rollback.sh --app    # also previous lean code + build
#  Note: orders placed in the lean shop after the update are NOT copied back to the old app;
#        see them in /admin/shop/orders of the lean site.
# =============================================================================
set -Eeuo pipefail
STATE_DIR="${STATE_DIR:-/var/backups/setareganplus-lean}"; APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
PM2_NAME="${PM2_NAME:-setareganplus-lean}"; SNIPPET="${SNIPPET:-/etc/nginx/snippets/sp-booklet.conf}"
DIR="${DIR:-$(readlink -f "$STATE_DIR/update-latest" 2>/dev/null || ls -1dt "$STATE_DIR"/update-* 2>/dev/null | head -1)}"
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }
[[ -n "$DIR" && -d "$DIR" ]] || { echo "✘ no update backup found in $STATE_DIR"; exit 1; }
echo "==> using backup $DIR"
if [[ -f "$DIR/sp-booklet.conf.bak" ]]; then
  cp -p "$SNIPPET" "$DIR/sp-booklet.conf.rolledback" 2>/dev/null || true
  cp -p "$DIR/sp-booklet.conf.bak" "$SNIPPET"
  if nginx -t; then systemctl reload nginx 2>/dev/null || nginx -s reload; echo "✔ nginx: /shop /booklet /order /o -> old app again"
    D="${DOMAIN:-setareganplus.ir}"; for i in 1 2 3 4 5 6; do H="$(curl -sk -m 15 --resolve "$D:443:127.0.0.1" "https://$D/shop" 2>/dev/null || true)"; [[ "$H" != *data-sp-lean-shop* ]] && break; sleep 2; done
    [[ "$H" == *data-sp-lean-shop* ]] && echo "⚠ /shop still answered by the lean app; wait a few seconds and check again" || echo "✔ checked: /shop is the old shop"
  else cp -p "$DIR/sp-booklet.conf.rolledback" "$SNIPPET"; echo "✘ nginx -t failed; left as it was"; exit 1; fi
else echo "• no nginx snippet backup in $DIR (nginx was not changed by that update)"; fi
if [[ "${1:-}" == "--app" && -f "$DIR/prev_commit" ]]; then
  cd "$APP_DIR"
  PM2=(pm2); command -v pm2 >/dev/null || PM2=(/var/www/setareganplus/node_modules/.bin/pm2)
  if git cat-file -e "$(cat "$DIR/prev_commit")^{commit}" 2>/dev/null; then git reset -q --hard "$(cat "$DIR/prev_commit")"; echo "✔ code -> $(git log -1 --format='%h %s')"; else echo "• previous commit not in the shallow clone; code left as is"; fi
  [[ -f "$DIR/lean.env.bak" ]] && cp -p "$DIR/lean.env.bak" .env && echo "✔ .env restored"
  if [[ -d .next.prev ]]; then rm -rf .next.rolledback; mv .next .next.rolledback; mv .next.prev .next; "${PM2[@]}" reload "$PM2_NAME"; echo "✔ previous build running"; fi
  echo "  (database schema changes are additive and kept; DB backup: $DIR/lean-db.dump)"
fi
echo "done."
