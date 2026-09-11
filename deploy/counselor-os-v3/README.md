# Counselor OS v3 — production package

Canonical workspace: `/admin/counselor`

This bundle upgrades Counselor OS with counselor management (profile, capacity, assignment, simple package revenue) and the full privileged Holland / interest-assessment report.

It does **not** deploy itself.

## What it changes

- `/admin/counselor/counselors` and `/admin/counselor/counselors/[counselorId]`
- Canonical counselor profile on existing `BookingAdvisor` + `User` (additive columns)
- Assignment still uses `CounselorStudentAssignment`
- Counselor RBAC: assigned students only; supervisor sees all Guidance V2 students
- Read-only package revenue (finalAmountRials, Holland excluded)
- Full counselor/admin Holland result + multi-page print report (no student paywall change)
- Shared Holland profiles in `lib/guidance/journey-v2/holland/profiles.ts`
- Student Holland result UI still gated by `reportUnlocked` (paywall unchanged)

**Never copy** `lib/guidance/journey-v2/holland/question-bank.ts`, `scoring.ts`, or `store.ts`. Production already has the real question bank.

## What it never touches

- Nginx
- `.env*`
- `middleware.ts`
- `moshaver.setareganplus.ir` host routing
- Zibal / payment provider files
- PaymentIntent state machine / callbacks
- Holland checkout / student entitlement
- SMS
- Student guidance dashboard
- `/admin/guidance` implementation

## Revenue limitation (documented)

Revenue is attributed to the counselor of the student's **current active** assignment. Historical accounting is not implemented.

## Prepare files locally

```bash
node deploy/counselor-os-v3/pack-local.mjs
```

This copies the allowlisted sources into `files/` and extracts `counselor-os-v3.css`. Then copy the whole `deploy/counselor-os-v3/` folder to the server.

## Apply on the server

```bash
cd /var/www/setareganplus
bash deploy/counselor-os-v3/apply-production.sh
```

Gates: backup → allowlist copy → CSS merge → schema merge → additive migrate → `prisma generate` → `tsc` → `build` → PM2 only if all pass.

## Rollback

File rollback is written under `/var/backups/counselor-os-v3-* /ROLLBACK.sh`.

The additive `booking_advisors` columns are **not** dropped automatically.
