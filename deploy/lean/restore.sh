#!/usr/bin/env bash
# =============================================================================
#  setareganplus.ir: restore a backup made by backup.sh
#  بازگردانی پشتیبان (دیتابیس + فایل‌های آپلودی) با تأیید مرحله‌به‌مرحله
#
#  sudo bash /var/www/setareganplus-lean/deploy/lean/restore.sh /var/backups/setareganplus-lean/daily/sp-backup-….tar
#
#  Steps (each one asks first):
#    1. checks the archive (SHA256SUMS) and shows what is inside
#    2. takes a fresh safety backup of the CURRENT state (label pre-restore)
#    3. stops the site (pm2), restores the lean DB, runs prisma migrate deploy,
#       compares row counts with the backup
#    4. restores uploaded files (current folder is kept as uploads.before-restore-<time>)
#    5. starts the site again
#  The lean .env and the old app DB are NOT restored automatically (see --env, and
#  DEPLOY.md §9 for the old DB).
#
#  Flags: --list                  show the archive contents and exit
#         --yes                   no questions (for scripts)
#         --db-only | --uploads-only
#         --env                   also put back the lean .env from the backup
#         --no-safety-backup      skip step 2
#         --target-db NAME        restore the DB into another (scratch) database on the
#                                 same server instead of the live one; site is not stopped
#                                 and uploads are not touched (dry run / inspection)
# =============================================================================
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/var/www/setareganplus-lean}"
PM2_NAME="${PM2_NAME:-setareganplus-lean}"
FILE=""; LIST=0; YES=0; DO_DB=1; DO_UP=1; DO_ENV=0; SAFETY=1; TARGET_DB=""
while (( $# )); do case "$1" in
  --list) LIST=1 ;; --yes|-y) YES=1 ;;
  --db-only) DO_UP=0 ;; --uploads-only) DO_DB=0 ;;
  --env) DO_ENV=1 ;; --no-safety-backup) SAFETY=0 ;;
  --target-db) TARGET_DB="${2:?}"; shift ;;
  -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
  -*) echo "Unknown option: $1" >&2; exit 2 ;;
  *) FILE="$1" ;;
esac; shift; done

if [[ -t 1 ]]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B= G= Y= R= N=; fi
ok()   { echo "${G}  ✔ $*${N}"; }
warn() { echo "${Y}  ⚠ $*${N}"; }
die()  { echo "${R}  ✘ $*${N}" >&2; exit 1; }
ask()  { # ask "سؤال" "question"  -> requires typing yes / بله
  (( YES )) && return 0
  local a; echo; read -r -p "${B}$1${N}  ($2) [yes/no]: " a
  [[ "$a" == yes || "$a" == y || "$a" == بله ]]
}

[[ -n "$FILE" ]] || { sed -n '6,8p' "$0"; echo; echo "Backups:"; ls -1t /var/backups/setareganplus-lean/{daily,weekly}/*.tar 2>/dev/null | head -20; exit 2; }
[[ -f "$FILE" ]] || die "فایل پیدا نشد | not found: $FILE"
if (( LIST )); then tar -xOf "$FILE" ./MANIFEST.txt 2>/dev/null || tar -tvf "$FILE"; exit 0; fi
[[ $EUID -eq 0 || -n "$TARGET_DB" ]] || die "باید با root اجرا شود | run as root"

TMP="$(mktemp -d /tmp/sp-restore.XXXXXX)"; trap 'rm -rf "$TMP"' EXIT
echo "${B}==> ۱. بررسی فایل پشتیبان | checking the archive${N}"
tar -C "$TMP" -xf "$FILE" || die "فایل خراب است | cannot extract"
(cd "$TMP" && sha256sum -c --quiet SHA256SUMS) || die "checksum mismatch: archive is damaged"
cat "$TMP/MANIFEST.txt"
ok "فایل سالم است | archive verified"

envval() { grep -E "^$1=" "$2" 2>/dev/null | head -1 | sed -E "s/^$1=//; s/^\"//; s/\"$//; s/^'//; s/'$//" || true; }
LEAN_URL="$(envval DATABASE_URL "$APP_DIR/.env")"; LEAN_URL="${LEAN_URL%%\?*}"
[[ -n "$LEAN_URL" ]] || die "DATABASE_URL missing in $APP_DIR/.env"
if [[ -n "$TARGET_DB" ]]; then
  [[ "$TARGET_DB" =~ ^[a-z0-9_]+$ ]] || die "--target-db: use a plain database name"
  LIVE_DB="${LEAN_URL##*/}"
  [[ "$TARGET_DB" != "$LIVE_DB" ]] || die "--target-db must not be the live database"
  DB_URL="${LEAN_URL%/*}/$TARGET_DB"; DO_UP=0; DO_ENV=0; SAFETY=0
  echo "    target: scratch database «$TARGET_DB» (live site untouched)"
