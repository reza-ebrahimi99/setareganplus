#!/usr/bin/env bash
# NEWS_SYNC_EDITION=3
# Pull create-only news from the trusted `news-feed` branch into the LIVE database.
#
# news-feed is an orphan branch that contains only content/news (no app). The running
# site is the lean-redesign checkout in $APP_DIR. This script never checks that
# branch out over the app, never moves the app checkout, and never migrates,
# rebuilds, reloads the process manager, or edits nginx. Pages are rendered on demand from
# the News table, so a rebuild is not required for a new article to appear.
#
#   bash /var/lib/setareganplus-news/bin/news-sync.sh           # import
#   bash /var/lib/setareganplus-news/bin/news-sync.sh --check   # fetch + policy only; no DB writes
#   bash /var/lib/setareganplus-news/bin/news-sync.sh --dry-run # importer dry-run; no inserts
#
# State: $NEWS_DIR/state/accepted-sha (advanced only after a successful import).
# A failed import leaves that file unchanged and is retried on the next run.
# Log:   /var/log/setareganplus-news.log
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
NEWS_DIR="${NEWS_DIR:-/var/lib/setareganplus-news}"
NEWS_BRANCH="${NEWS_BRANCH:-news-feed}"
LOG="${NEWS_LOG:-/var/log/setareganplus-news.log}"
MIRROR="$NEWS_DIR/mirror.git"
STATE="$NEWS_DIR/state"
RETRIES="${NEWS_SYNC_RETRIES:-5}"
RETRY_DELAY="${NEWS_SYNC_RETRY_DELAY:-5}"
FETCH_TIMEOUT="${NEWS_SYNC_FETCH_TIMEOUT:-90}"
IMPORT_TIMEOUT="${NEWS_SYNC_IMPORT_TIMEOUT:-300}"
MAX_NEW="${NEWS_SYNC_MAX_NEW:-100}"
MAX_COMMITS="${NEWS_SYNC_MAX_COMMITS:-400}"
MODE=run
SHOW=0
STAGING=""
NEW=""
OLD=""
ACCEPTED=""

usage() {
  sed -n '2,18p' "$0"
  exit 0
}
for a in "$@"; do
  case "$a" in
    --check) MODE=check; SHOW=1 ;;
    --dry-run) MODE=dry-run; SHOW=1 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $a" >&2; exit 2 ;;
  esac
done

