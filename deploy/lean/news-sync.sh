#!/usr/bin/env bash
# Pull new news articles from the `news-feed` branch and import them (create-only).
# Run by setareganplus-news.timer (every 3 h); safe to run by hand:
#   bash /var/www/setareganplus-lean/deploy/lean/news-sync.sh ; tail -n 30 /var/log/setareganplus-news.log
#
# - The branch is shallow-fetched into its own checkout ($NEWS_DIR), never into the app dir.
# - If the branch does not exist yet, or GitHub is unreachable, it logs one line and exits 0.
# - scripts/import-news.ts only ADDS articles whose slug is new; admin edits/deletions are kept.
set -uo pipefail
APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
NEWS_DIR="${NEWS_DIR:-/var/lib/setareganplus-news}"
NEWS_BRANCH="${NEWS_BRANCH:-news-feed}"
LOG="${NEWS_LOG:-/var/log/setareganplus-news.log}"
export PATH="${PATH:-/usr/bin:/bin}:/usr/local/bin:/usr/bin:/bin"

# keep the log small (last ~2000 lines)
if [[ -f "$LOG" ]] && (( $(stat -c %s "$LOG" 2>/dev/null || echo 0) > 2000000 )); then
  tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
fi
exec >>"$LOG" 2>&1
say() { echo "[sync $(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }

{ exec 9>/run/setareganplus-news.lock; } 2>/dev/null || exec 9>/tmp/setareganplus-news.lock
flock -n 9 || { say "another sync is running; skipped"; exit 0; }

[[ -d "$APP_DIR/.git" && -f "$APP_DIR/.env" ]] || { say "app not installed at $APP_DIR; skipped"; exit 0; }
ORIGIN="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || true)"
[[ -n "$ORIGIN" ]] || { say "app has no git origin; skipped"; exit 0; }

mkdir -p "$NEWS_DIR" && chmod 700 "$NEWS_DIR"
if [[ ! -d "$NEWS_DIR/.git" ]]; then git init -q "$NEWS_DIR" || { say "git init failed; skipped"; exit 0; }; fi
git -C "$NEWS_DIR" remote get-url origin >/dev/null 2>&1 && git -C "$NEWS_DIR" remote set-url origin "$ORIGIN" || git -C "$NEWS_DIR" remote add origin "$ORIGIN"

export GIT_TERMINAL_PROMPT=0 GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=60
if ! timeout 180 git -C "$NEWS_DIR" fetch -q --depth 1 origin "$NEWS_BRANCH" 2>/dev/null; then
  say "branch $NEWS_BRANCH not available (missing or network); nothing to do"; exit 0
fi
NEW="$(git -C "$NEWS_DIR" rev-parse FETCH_HEAD)"
OLD="$(git -C "$NEWS_DIR" rev-parse -q --verify HEAD 2>/dev/null || true)"
git -C "$NEWS_DIR" -c advice.detachedHead=false checkout -q -f "$NEW" || { say "checkout failed; skipped"; exit 0; }
git -C "$NEWS_DIR" clean -qfdx >/dev/null 2>&1 || true
[[ -d "$NEWS_DIR/content/news" ]] || { say "no content/news in $NEWS_BRANCH ($NEW); nothing to do"; exit 0; }

# The importer is create-only, so running it even when nothing changed is harmless; it also
# announces scheduled articles to IndexNow once their publish time has passed.
[[ "$OLD" == "$NEW" ]] || say "news-feed $OLD -> $NEW"
cd "$APP_DIR" || exit 0
if ! timeout 300 npx --no-install tsx scripts/import-news.ts --dir "$NEWS_DIR/content/news"; then
  say "import failed (see above); will retry next run"
fi
# media written by root must stay readable/manageable by the app user
UP="$(grep -E '^UPLOAD_DIR=' .env 2>/dev/null | head -1 | sed -E 's/^UPLOAD_DIR=//; s/^"//; s/"$//')"
UP="${UP:-./storage/uploads}"; [[ "$UP" = /* ]] || UP="$APP_DIR/${UP#./}"
if [[ -d "$UP/public/news/feed" ]]; then chown -R --reference="$UP/public" "$UP/public/news/feed" 2>/dev/null || true; fi
exit 0
