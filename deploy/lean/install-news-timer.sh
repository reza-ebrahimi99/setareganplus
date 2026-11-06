#!/usr/bin/env bash
# One-time (and idempotent) installer for the news-feed sync timer.
# It does not reset /var/www/setareganplus-lean, does not build, does not migrate,
# and does not touch booklet orders. It copies news-sync.sh to a path outside the
# app checkout and enables setareganplus-news.timer.
#
# On the server, once, as root (after this commit is on origin/lean-redesign):
#
#   curl -fsSL --retry 5 --retry-delay 2 \
#     -o /root/install-news-timer.sh \
#     https://raw.githubusercontent.com/reza-ebrahimi99/setareganplus/lean-redesign/deploy/lean/install-news-timer.sh \
#   && bash /root/install-news-timer.sh
#
# If raw GitHub is blocked, fetch the blob without changing the app work tree
# (do not reset the work tree as part of this setup):
#
#   git -C /var/www/setareganplus-lean fetch --depth 1 origin lean-redesign
#   git -C /var/www/setareganplus-lean show FETCH_HEAD:deploy/lean/install-news-timer.sh > /root/install-news-timer.sh
#   bash /root/install-news-timer.sh
#
# The regular app deploy also enables this timer:
#   cd /var/www/setareganplus-lean && git fetch --depth 1 origin lean-redesign && git reset --hard FETCH_HEAD && bash deploy/lean/update.sh
#
# Test without writing articles:
#   bash /var/lib/setareganplus-news/bin/news-sync.sh --check
# Rehearse the importer without inserting rows:
#   bash /var/lib/setareganplus-news/bin/news-sync.sh --dry-run
#
# Flags: --no-sync-now   install/enable only, do not import now
#        --sync-now      import once after enabling (this is the default)
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
NEWS_DIR="${NEWS_DIR:-/var/lib/setareganplus-news}"
BIN_DIR="${NEWS_BIN_DIR:-$NEWS_DIR/bin}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
APP_BRANCH="${APP_BRANCH:-lean-redesign}"
SYNC_NOW=1
for a in "$@"; do
  case "$a" in
    --no-sync-now) SYNC_NOW=0 ;;
    --sync-now) SYNC_NOW=1 ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Unknown option: $a" >&2; exit 2 ;;
  esac
done

if [[ "$UNIT_DIR" == /etc/systemd/system && "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
[[ -d "$APP_DIR/.git" ]] || { echo "App checkout not found at $APP_DIR" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$BIN_DIR" "$NEWS_DIR"
chmod 700 "$NEWS_DIR" "$BIN_DIR"
DEST="$BIN_DIR/news-sync.sh"

install_local() {
  local src="$1"
  grep -q 'NEWS_SYNC_EDITION=3' "$src" || { echo "news-sync.sh is not edition 3 ($src)" >&2; exit 1; }
  head -n 1 "$src" | grep -q '^#!/usr/bin/env bash' || { echo "news-sync.sh has no bash shebang" >&2; exit 1; }
  if [[ -f "$DEST" ]] && cmp -s "$src" "$DEST"; then
    echo "    news-sync.sh already installed at $DEST"
    return 0
  fi
  cp "$src" "$DEST.tmp"
  chmod 755 "$DEST.tmp"
  mv "$DEST.tmp" "$DEST"
  echo "    installed $DEST"
}

if [[ -f "$SCRIPT_DIR/news-sync.sh" ]]; then
  install_local "$SCRIPT_DIR/news-sync.sh"
else
  ORIGIN="$(git -C "$APP_DIR" remote get-url origin)"
  TMP="$(mktemp -d)"
  cleanup() { rm -rf "$TMP"; }
  trap cleanup EXIT
  git init --bare -q "$TMP/m.git"
  git --git-dir="$TMP/m.git" remote add origin "$ORIGIN"
  export GIT_TERMINAL_PROMPT=0
  ok=0
  for i in 1 2 3 4 5; do
    if timeout 90 git --git-dir="$TMP/m.git" fetch --depth 1 origin \
        "+refs/heads/${APP_BRANCH}:refs/heads/${APP_BRANCH}" >/dev/null 2>&1; then
      ok=1; break
    fi
    sleep $((i * 5))
  done
  (( ok )) || { echo "Could not fetch origin/$APP_BRANCH to install news-sync.sh" >&2; exit 1; }
  SHA="$(git --git-dir="$TMP/m.git" rev-parse "refs/heads/${APP_BRANCH}")"
  REMOTE="$(git --git-dir="$TMP/m.git" ls-remote origin "refs/heads/${APP_BRANCH}" | awk 'NR==1{print $1}')"
  [[ "$SHA" == "$REMOTE" && "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "lean-redesign ref did not match ls-remote" >&2; exit 1; }
  git --git-dir="$TMP/m.git" show "${SHA}:deploy/lean/news-sync.sh" > "$TMP/news-sync.sh"
  install_local "$TMP/news-sync.sh"
  echo "    source commit ${SHA:0:12} (origin/$APP_BRANCH only; news-feed was not checked out)"
  trap - EXIT
  cleanup
fi

NODE_BIN="$(dirname "$(command -v node 2>/dev/null || echo /usr/bin/node)")"
# Covers are written under UPLOAD_DIR. Include the usual locations; the sync script
# creates only UPLOAD_DIR/public/news/feed and never edits the app git checkout.
UPLOAD_PATHS="/var/www/setareganplus-lean-data ${APP_DIR}/storage"
NAME=setareganplus-news
SERVICE="[Unit]
Description=Setareganplus lean: import news-feed content (no app deploy, no migrate)
Wants=network-online.target
After=network-online.target postgresql.service

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
ExecStart=/bin/bash $DEST
Environment=APP_DIR=$APP_DIR
Environment=NEWS_DIR=$NEWS_DIR
Environment=NEWS_BRANCH=news-feed
Environment=PATH=$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Nice=10
NoNewPrivileges=true
PrivateTmp=true
TimeoutStartSec=20min
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
put() {
  printf '%s' "$2" > "$1.tmp"
  if [[ -f "$1" ]] && cmp -s "$1.tmp" "$1"; then rm -f "$1.tmp"; return 0; fi
  chmod 644 "$1.tmp" && mv "$1.tmp" "$1"
  changed=1
}
mkdir -p "$UNIT_DIR"
put "$UNIT_DIR/$NAME.service" "$SERVICE"
put "$UNIT_DIR/$NAME.timer" "$TIMER"
if (( changed )); then "$SYSTEMCTL" daemon-reload; fi
if "$SYSTEMCTL" is-enabled --quiet "$NAME.timer" 2>/dev/null && "$SYSTEMCTL" is-active --quiet "$NAME.timer" 2>/dev/null; then
  :
else
  "$SYSTEMCTL" enable --now "$NAME.timer" >/dev/null
fi
if (( changed )); then echo "    news timer installed/updated ($UNIT_DIR/$NAME.timer)"; else echo "    news timer already up to date"; fi
"$SYSTEMCTL" list-timers "$NAME.timer" --no-pager 2>/dev/null | sed -n '2p' | sed 's/^/    next: /' || true
echo "    upload paths left writable by the service user (root): $UPLOAD_PATHS"
echo "    test without publishing: bash $DEST --check"

if (( SYNC_NOW )); then
  echo "    importing news-feed now"
  /bin/bash "$DEST" || { echo "    news sync failed; the timer will retry. log: /var/log/setareganplus-news.log" >&2; exit 1; }
fi