say() {
  local m="[sync $(date '+%Y-%m-%d %H:%M:%S %Z')] $*"
  mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
  echo "$m" >>"$LOG" 2>/dev/null || true
  if [[ "$SHOW" == 1 || -t 1 ]]; then echo "$m"; fi
}
json_status() {
  local result="$1" detail="$2"
  RESULT="$result" DETAIL="$detail" BRANCH="$NEWS_BRANCH" ACCEPTED="${ACCEPTED:-}" REMOTE="${NEW:-}" \
    python3 - "$STATE/last-run.json" <<'PY' || true
import json, os, sys
path = sys.argv[1]
os.makedirs(os.path.dirname(path), exist_ok=True)
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump({
        "result": os.environ.get("RESULT", ""),
        "detail": os.environ.get("DETAIL", ""),
        "branch": os.environ.get("BRANCH", ""),
        "accepted": os.environ.get("ACCEPTED", ""),
        "remote": os.environ.get("REMOTE", ""),
    }, f, ensure_ascii=False)
    f.write("\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
PY
}
fail() { say "ERROR: $*"; json_status error "$*"; exit 1; }
refuse() { say "REFUSED: $*"; json_status refused "$*"; exit 3; }
cleanup() {
  if [[ -n "${STAGING}" && -d "${STAGING}" ]]; then rm -rf "$STAGING"; fi
  return 0
}
trap cleanup EXIT

if [[ -f "$LOG" ]] && (( $(stat -c %s "$LOG" 2>/dev/null || echo 0) > 2000000 )); then
  tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG" || true
fi

umask 077
mkdir -p "$STATE"
chmod 700 "$NEWS_DIR" "$STATE" 2>/dev/null || true
exec 9>>"$STATE/lock"
if ! flock -n 9; then say "another sync is running; skipped"; exit 0; fi

[[ "$NEWS_DIR" != "$APP_DIR" ]] || fail "NEWS_DIR and APP_DIR are the same"
case "$NEWS_DIR" in
  "$APP_DIR"|"$APP_DIR"/*) fail "NEWS_DIR must not live inside the app checkout" ;;
esac
case "$APP_DIR" in
  "$NEWS_DIR"|"$NEWS_DIR"/*) fail "APP_DIR must not live inside NEWS_DIR" ;;
esac
[[ -d "$APP_DIR/.git" ]] || fail "app checkout not found at $APP_DIR"
if [[ "$NEWS_BRANCH" != "news-feed" && "${NEWS_SYNC_ALLOW_UNTRUSTED_BRANCH:-}" != 1 ]]; then
  refuse "only the news-feed branch is trusted (got $NEWS_BRANCH)"
fi
[[ "$NEWS_BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || fail "bad branch name"

ORIGIN="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || true)"
[[ -n "$ORIGIN" ]] || fail "app has no git origin"
APP_HEAD="$(git -C "$APP_DIR" rev-parse HEAD)"
say "mode=$MODE app=${APP_HEAD:0:12} branch=$NEWS_BRANCH"

if [[ ! -d "$MIRROR" ]]; then git init --bare -q "$MIRROR" || fail "git init failed"; fi
chmod 700 "$MIRROR" || true
if git --git-dir="$MIRROR" remote get-url origin >/dev/null 2>&1; then
  git --git-dir="$MIRROR" remote set-url origin "$ORIGIN"
else
  git --git-dir="$MIRROR" remote add origin "$ORIGIN"
fi
# Drop a wildcard fetch refspec so a later fetch cannot pull other branches.
git --git-dir="$MIRROR" config remote.origin.fetch "+refs/heads/${NEWS_BRANCH}:refs/heads/${NEWS_BRANCH}"

export GIT_TERMINAL_PROMPT=0 GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=30
fetch_matching_tip() {
  local attempt=1 delay="$RETRY_DELAY" local_sha remote_out remote_sha lines
  while (( attempt <= RETRIES )); do
    if timeout "$FETCH_TIMEOUT" git --git-dir="$MIRROR" fetch --prune origin \
        "+refs/heads/${NEWS_BRANCH}:refs/heads/${NEWS_BRANCH}" >>"$LOG" 2>&1; then
      local_sha="$(git --git-dir="$MIRROR" rev-parse "refs/heads/${NEWS_BRANCH}^{commit}" 2>>"$LOG" || true)"
      remote_out="$(timeout "$FETCH_TIMEOUT" git --git-dir="$MIRROR" ls-remote origin "refs/heads/${NEWS_BRANCH}" 2>>"$LOG" || true)"
      lines="$(printf '%s\n' "$remote_out" | grep -c . || true)"
      remote_sha="$(printf '%s\n' "$remote_out" | awk 'NR==1{print $1}')"
      if [[ "$lines" == 1 && "$local_sha" =~ ^[0-9a-f]{40}$ && "$local_sha" == "$remote_sha" ]]; then
        printf '%s\n' "$local_sha"
        return 0
      fi
      say "attempt $attempt: fetched ref does not match origin/refs/heads/${NEWS_BRANCH}"
    else
      say "attempt $attempt: fetch failed"
    fi
    if (( attempt >= RETRIES )); then return 1; fi
    sleep "$delay"
    attempt=$((attempt + 1))
    if (( delay < 60 )); then delay=$((delay * 2)); fi
  done
  return 1
}
NEW="$(fetch_matching_tip)" || fail "could not fetch origin/$NEWS_BRANCH after $RETRIES attempts"
[[ "$NEW" =~ ^[0-9a-f]{40}$ ]] || fail "remote tip is not a commit sha"

if [[ -f "$STATE/accepted-sha" ]]; then
  OLD="$(tr -d '[:space:]' < "$STATE/accepted-sha")"
  [[ "$OLD" =~ ^[0-9a-f]{40}$ ]] || fail "corrupt accepted-sha"
  ACCEPTED="$OLD"
fi

allow_file() {
  local path="$1" hash="$2" base sz
  [[ "$path" != *..* && "$path" != /* && "$path" != *$'\n'* ]] || refuse "unsafe path: $path"
  case "$path" in
    README.md|content/news/README.md)
      sz="$(git --git-dir="$MIRROR" cat-file -s "$hash")"
      if (( sz > 65536 )); then refuse "$path is larger than 64KB"; fi
      ;;
    content/news/*.json)
      base="${path#content/news/}"
      [[ "$base" != */* ]] || refuse "nested article path: $path"
      [[ "$base" =~ ^[a-z0-9]+(-[a-z0-9]+)*\.json$ ]] || refuse "article file name is not a slug: $path"
      sz="$(git --git-dir="$MIRROR" cat-file -s "$hash")"
      if (( sz > 262144 )); then refuse "$path is larger than 256KB"; fi
      ;;
    content/news/covers/*)
      base="${path#content/news/covers/}"
      [[ "$base" != */* ]] || refuse "nested cover path: $path"
      [[ "$base" =~ ^[A-Za-z0-9._-]+$ ]] || refuse "cover file name is not plain: $path"
      case "$base" in
        *.webp|*.jpg|*.jpeg|*.png|*.WEBP|*.JPG|*.JPEG|*.PNG) ;;
        *) refuse "cover type is not webp/jpg/png: $path" ;;
      esac
      sz="$(git --git-dir="$MIRROR" cat-file -s "$hash")"
      if (( sz > 5242880 )); then refuse "$path is larger than 5MB"; fi
      ;;
    *) refuse "path is not news content: $path" ;;
  esac
}