else
  DB_URL="$LEAN_URL"
fi

PM2=()
if command -v pm2 >/dev/null; then PM2=(pm2); elif [[ -x /var/www/setareganplus/node_modules/.bin/pm2 ]]; then PM2=(/var/www/setareganplus/node_modules/.bin/pm2); fi
STOPPED=0
start_site() { if (( STOPPED )) && (( ${#PM2[@]} )); then "${PM2[@]}" start "$PM2_NAME" >/dev/null && ok "سایت دوباره روشن شد | site started"; STOPPED=0; fi; }
trap 'start_site; rm -rf "$TMP"' EXIT

# ---- 2. safety backup of the current state ----
if (( SAFETY )); then
  echo; echo "${B}==> ۲. پشتیبان از وضعیت فعلی | safety backup of the current state${N}"
  if ask "قبل از بازگردانی، از وضعیت فعلی پشتیبان گرفته شود؟ (توصیه می‌شود)" "take a safety backup first? (recommended)"; then
    SB="$(bash "$APP_DIR/deploy/lean/backup.sh" --label pre-restore --print-path)" || die "safety backup failed; nothing was changed"
    ok "پشتیبان فعلی: $SB"
  fi
fi

# ---- 3. database ----
if (( DO_DB )); then
  [[ -f "$TMP/lean-db.dump" ]] || die "lean-db.dump not in archive"
  echo; echo "${B}==> ۳. بازگردانی دیتابیس | restoring the database${N}"
  if [[ -n "$TARGET_DB" ]]; then
    ask "دیتابیس آزمایشی «$TARGET_DB» ساخته/بازنویسی شود؟" "(re)create scratch DB $TARGET_DB?" || die "cancelled"
    psql "${LEAN_URL%/*}/postgres" -qc "drop database if exists \"$TARGET_DB\"" >/dev/null 2>&1 || psql "$LEAN_URL" -qc "drop database if exists \"$TARGET_DB\"" >/dev/null
    psql "$LEAN_URL" -qc "create database \"$TARGET_DB\"" >/dev/null || die "cannot create database $TARGET_DB"
  else
    echo "${R}${B}    همهٔ داده‌های فعلی سایت (سفارش‌ها، فرم‌ها، اخبار…) با نسخهٔ پشتیبان جایگزین می‌شود.${N}"
    echo "    All CURRENT site data is replaced by the backup. Orders made after the backup time will be lost."
    if (( ! YES )); then
      read -r -p "${B}برای ادامه کلمهٔ RESTORE را تایپ کنید | type RESTORE to continue: ${N}" a
      [[ "$a" == RESTORE ]] || die "لغو شد | cancelled (nothing changed)"
    fi
    if (( ${#PM2[@]} )) && "${PM2[@]}" describe "$PM2_NAME" >/dev/null 2>&1; then
      "${PM2[@]}" stop "$PM2_NAME" >/dev/null && STOPPED=1 && ok "سایت موقتاً خاموش شد | site stopped"
    fi
  fi
  pg_restore --clean --if-exists --no-owner --no-acl --single-transaction -d "$DB_URL" "$TMP/lean-db.dump" \
    || die "pg_restore failed (the transaction was rolled back; the database is unchanged)"
  ok "دیتابیس بازگردانی شد | database restored"
  if [[ -z "$TARGET_DB" && -f "$APP_DIR/prisma/schema.prisma" ]]; then
    (cd "$APP_DIR" && npx prisma migrate deploy >/dev/null) && ok "ساختار دیتابیس با کد فعلی هماهنگ شد | migrations applied" || warn "prisma migrate deploy failed: run it manually in $APP_DIR"
  fi
  # row counts vs. backup
  echo "    مقایسهٔ تعداد ردیف‌ها | row counts (backup → restored):"
  BAD=0
  while IFS=$'\t' read -r t n; do
    got="$(psql "$DB_URL" -Atqc "select count(*) from public.\"$t\"" 2>/dev/null || echo '?')"
    if [[ "$got" == "$n" ]]; then printf '      %-22s %8s  ✔\n' "$t" "$n"; else printf '      %-22s %8s → %s  ✘\n' "$t" "$n" "$got"; BAD=1; fi
  done < "$TMP/counts.tsv"
  (( BAD )) && warn "بعضی جدول‌ها تعداد متفاوت دارند | some tables differ" || ok "همهٔ جدول‌ها برابرند | all row counts match"
fi

# ---- 4. uploads ----
if (( DO_UP )) && [[ -f "$TMP/uploads.tar.gz" ]]; then
  UPLOADS="$(envval UPLOAD_DIR "$APP_DIR/.env")"; UPLOADS="${UPLOADS:-./storage/uploads}"
  [[ "$UPLOADS" = /* ]] || UPLOADS="$APP_DIR/${UPLOADS#./}"
  echo; echo "${B}==> ۴. بازگردانی فایل‌های آپلودی | restoring uploaded files → $UPLOADS${N}"
  if ask "فایل‌های آپلودی بازگردانی شود؟ (پوشهٔ فعلی نگه داشته می‌شود)" "restore uploads? (current folder is kept aside)"; then
    PARENT="$(dirname "$UPLOADS")"; mkdir -p "$PARENT"
    STAMP="$(date +%Y%m%d-%H%M%S)"
    [[ -d "$UPLOADS" ]] && mv "$UPLOADS" "$UPLOADS.before-restore-$STAMP" && echo "    current files moved to $UPLOADS.before-restore-$STAMP"
    mkdir -p "$TMP/up" && tar -C "$TMP/up" -xzf "$TMP/uploads.tar.gz"
    SRC="$(find "$TMP/up" -mindepth 1 -maxdepth 1 -type d | head -1)"
    [[ -n "$SRC" ]] || die "uploads archive is empty"
    mv "$SRC" "$UPLOADS"
    OWNER="$(stat -c %U:%G "$PARENT")"; chown -R "$OWNER" "$UPLOADS" 2>/dev/null || true
    chmod 755 "$UPLOADS"
    ok "فایل‌ها بازگردانی شد ($(find "$UPLOADS" -type f | wc -l) files)"
  fi
fi

# ---- .env (optional) ----
if (( DO_ENV )) && [[ -f "$TMP/lean.env" ]]; then
  if ask "فایل .env از نسخهٔ پشتیبان جایگزین شود؟" "replace $APP_DIR/.env with the backup copy?"; then
    cp -p "$APP_DIR/.env" "$APP_DIR/.env.before-restore-$(date +%Y%m%d-%H%M%S)"
    install -m 600 "$TMP/lean.env" "$APP_DIR/.env"; ok ".env بازگردانی شد (مقادیر نمایش داده نمی‌شوند)"
  fi
fi

start_site
if [[ -z "$TARGET_DB" ]] && (( ${#PM2[@]} )); then "${PM2[@]}" restart "$PM2_NAME" >/dev/null 2>&1 || true; fi
echo; echo "${B}${G}════ پایان بازگردانی | restore finished ════${N}"
[[ -f "$TMP/old-db.dump" ]] && echo "  دیتابیس سایت قدیم در این فایل هست ولی خودکار بازگردانی نمی‌شود (DEPLOY.md §9)."
exit 0
