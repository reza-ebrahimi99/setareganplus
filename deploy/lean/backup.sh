#!/usr/bin/env bash
# =============================================================================
#  setareganplus.ir: full backup of the lean site
#  پشتیبان کامل سایت: دیتابیس، فایل‌های آپلودی، .env و دیتابیس سایت قدیم
#
#  Runs every night at 03:30 (Asia/Tehran) via systemd: setareganplus-backup.timer
#  Manual:   sudo bash /var/www/setareganplus-lean/deploy/lean/backup.sh
#  Restore:  sudo bash /var/www/setareganplus-lean/deploy/lean/restore.sh <file.tar>
#
#  Output:   /var/backups/setareganplus-lean/daily/sp-backup-YYYYMMDD-HHMMSS.tar  (14 days)
#            /var/backups/setareganplus-lean/weekly/…                              (8 weeks)
#            /var/backups/setareganplus-lean/backup.log, status.json
#  Each .tar holds: lean-db.dump, uploads.tar.gz, lean.env (600), old-db.dump
#  (read-only pg_dump of the old app), counts.tsv (rows per table), MANIFEST.txt, SHA256SUMS
#
#  Flags: --reuse-hours N  reuse the newest backup if younger than N hours (prints its path)
#         --label NAME     tag in the file name (e.g. pre-update)
#         --print-path     print only the backup path on stdout (for scripts)
#  Exit code ≠ 0 on any failure (low disk, dump error…), so systemd marks the unit failed.
#  Secrets / DB URLs are never printed.
# =============================================================================
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
OLD_DIR="${OLD_DIR:-/var/www/setareganplus}"
ROOT="${BACKUP_ROOT:-/var/backups/setareganplus-lean}"
KEEP_DAILY_DAYS="${KEEP_DAILY_DAYS:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
MIN_FREE_MB="${MIN_FREE_MB:-1024}"   # always keep at least this much free after the backup
REUSE_HOURS=0; LABEL=""; PRINT_PATH=0
while (( $# )); do case "$1" in
  --reuse-hours) REUSE_HOURS="${2:?}"; shift ;;
  --label) LABEL="$(tr -cd 'a-z0-9-' <<<"${2:?}")"; shift ;;
  --print-path) PRINT_PATH=1 ;;
  -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
  *) echo "Unknown option: $1" >&2; exit 2 ;;
esac; shift; done

DAILY="$ROOT/daily"; WEEKLY="$ROOT/weekly"; LOG="$ROOT/backup.log"; STATUS="$ROOT/status.json"
mkdir -p "$DAILY" "$WEEKLY"; chmod 700 "$ROOT" "$DAILY" "$WEEKLY"
STAMP="$(TZ=Asia/Tehran date +%Y%m%d-%H%M%S)"
NAME="sp-backup-$STAMP${LABEL:+-$LABEL}"
WORK="$ROOT/.work-$STAMP"