verify_tree() {
  local sha="$1" line meta mode hash path json=0 count=0
  while IFS= read -r -d '' line; do
    [[ -n "$line" ]] || continue
    meta="${line%%$'\t'*}"
    path="${line#*$'\t'}"
    mode="${meta%% *}"
    hash="${meta##* }"
    count=$((count + 1))
    [[ "$mode" == 100644 ]] || refuse "$path is not a regular non-executable file (mode $mode)"
    allow_file "$path" "$hash"
    case "$path" in
      content/news/*.json) json=$((json + 1)) ;;
    esac
  done < <(git --git-dir="$MIRROR" ls-tree -r -z "$sha")
  if (( count == 0 || json == 0 )); then refuse "news-feed tip has no article files"; fi
  if (( json > 2000 )); then refuse "news-feed has $json articles (cap 2000)"; fi
  printf '%s\n' "$json"
}

range_ok() {
  local ncommits=0 new_json=0 merges="" names=""
  if [[ -n "$OLD" && "$OLD" != "$NEW" ]]; then
    git --git-dir="$MIRROR" cat-file -e "${OLD}^{commit}" 2>>"$LOG" \
      || refuse "previous accepted commit $OLD is not in the fetched news-feed history (not a fast-forward)"
    git --git-dir="$MIRROR" merge-base --is-ancestor "$OLD" "$NEW" \
      || refuse "origin/news-feed moved from ${OLD:0:12} to ${NEW:0:12} without fast-forward; left the live site unchanged"
    merges="$(git --git-dir="$MIRROR" rev-list --merges "${OLD}..${NEW}")"
    [[ -z "$merges" ]] || refuse "merge commits are not accepted on news-feed"
    ncommits="$(git --git-dir="$MIRROR" rev-list --count "${OLD}..${NEW}")"
    names="$(git --git-dir="$MIRROR" diff --name-only --diff-filter=A "$OLD" "$NEW" -- content/news || true)"
    new_json="$(printf '%s\n' "$names" | grep -c '^content/news/[^/][^/]*\.json$' || true)"
  elif [[ -z "$OLD" ]]; then
    merges="$(git --git-dir="$MIRROR" rev-list --merges "$NEW")"
    [[ -z "$merges" ]] || refuse "merge commits are not accepted on news-feed"
    ncommits="$(git --git-dir="$MIRROR" rev-list --count "$NEW")"
    names="$(git --git-dir="$MIRROR" ls-tree -r --name-only "$NEW" -- content/news)"
    new_json="$(printf '%s\n' "$names" | grep -c '^content/news/[^/][^/]*\.json$' || true)"
    say "no previous accept; checking the whole news-feed history ($ncommits commits)"
  fi
  if (( ncommits > MAX_COMMITS )); then
    refuse "$ncommits commits in one sync (cap $MAX_COMMITS); set NEWS_SYNC_MAX_COMMITS for a one-off catch-up"
  fi
  if (( new_json > MAX_NEW )); then
    refuse "$new_json new article files in one sync (cap $MAX_NEW); set NEWS_SYNC_MAX_NEW for a one-off catch-up"
  fi
  if [[ -n "$OLD" && "$OLD" == "$NEW" ]]; then
    say "news-feed unchanged ${NEW:0:12}"
  else
    say "news-feed ${OLD:-none} -> ${NEW:0:12} ($ncommits commits, $new_json new article files)"
  fi
}

JSON_COUNT="$(verify_tree "$NEW")"
range_ok

if [[ "$MODE" == check ]]; then
  say "check ok: origin/news-feed ${NEW:0:12} is a fast-forward of content-only files ($JSON_COUNT articles). nothing written"
  json_status check-ok "content-only fast-forward"
  exit 0
fi

STAGING="$(mktemp -d "$NEWS_DIR/staging.XXXXXX")"
# GNU tar strips leading slashes unless --absolute-names is set. Do not pass that flag.
git --git-dir="$MIRROR" archive --format=tar "$NEW" \
  | tar -x --no-same-owner -C "$STAGING"
if find "$STAGING" \( -type l -o -type p -o -type s -o -type b -o -type c \) -print -quit | grep -q .; then
  refuse "extracted tree contains a symlink or special file"
fi
while IFS= read -r -d '' f; do
  rel="${f#"$STAGING"/}"
  [[ "$rel" != "$f" ]] || refuse "file escaped the staging directory"
  # Size/mode already checked in git; re-check the name so tar cannot add extras.
  base="$(basename "$rel")"
  case "$rel" in
    README.md|content/news/README.md|content/news/*.json|content/news/covers/*) ;;
    *) refuse "extracted unexpected path: $rel" ;;
  esac
  [[ "$base" != .* ]] || refuse "extracted dotfile: $rel"
done < <(find "$STAGING" -type f -print0)
[[ -d "$STAGING/content/news" ]] || refuse "extracted tree has no content/news"

run_import() {
  local dry="$1"
  local -a args=(--dir "$STAGING/content/news")
  [[ "$dry" == 1 ]] && args+=(--dry-run)
  if [[ -n "${NEWS_SYNC_IMPORTER:-}" ]]; then
    [[ "$NEWS_SYNC_IMPORTER" == /* && -x "$NEWS_SYNC_IMPORTER" ]] || fail "NEWS_SYNC_IMPORTER must be an absolute executable path"
    timeout "$IMPORT_TIMEOUT" "$NEWS_SYNC_IMPORTER" "${args[@]}"
    return
  fi
  [[ -f "$APP_DIR/.env" ]] || fail "missing $APP_DIR/.env"
  [[ -x "$APP_DIR/node_modules/.bin/tsx" ]] || fail "tsx is not installed in $APP_DIR (npm ci)"
  [[ -f "$APP_DIR/scripts/import-news.ts" ]] || fail "scripts/import-news.ts is missing from the app"
  (
    cd "$APP_DIR"
    umask 022
    timeout "$IMPORT_TIMEOUT" "$APP_DIR/node_modules/.bin/tsx" "$APP_DIR/scripts/import-news.ts" "${args[@]}"
  )
}

if [[ "$MODE" == dry-run ]]; then
  run_import 1 || fail "dry-run importer failed"
  say "dry-run ok: importer did not insert rows and accepted-sha was not moved (${NEW:0:12})"
  json_status dry-run "no rows written"
  exit 0
fi

printf '%s\n' "$NEW" > "$STATE/pending-sha"
chmod 600 "$STATE/pending-sha"
if ! run_import 0; then
  say "import failed; accepted-sha stays at ${OLD:-none}. next run retries this tip"
  json_status import-failed "importer exit non-zero"
  exit 1
fi

# Public cover files must stay readable by the web server. Only the feed directory is touched.
if [[ -z "${NEWS_SYNC_IMPORTER:-}" && -f "$APP_DIR/.env" ]]; then
  UP="$(grep -E '^UPLOAD_DIR=' "$APP_DIR/.env" 2>/dev/null | head -1 | sed -E 's/^UPLOAD_DIR=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')"
  UP="${UP:-./storage/uploads}"
  [[ "$UP" == /* ]] || UP="$APP_DIR/${UP#./}"
  if [[ -d "$UP/public/news/feed" ]]; then
    chmod -R a+rX "$UP/public/news/feed" || true
    if [[ -d "$UP/public" ]]; then chown -R --reference="$UP/public" "$UP/public/news/feed" 2>/dev/null || true; fi
  fi
fi

rm -rf "$NEWS_DIR/work.next"
if ! mv "$STAGING" "$NEWS_DIR/work.next"; then
  fail "could not move the verified tree into place; database import already finished and will not be repeated for existing slugs"
fi
STAGING=""
rm -rf "$NEWS_DIR/work.prev"
[[ -d "$NEWS_DIR/work" ]] && mv "$NEWS_DIR/work" "$NEWS_DIR/work.prev" || true
mv "$NEWS_DIR/work.next" "$NEWS_DIR/work"
rm -rf "$NEWS_DIR/work.prev"

tmp="$(mktemp "$STATE/accepted-sha.XXXXXX")"
printf '%s\n' "$NEW" > "$tmp"
chmod 600 "$tmp"
mv -f "$tmp" "$STATE/accepted-sha"
rm -f "$STATE/pending-sha"
ACCEPTED="$NEW"
say "accepted ${NEW:0:12}; app checkout still ${APP_HEAD:0:12}"
json_status ok "imported"

NOW="$(git -C "$APP_DIR" rev-parse HEAD)"
[[ "$NOW" == "$APP_HEAD" ]] || fail "app HEAD changed during sync ($APP_HEAD -> $NOW); the sync must not touch the app checkout"
exit 0
