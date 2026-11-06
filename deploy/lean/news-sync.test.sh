#!/usr/bin/env bash
# Local checks for deploy/lean/news-sync.sh. No network except a refused port, no database.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SYNC="$ROOT/deploy/lean/news-sync.sh"
INSTALL="$ROOT/deploy/lean/install-news-timer.sh"
[[ -x "$SYNC" && -x "$INSTALL" ]] || chmod +x "$SYNC" "$INSTALL"

export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { [[ "$1" == "$2" ]] || fail "expected [$2] got [$1] ($3)"; }

new_repo() {
  local base="$1"
  git init --bare -q "$base/origin.git"
  git init -q "$base/src"
  git -C "$base/src" checkout -q --orphan news-feed
  git -C "$base/src" rm -rfq . >/dev/null 2>&1 || true
  mkdir -p "$base/src/content/news/covers"
  printf '%s\n' '{"slug":"alpha-article"}' > "$base/src/content/news/alpha-article.json"
  printf 'x' > "$base/src/content/news/covers/alpha.webp"
  printf 'feed\n' > "$base/src/README.md"
  git -C "$base/src" add README.md content
  git -C "$base/src" commit -q -m 'news: alpha'
  git -C "$base/src" remote add origin "$base/origin.git"
  git -C "$base/src" push -q -u origin news-feed
  git init -q "$base/app"
  git -C "$base/app" remote add origin "$base/origin.git"
  printf 'marker\n' > "$base/app/marker"
  git -C "$base/app" add marker
  git -C "$base/app" commit -q -m 'app'
  printf 'DATABASE_URL=postgres://example\n' > "$base/app/.env"
  cat > "$base/importer" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >> "${NEWS_SYNC_TEST_RECORD:?}"
if [[ -n "${NEWS_SYNC_TEST_FAIL:-}" && -f "$NEWS_SYNC_TEST_FAIL" ]]; then exit 1; fi
exit 0
EOF
  chmod +x "$base/importer"
}

run_sync() {
  local base="$1"; shift
  APP_DIR="$base/app" NEWS_DIR="$base/news" NEWS_LOG="$base/news.log" \
    NEWS_SYNC_IMPORTER="$base/importer" NEWS_SYNC_TEST_RECORD="$base/record" \
    NEWS_SYNC_RETRIES="${NEWS_SYNC_RETRIES:-2}" NEWS_SYNC_RETRY_DELAY="${NEWS_SYNC_RETRY_DELAY:-0}" \
    NEWS_SYNC_FETCH_TIMEOUT="${NEWS_SYNC_FETCH_TIMEOUT:-20}" \
    bash "$SYNC" "$@"
}

echo "== policy and fast-forward =="
B="$(mktemp -d)"
new_repo "$B"
: > "$B/record"
run_sync "$B" --check
[[ ! -f "$B/news/state/accepted-sha" ]] || fail "check wrote accepted-sha"
grep -q 'check ok' "$B/news.log"
HEAD0="$(git -C "$B/app" rev-parse HEAD)"
run_sync "$B"
ACC="$(tr -d '[:space:]' < "$B/news/state/accepted-sha")"
TIP="$(git -C "$B/src" rev-parse HEAD)"
assert_eq "$ACC" "$TIP" "accepted tip"
grep -q -- '--dir' "$B/record"
[[ -f "$B/news/work/content/news/alpha-article.json" ]] || fail "work tree missing article"
assert_eq "$(git -C "$B/app" rev-parse HEAD)" "$HEAD0" "app HEAD"
[[ ! -f "$B/app/.git/FETCH_HEAD" ]] || fail "sync fetched into the app repo"
assert_eq "$(cat "$B/app/marker")" "marker" "app marker"

# unchanged tip still runs the importer (scheduled articles / IndexNow) and stays accepted
BEFORE="$(wc -l < "$B/record")"
run_sync "$B"
AFTER="$(wc -l < "$B/record")"
[[ "$AFTER" -gt "$BEFORE" ]] || fail "unchanged tip skipped importer"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP" "accepted moved on no-op"

# dry-run does not move state
printf 'second\n' > "$B/src/content/news/second-article.json"
git -C "$B/src" add content/news/second-article.json
git -C "$B/src" commit -q -m 'news: second'
git -C "$B/src" push -q origin news-feed
: > "$B/record"
run_sync "$B" --dry-run
grep -q -- '--dry-run' "$B/record"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP" "dry-run moved accepted"
run_sync "$B"
TIP2="$(git -C "$B/src" rev-parse HEAD)"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP2" "ff accept"

# bad path
printf 'pwn\n' > "$B/src/deploy-me.sh"
mkdir -p "$B/src/deploy"
mv "$B/src/deploy-me.sh" "$B/src/deploy/pwn.sh"
git -C "$B/src" add deploy/pwn.sh
git -C "$B/src" commit -q -m 'bad'
git -C "$B/src" push -q origin news-feed
set +e
run_sync "$B"
RC=$?
set -e
assert_eq "$RC" 3 "bad path exit"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP2" "bad path did not accept"

