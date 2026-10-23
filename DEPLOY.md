# Deploying setareganplus.ir (lean)

Stack: Next.js 16 (App Router), Prisma 7 with PostgreSQL, sharp for images, Node 20+.
One Node process behind nginx, managed by PM2. All pages are rendered on demand, so the build does **not** need the database.

> Nothing here has been run against the real server. These are the steps for whoever deploys.

## 0. One-command install on the existing server (recommended)

Installs the lean site **next to** the current one, then switches nginx for `setareganplus.ir` only.
Run as root **in an interactive terminal** (it asks for the admin username and password):

```bash
curl -fsSL --retry 5 https://raw.githubusercontent.com/reza-ebrahimi99/setareganplus/lean-redesign/deploy/lean/install.sh -o /root/lean-install.sh && bash /root/lean-install.sh
```

What it does (`deploy/lean/install.sh`, safe to re-run):
1. Backs up `/var/www/setareganplus` (tar without node_modules/.next) and `pg_dump`s its DB (from its `.env`) into `/var/backups/setareganplus-lean/<stamp>/`.
2. Clones or pulls branch `lean-redesign` into `/var/www/setareganplus-lean`, retrying for slow links.
3. Creates a NEW database `setareganplus_lean` and user `setaregan_lean` with a generated password. The old DB is not touched.
4. Writes `.env` (chmod 600): generated `SESSION_SECRET`, the admin hash from `npm run admin:hash`, and `UPLOAD_DIR=/var/www/setareganplus-lean-data/uploads`.
5. Adds 2 GB swap if RAM is low. Then `npm ci`, a build with a capped `NODE_OPTIONS=--max-old-space-size`, `prisma migrate deploy`, and the seed (first install only).
6. Starts PM2 `setareganplus-lean` on `127.0.0.1:3100` and health-checks it. Nginx is untouched if this fails.
7. Backs up `/etc/nginx` and switches **only** the `setareganplus.ir` / `www` server blocks from the old port (auto-detected, default 3000) to 3100. Then `nginx -t`, reload, and a live check, with automatic rollback if that check fails. Other vhosts (shop., academy.) keep using the old app.
8. Leaves the old PM2 process `setareganplus` running. `--stop-old` stops it, but refuses while other vhosts still use it.

Flags: `--skip-nginx` (install and preview on :3100 only), `--stop-old`, `--reset-admin`, `--old-port N`, `--tarball FILE`.

**Rollback:** `bash /var/www/setareganplus-lean/deploy/lean/rollback.sh` restores the exact pre-switch nginx files, reloads nginx, and makes sure the old app is online. Add `--stop-lean` to also stop the new app.

**If GitHub is unreachable from the server:** on a machine that has the repo, run
`git archive --format=tar.gz -o lean.tar.gz lean-redesign`, then `scp lean.tar.gz install.sh root@SERVER:/root/`, then
`bash /root/install.sh --tarball /root/lean.tar.gz`. If npm is slow, `export npm_config_registry=<mirror>` before running.

The manual steps below are the same thing, done by hand.

## 1. Prerequisites (server)
- Node 20 LTS or newer (`node -v`), npm, PM2 (`npm i -g pm2`), nginx, PostgreSQL 14+.
- Create the DB and user:
  ```sql
  CREATE USER setaregan WITH PASSWORD '…';
  CREATE DATABASE setareganplus OWNER setaregan;
  ```

## 2. Layout
```
/var/www/setareganplus/
  app/              # this repo (release)
  shared/.env       # secrets (chmod 600), symlinked into app/.env
  shared/uploads/   # UPLOAD_DIR: survives redeploys. Back it up.
```
`ln -s /var/www/setareganplus/shared/.env /var/www/setareganplus/app/.env`

## 3. Environment (`shared/.env`)
See `.env.example`. Required:
| var | notes |
|---|---|
| `DATABASE_URL` | `postgresql://setaregan:…@127.0.0.1:5432/setareganplus?schema=public` |
| `ADMIN_USERNAME` | single admin login |
| `ADMIN_PASSWORD_HASH` | output of `npm run admin:hash` (prompts for the password; format `scrypt:…:…`) |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `UPLOAD_DIR` | `/var/www/setareganplus/shared/uploads` |

Changing `SESSION_SECRET` logs the admin out. To change the admin password, regenerate the hash and `pm2 reload setareganplus --update-env`.

## 4. Install, migrate, build
```bash
cd /var/www/setareganplus/app
npm ci                          # includes dev deps (prisma CLI, tsx) for build/seed
npx prisma migrate deploy       # applies prisma/migrations
npm run db:seed                 # FIRST deploy only: loads all real content + images (see note)
```
**Low-memory build** (small VPS). Cap the heap and add swap if RAM < 2 GB:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile   # once
NODE_OPTIONS=--max-old-space-size=1536 NEXT_TELEMETRY_DISABLED=1 npm run build
```
To keep the live site up while building, set `NEXT_BUILD_DIST_DIR=.next-build` for the build, then swap the folders:
```bash
NEXT_BUILD_DIST_DIR=.next-build NODE_OPTIONS=--max-old-space-size=1536 npm run build \
  && rm -rf .next.old && { [ -d .next ] && mv .next .next.old; true; } && mv .next-build .next \
  && pm2 reload setareganplus
