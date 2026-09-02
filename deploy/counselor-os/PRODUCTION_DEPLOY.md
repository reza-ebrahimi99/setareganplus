# Counselor OS — Production Deploy Steps

## Preconditions

- Branch: merge Counselor OS commits into deployment branch (e.g. `feat/admin-crm-ui-foundation`)
- Backup production tree: `cp -a /var/www/setareganplus /var/www/setareganplus.backup.$(date +%Y%m%d%H%M)`
- **Do not** `git reset`, `git clean`, or blind `git pull`

## 1. Database (additive only)

```bash
cd /var/www/setareganplus
npx prisma migrate deploy
npx prisma generate
```

Migration: `20260903120000_counselor_os_foundation`

## 2. Application files

Safe to transfer (see `PRODUCTION_SAFETY.md` for merge notes):

- `prisma/schema.prisma` + migration folder
- `lib/counselor-os/**`
- `app/admin/counselor/**`
- `components/counselor-os/**`
- `app/portal/student/services/guidance/counseling-actions.ts`
- `app/portal/student/services/guidance/page.tsx` (appointments view + counseling card)
- `components/guidance/office/GuidanceStudentDashboardPanels.tsx` (counseling card slot)
- `middleware.ts` (moshaver host redirect)
- `app/globals.css` (cos-* + counseling styles — **surgical merge** if production diverged)

## 3. Build & restart

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
pm2 restart setareganplus
```

## 4. Nginx (if not already configured)

Point `moshaver.setareganplus.ir` to the same upstream as main app. No special path rules required — middleware handles `/` → `/admin/counselor`.

Optional env:

```
COUNSELOR_OS_HOST=moshaver.setareganplus.ir
```

## 5. Bootstrap data

1. Ensure counselor staff users have `guidance.view` (+ `guidance.review` for leads)
2. Link counselor user to `BookingAdvisor` (admin bookings)
3. Create `CounselorStudentAssignment` rows OR rely on review bootstrap
4. Counselor publishes availability at `/admin/counselor/calendar`

## 6. Smoke test

Run checklist in `SMOKE_TEST.md`
