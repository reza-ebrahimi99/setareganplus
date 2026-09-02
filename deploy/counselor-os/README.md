# SetareganPlus Counselor OS — Deployment Package

Production-grade counselor operating system integrated with Guidance Journey and Smart Booking.

## Canonical entry

- **App routes:** `/admin/counselor/*` (staff session + `guidance.view`)
- **Subdomain:** `moshaver.setareganplus.ir` → redirects `/` to `/admin/counselor`
- **Login:** `/admin/login?next=/admin/counselor`

## Core capabilities

- Counselor dashboard (real data)
- Student case 360° with Journey read-only summary
- Appointment availability via existing booking engine
- Student booking from guidance dashboard
- Persistent counseling session records, notes, follow-ups
- RBAC: counselor scoped to assigned students (bootstrap: `guidance.review` sees all guidance students)

See `PRODUCTION_DEPLOY.md`, `MIGRATION_NOTES.md`, `SMOKE_TEST.md`.