# log helpers: everything goes to backup.log; stdout only when not --print-path
log()  { local m="[$(TZ=Asia/Tehran date '+%F %T')] $*"; echo "$m" >> "$LOG"; if (( ! PRINT_PATH )); then echo "$m"; fi; }
loud() { local m="[$(TZ=Asia/Tehran date '+%F %T')] !!! $*"; echo "$m" >> "$LOG"; echo "$m" >&2; logger -t setareganplus-backup -p user.err "$*" 2>/dev/null || true; }
status() { # ok|failed, message, file
  python3 - "$STATUS" "$1" "$2" "${3:-}" <<'PY'
import json, os, sys, time
p, st, msg, f = sys.argv[1:5]
d = {"status": st, "message": msg, "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "file": f or None}
if f and os.path.exists(f): d["bytes"] = os.path.getsize(f)
old = {}
try: old = json.load(open(p))
except Exception: pass
if st == "ok": d["lastOk"] = d["at"]; d["lastOkFile"] = d["file"]; d["lastOkBytes"] = d.get("bytes")
else:
    for k in ("lastOk", "lastOkFile", "lastOkBytes"):
        if k in old: d[k] = old[k]
open(p + ".tmp", "w").write(json.dumps(d, ensure_ascii=False)); os.chmod(p + ".tmp", 0o644); os.replace(p + ".tmp", p)
PY
}
fail() { loud "FAILED: $*"; status failed "$*"; rm -rf "$WORK" "$DAILY/$NAME.tar.part"; exit 1; }
trap 'fail "unexpected error at line $LINENO"' ERR

exec 9>"$ROOT/.backup.lock"
flock -w 1800 9 || fail "another backup is still running"

# ---- reuse a recent backup (used by update.sh before migrating) ----
if (( REUSE_HOURS > 0 )); then
  RECENT="$(find "$DAILY" -maxdepth 1 -name 'sp-backup-*.tar' -mmin "-$(( REUSE_HOURS * 60 ))" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  if [[ -n "$RECENT" ]] && tar -tf "$RECENT" >/dev/null 2>&1; then
    log "reusing recent backup $(basename "$RECENT")"
    if (( PRINT_PATH )); then echo "$RECENT"; fi
    exit 0
  fi
fi

[[ -f "$APP_DIR/.env" ]] || fail "$APP_DIR/.env not found"
envval() { grep -E "^$1=" "$2" 2>/dev/null | head -1 | sed -E "s/^$1=//; s/^\"//; s/\"$//; s/^'//; s/'$//" || true; }
LEAN_URL="$(envval DATABASE_URL "$APP_DIR/.env")"; LEAN_URL="${LEAN_URL%%\?*}"
[[ -n "$LEAN_URL" ]] || fail "DATABASE_URL missing in lean .env"
UPLOADS="$(envval UPLOAD_DIR "$APP_DIR/.env")"; UPLOADS="${UPLOADS:-./storage/uploads}"
[[ "$UPLOADS" = /* ]] || UPLOADS="$APP_DIR/${UPLOADS#./}"
OLD_URL=""; [[ -f "$OLD_DIR/.env" ]] && { OLD_URL="$(envval DATABASE_URL "$OLD_DIR/.env")"; OLD_URL="${OLD_URL%%\?*}"; }

# ---- disk space: estimate, refuse loudly if it would leave < MIN_FREE_MB ----
db_mb() { psql "$1" -Atqc "select (pg_database_size(current_database())/1048576)::int" 2>/dev/null || echo 0; }
NEED_MB=$(( $(db_mb "$LEAN_URL") / 2 + 50 ))
[[ -d "$UPLOADS" ]] && NEED_MB=$(( NEED_MB + $(du -sm "$UPLOADS" 2>/dev/null | cut -f1) ))
[[ -n "$OLD_URL" ]] && NEED_MB=$(( NEED_MB + $(db_mb "$OLD_URL") / 2 ))
FREE_MB=$(df -Pm "$ROOT" | awk 'NR==2{print $4}')
if (( FREE_MB - NEED_MB < MIN_FREE_MB )); then
  fail "LOW DISK: ${FREE_MB} MB free on $(df -P "$ROOT" | awk 'NR==2{print $6}'), backup needs ~${NEED_MB} MB + ${MIN_FREE_MB} MB reserve. Free some space (old update-* dirs in $ROOT, journalctl --vacuum-size=200M)."
fi
log "starting $NAME (free ${FREE_MB} MB, need ~${NEED_MB} MB)"

mkdir -p "$WORK"
# 1) lean DB
pg_dump "$LEAN_URL" -Fc -Z 6 -f "$WORK/lean-db.dump" 2>>"$LOG" || fail "pg_dump of the lean DB failed"
pg_restore -l "$WORK/lean-db.dump" >/dev/null 2>>"$LOG" || fail "lean DB dump is unreadable"
# row counts (for restore verification)
psql "$LEAN_URL" -Atq -F $'\t' -c "select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1" > "$WORK/counts.tsv" 2>>"$LOG" || fail "row count query failed"
# 2) uploads
if [[ -d "$UPLOADS" ]]; then
  tar -C "$(dirname "$UPLOADS")" --exclude=".resized" -czf "$WORK/uploads.tar.gz" "$(basename "$UPLOADS")" 2>>"$LOG" || fail "tar of $UPLOADS failed"
else
  log "warning: upload dir $UPLOADS not found; skipped"
fi
# 3) lean .env (secret: 600, never printed)
install -m 600 "$APP_DIR/.env" "$WORK/lean.env"
# 4) old app DB (read-only dump)
if [[ -n "$OLD_URL" ]]; then
  if pg_dump "$OLD_URL" -Fc -Z 6 -f "$WORK/old-db.dump" 2>>"$LOG"; then :; else loud "warning: pg_dump of the OLD app DB failed (lean backup continues)"; rm -f "$WORK/old-db.dump"; fi
fi
# manifest + checksums
{
  echo "backup:   $NAME"
  echo "created:  $(TZ=Asia/Tehran date '+%F %T') Asia/Tehran"
  echo "host:     $(hostname)"
  echo "commit:   $(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo '?')"
  echo "uploads:  $UPLOADS"
  echo "files:"
  (cd "$WORK" && for f in *; do printf '  %-16s %s\n' "$f" "$(du -h "$f" | cut -f1)"; done)
  echo "rows (lean DB): $(awk -F'\t' '{s+=$2} END{print s}' "$WORK/counts.tsv") in $(wc -l < "$WORK/counts.tsv") tables"
} > "$WORK/MANIFEST.txt"
(cd "$WORK" && sha256sum -- * > SHA256SUMS)
chmod 600 "$WORK"/*

tar -C "$WORK" -cf "$DAILY/$NAME.tar.part" . 2>>"$LOG" || fail "writing the archive failed (disk full?)"
tar -tf "$DAILY/$NAME.tar.part" >/dev/null || fail "archive verification failed"
mv "$DAILY/$NAME.tar.part" "$DAILY/$NAME.tar"; chmod 600 "$DAILY/$NAME.tar"
rm -rf "$WORK"
FILE="$DAILY/$NAME.tar"

# ---- weekly copy: if the newest weekly is older than ~6.5 days (hard link: no extra space) ----
if [[ -z "$(find "$WEEKLY" -maxdepth 1 -name 'sp-backup-*.tar' -mmin -9360 2>/dev/null | head -1)" ]]; then
  ln "$FILE" "$WEEKLY/$NAME.tar" 2>/dev/null || cp -p "$FILE" "$WEEKLY/$NAME.tar"
  log "weekly copy kept: weekly/$NAME.tar"
fi
# ---- retention: daily by age (always keep the newest 3), weekly by count ----
find "$DAILY" -maxdepth 1 -name 'sp-backup-*.tar' -printf '%T@ %p\n' | sort -rn | tail -n +4 | cut -d' ' -f2- |
  while read -r f; do if [[ -n "$(find "$f" -mtime +"$((KEEP_DAILY_DAYS - 1))" 2>/dev/null)" ]]; then rm -f "$f"; log "pruned daily/$(basename "$f")"; fi; done
find "$WEEKLY" -maxdepth 1 -name 'sp-backup-*.tar' -printf '%T@ %p\n' | sort -rn | tail -n +"$((KEEP_WEEKLY + 1))" | cut -d' ' -f2- |
  while read -r f; do rm -f "$f"; log "pruned weekly/$(basename "$f")"; done
find "$ROOT" -maxdepth 1 -name '.work-*' -mmin +720 -exec rm -rf {} + 2>/dev/null || true

SIZE="$(du -h "$FILE" | cut -f1)"
FREE_AFTER=$(df -Pm "$ROOT" | awk 'NR==2{print $4}')
status ok "backup ok ($SIZE)" "$FILE"
log "done: $FILE ($SIZE), free ${FREE_AFTER} MB"
if (( FREE_AFTER < MIN_FREE_MB * 2 )); then loud "warning: disk is getting full (${FREE_AFTER} MB free)"; fi
if (( PRINT_PATH )); then echo "$FILE"; fi
exit 0
