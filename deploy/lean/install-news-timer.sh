#!/usr/bin/env bash
# Installs / refreshes the news-feed sync timer (every 3 hours). Idempotent: unit files are
# rewritten only when their content changed; safe to run on every update.
#   systemctl list-timers setareganplus-news.timer     # next run
#   tail -n 50 /var/log/setareganplus-news.log         # last runs
#   systemctl start setareganplus-news.service         # sync now
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
NAME=setareganplus-news
NODE_BIN="$(dirname "$(command -v node 2>/dev/null || echo /usr/bin/node)")"

SERVICE="[Unit]
Description=Setareganplus lean: import new articles from the news-feed branch
Wants=network-online.target
After=network-online.target postgresql.service

[Service]
Type=oneshot
ExecStart=/bin/bash $APP_DIR/deploy/lean/news-sync.sh
Environment=APP_DIR=$APP_DIR
Environment=PATH=$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Nice=10
TimeoutStartSec=15min
"
TIMER="[Unit]
Description=Setareganplus lean: news-feed sync every 3 hours

[Timer]
OnCalendar=*-*-* 01/3:20:00 Asia/Tehran
Persistent=true
RandomizedDelaySec=10min
Unit=$NAME.service

[Install]
WantedBy=timers.target
"
changed=0
put() { # file content
  printf '%s' "$2" > "$1.tmp"
  if [[ -f "$1" ]] && cmp -s "$1.tmp" "$1"; then rm -f "$1.tmp"; return 0; fi
  chmod 644 "$1.tmp" && mv "$1.tmp" "$1"; changed=1
}
mkdir -p "$UNIT_DIR"
put "$UNIT_DIR/$NAME.service" "$SERVICE"
put "$UNIT_DIR/$NAME.timer" "$TIMER"
if (( changed )); then $SYSTEMCTL daemon-reload; fi
$SYSTEMCTL is-enabled --quiet "$NAME.timer" 2>/dev/null && $SYSTEMCTL is-active --quiet "$NAME.timer" 2>/dev/null || $SYSTEMCTL enable --now "$NAME.timer" >/dev/null 2>&1
if (( changed )); then echo "    news timer installed/updated ($UNIT_DIR/$NAME.timer)"; else echo "    news timer already up to date"; fi
$SYSTEMCTL list-timers "$NAME.timer" --no-pager 2>/dev/null | sed -n '2p' | sed 's/^/    next: /' || true
