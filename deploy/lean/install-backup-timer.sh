#!/usr/bin/env bash
# Installs / refreshes the nightly backup timer (03:30 Asia/Tehran). Idempotent:
# unit files are rewritten only when their content changed; safe to run on every update.
#   systemctl list-timers setareganplus-backup.timer     # next run
#   journalctl -u setareganplus-backup.service -n 50     # last runs
#   systemctl start setareganplus-backup.service         # back up now
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
NAME=setareganplus-backup

SERVICE="[Unit]
Description=Setareganplus lean: nightly backup (DB, uploads, .env, old DB)
Wants=network-online.target
After=network-online.target postgresql.service

[Service]
Type=oneshot
ExecStart=/bin/bash $APP_DIR/deploy/lean/backup.sh
Environment=APP_DIR=$APP_DIR
Nice=10
IOSchedulingClass=idle
TimeoutStartSec=2h
"
TIMER="[Unit]
Description=Setareganplus lean: nightly backup at 03:30 Tehran time

[Timer]
OnCalendar=*-*-* 03:30:00 Asia/Tehran
Persistent=true
RandomizedDelaySec=5min
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
if (( changed )); then echo "    backup timer installed/updated ($UNIT_DIR/$NAME.timer)"; else echo "    backup timer already up to date"; fi
$SYSTEMCTL list-timers "$NAME.timer" --no-pager 2>/dev/null | sed -n '2p' | sed 's/^/    next: /' || true
