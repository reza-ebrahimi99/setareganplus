# Counselor OS v2 — production package

Canonical workspace: `/admin/counselor`

This bundle upgrades the already-deployed Counselor OS admin surface. It does **not** deploy itself.

## What it changes

- Complete V2 student case (18-step rail, finance split, documents, counselor edits + audit)
- Operational dashboard and student list (includes zero-activity leads)
- Print HTML/PDF reports (existing Vazirmatn print stack)
- Calendar / sessions / follow-ups / explicit BookingAdvisor linking
- Additive table `counselor_case_corrections` only

## What it never touches

- Nginx
- `.env*`
- `middleware.ts`
- `moshaver.setareganplus.ir`
- Zibal / payment provider files
- SMS
- Student guidance dashboard (`GuidancePlatformDashboard`)
- Production V2 resolver (`app/portal/student/services/guidance/steps/page.tsx`)
- `/admin/guidance` implementation (route stays; nav is de-emphasized)

## Prepare files locally

```bash
node deploy/counselor-os-v2/pack-local.mjs
```

This copies the allowlisted sources into `files/`. Then copy the whole `deploy/counselor-os-v2/` folder to the server.

## Apply on the server

```bash
# copy this folder to the server, then:
cd /var/www/setareganplus
bash deploy/counselor-os-v2/apply-production.sh
```

Gates: backup → allowlist copy → CSS merge → schema merge → additive migrate → `prisma generate` → `tsc` → `build` → PM2 only if all pass.

## Rollback

File rollback is written under `/var/backups/counselor-os-v2-* /ROLLBACK.sh`.

The audit table is **not** dropped automatically.