```
(The env var must be unset at runtime, so `next start` reads `.next`.)
Alternatively, build on another machine or in CI and rsync `.next/`, `generated/`, `node_modules/`, `package.json`, `public/` and `prisma/`.

**Seed note:** `db:seed` **replaces** team/achievements/gallery/FAQ/centers and upserts settings. It keeps forms and submissions (it only creates `pre-registration` if missing). Do not re-run it after editing content in the admin unless you want to reset that content.
It writes processed images into `$UPLOAD_DIR/public/seed/`.

## 5. PM2
```bash
pm2 start npm --name setareganplus -- start -- -p 3000
pm2 save && pm2 startup         # follow the printed command
```
Or use an `ecosystem.config.js` with `max_memory_restart: '600M'`. One instance is enough: the login and form rate limiters are in memory per process.

## 6. nginx
```nginx
server {
  listen 80;
  server_name setareganplus.ir www.setareganplus.ir;
  return 301 https://setareganplus.ir$request_uri;
}
server {
  listen 443 ssl http2;
  server_name setareganplus.ir;
  # ssl_certificate … (certbot --nginx)

  client_max_body_size 60m;          # gallery multi-upload + form files (5 MB each)

  # Public uploaded images: serve directly (optional; Next also serves /media)
  location /media/ {
    alias /var/www/setareganplus/shared/uploads/public/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }
  # Never expose private form uploads
  location ^~ /private/ { return 404; }

  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```
Private form files (`$UPLOAD_DIR/private/…`) are only served through `/admin/files/…`, which needs an admin session.
Old URLs (/discover, /portal, /shop, the school and language pages, etc.) are 308-redirected in `next.config.ts`; nginx needs no rules for them.

## 7. Optional: importing data from the old site's DB
The schemas differ, so there is no automatic import. Recommended:
1. **Team / achievements / gallery / FAQ:** the seed already contains every public item from the live site (Oct 2026). Usually nothing to import. Make edits in `/admin`.
2. **Old pre-registration / form submissions** (if you want history): export from the old DB to CSV, then insert into `"Submission"` with `formId` = the id of the `pre-registration` form. Example:
   ```sql
   -- new form id
   SELECT id FROM "Form" WHERE slug='pre-registration';
   -- for each old row (psql \copy into a temp table first):
   INSERT INTO "Submission"(id, "formId", data, labels, status, "createdAt")
   SELECT gen_random_uuid()::text, '<FORM_ID>',
          jsonb_build_object('full_name', name, 'phone', phone, 'section', section),
          '{"full_name":"نام و نام خانوادگی","phone":"شماره تماس","section":"بخش"}'::jsonb,
          'ARCHIVED', created_at
   FROM old_preregistrations;
   ```
   Mark imported rows `ARCHIVED` (or `CONTACTED`) so they don't flood the "new" badge.
3. Old uploaded files: copy them into `$UPLOAD_DIR/private/legacy/` and store `{"key":"legacy/<file>","name":"<file>"}` as the field value.
4. Take a `pg_dump` of the old DB before you decommission it.

## 8. Updating (one command, also moves the booklet shop into this app)
```bash
cd /var/www/setareganplus-lean && git fetch --depth 1 origin lean-redesign && git reset --hard FETCH_HEAD && bash deploy/lean/update.sh
```
`deploy/lean/update.sh` does the following:
1. Resets the code to `origin/lean-redesign`.
2. Copies `ZIBAL_*`, `SMSIR_*` and `STAROS_SMS_*` from the old `/var/www/setareganplus/.env` into the lean `.env` without printing them. Keys that are already set are kept unless you pass `--resync-secrets`.
3. Runs `npm ci`, builds into `.next-build` and runs `prisma migrate deploy`. It **never** runs the seed.
4. Imports booklets and orders from the old DB with `scripts/migrate-old-shop.ts`. This is read-only on the old DB and safe to repeat. It skips «آزمایشی» items and keeps order numbers, QR tokens and short codes, so old SMS and QR links keep working.
5. Swaps the build, runs `pm2 reload` and health-checks. If anything fails it restores the previous build.
6. Rewrites `/etc/nginx/snippets/sp-booklet.conf` so that `/shop`, `/booklet`, `/order` and `/o` are served by this app. Only `/payments/*` (legacy Zibal callbacks), `/ghalamchi/register/receipt/` and `/images/` stay on the old app. If `nginx -t` or the live checks fail, it rolls back automatically.
7. Imports again, then schedules two silent re-syncs (+20 min and +2 h; log in `/var/backups/setareganplus-lean/resync.log`).

Useful commands:
- Rollback: `bash deploy/lean/update-rollback.sh`. This only touches nginx and sends the shop back to the old app. Add `--app` to also restore the previous code and build.
- Manual re-sync of old orders: `bash deploy/lean/resync-old-shop.sh`.
- Flags: `--skip-nginx`, `--skip-migrate`, `--resync-secrets`.

After the switch, manage booklet orders **only** in `/admin/shop`. The old admin no longer sees new orders.

## 9. Backups
- `pg_dump -Fc setareganplus > /backups/sp-$(date +%F).dump` (nightly cron)
- `rsync -a /var/www/setareganplus/shared/uploads/ /backups/uploads/`

## 10. Smoke test after deploy
`/`, `/shop` (open a booklet; do one real small purchase), `/education`, `/ghalamchi`, `/contact`, `/register` (submit a test, then archive it in `/admin/submissions`), `/admin/login`, and an export from `/admin/submissions`.