# executable bit
git -C "$B/src" reset -q --hard "$TIP2"
chmod +x "$B/src/content/news/alpha-article.json"
git -C "$B/src" add -u
git -C "$B/src" commit -q -m 'exec'
git -C "$B/src" push -q --force origin news-feed
set +e
run_sync "$B"
RC=$?
set -e
assert_eq "$RC" 3 "exec bit exit"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP2" "exec bit did not accept"

# symlink
git -C "$B/src" reset -q --hard "$TIP2"
ln -s /etc/passwd "$B/src/content/news/covers/evil.webp"
git -C "$B/src" add content/news/covers/evil.webp
git -C "$B/src" commit -q -m 'link'
git -C "$B/src" push -q --force origin news-feed
set +e
run_sync "$B"
RC=$?
set -e
assert_eq "$RC" 3 "symlink exit"

# non-fast-forward
git -C "$B/src" checkout -q --orphan rewritten
git -C "$B/src" rm -rfq . >/dev/null 2>&1 || true
mkdir -p "$B/src/content/news"
printf '%s\n' '{"slug":"other-article"}' > "$B/src/content/news/other-article.json"
git -C "$B/src" add content
git -C "$B/src" commit -q -m 'rewrite'
git -C "$B/src" push -q --force origin HEAD:news-feed
set +e
run_sync "$B"
RC=$?
set -e
assert_eq "$RC" 3 "force-push exit"
assert_eq "$(tr -d '[:space:]' < "$B/news/state/accepted-sha")" "$TIP2" "force-push did not accept"
assert_eq "$(git -C "$B/app" rev-parse HEAD)" "$HEAD0" "app HEAD after refuses"

echo "== import failure is resumable =="
R="$(mktemp -d)"
new_repo "$R"
: > "$R/record"
printf 'x' > "$R/fail"
NEWS_SYNC_TEST_FAIL="$R/fail" run_sync "$R" && fail "importer failure returned 0" || RC=$?
assert_eq "${RC:-0}" 1 "import fail exit"
[[ ! -f "$R/news/state/accepted-sha" ]] || fail "accepted written after failure"
[[ -f "$R/news/state/pending-sha" ]] || fail "pending missing"
rm -f "$R/fail"
unset NEWS_SYNC_TEST_FAIL
run_sync "$R"
[[ -f "$R/news/state/accepted-sha" ]] || fail "resume did not accept"
[[ ! -f "$R/news/state/pending-sha" ]] || fail "pending left behind"

echo "== lock =="
L="$(mktemp -d)"
new_repo "$L"
: > "$L/record"
run_sync "$L" --check >/dev/null
exec 8>>"$L/news/state/lock"
flock 8
set +e
run_sync "$L"
RC=$?
set -e
flock -u 8
assert_eq "$RC" 0 "lock exit"
grep -q 'another sync is running' "$L/news.log"

echo "== network retry =="
N="$(mktemp -d)"
new_repo "$N"
git -C "$N/app" remote set-url origin 'http://127.0.0.1:1/does-not-exist.git'
: > "$N/record"
set +e
NEWS_SYNC_RETRIES=2 NEWS_SYNC_RETRY_DELAY=0 NEWS_SYNC_FETCH_TIMEOUT=5 run_sync "$N"
RC=$?
set -e
assert_eq "$RC" 1 "network exit"
[[ ! -f "$N/news/state/accepted-sha" ]] || fail "network failure accepted a sha"
grep -q 'attempt 2: fetch failed' "$N/news.log"

echo "== installer writes units without deploying the app =="
I="$(mktemp -d)"
new_repo "$I"
mkdir -p "$I/bin" "$I/units"
MOCK="$I/systemctl"
cat > "$MOCK" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$MOCK"
HEADI="$(git -C "$I/app" rev-parse HEAD)"
APP_DIR="$I/app" NEWS_DIR="$I/news" NEWS_BIN_DIR="$I/bin" UNIT_DIR="$I/units" SYSTEMCTL="$MOCK" \
  bash "$INSTALL" --no-sync-now
grep -q 'NEWS_SYNC_EDITION=3' "$I/bin/news-sync.sh"
grep -q "$I/bin/news-sync.sh" "$I/units/setareganplus-news.service"
grep -q 'news-feed' "$I/units/setareganplus-news.service"
grep -q 'OnCalendar' "$I/units/setareganplus-news.timer"
assert_eq "$(git -C "$I/app" rev-parse HEAD)" "$HEADI" "installer moved app HEAD"
# executable lines must not deploy the app or migrate (comments may name the old command)
if grep -vE '^[[:space:]]*#' "$SYNC" "$INSTALL" | grep -E 'git reset|prisma migrate|npm run build|pm2 reload|nginx -s' >/dev/null; then
  fail "sync tooling contains a deploy command"
fi

echo "ok"
rm -rf "$B" "$R" "$L" "$N" "$I"
