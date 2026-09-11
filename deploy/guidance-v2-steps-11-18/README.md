# Guidance Journey V2 Steps 11–18 — production package

Extends the existing Guidance V2 student journey and Counselor OS V3.
Does **not** deploy itself. Do **not** run the apply script until operators intend.

Canonical student path:

`/portal/student/services/guidance` → dashboard CTA → `/portal/student/services/guidance/steps` → `/journey/steps/{currentStep}`

V2 eligibility remains `GuidancePlan.journeyVersion = 2`.

## What it adds

- Student steps 11–18 (booking, Konkur, counselor arrangement, 150-choice review, second session, final revision, informed confirmation, Sanjesh tracking)
- Counselor OS case section + 150-choice workspace
- Dashboard queues for counselor-owned stages
- Print reports: konkur, initial list, student review, final list, summary
- Additive Prisma: appointment purpose, choice lists/items/feedback, Sanjesh tracking columns

## What it never touches

- Nginx / moshaver host routing
- `.env*`
- `middleware.ts`
- Zibal / payment callbacks / PaymentIntent machine
- Holland checkout / entitlement / question-bank
- SMS.ir
- `/admin/guidance` as a product surface

## Production page 1–10 safety

Upload **only** this `deploy/guidance-v2-steps-11-18/` folder. Do **not** copy the local
`page.early.tsx` stub (it `notFound()`s steps 1–10) onto production.

The apply script:

1. Reads the **current production** `.../journey/steps/[step]/page.tsx`
2. If that file is the live 1–10 dispatcher (no `GUIDANCE_V2_LATE_DISPATCH` marker), copies it to `page.early.tsx` (overwriting a local stub if one slipped in)
3. Stamps `GUIDANCE_V2_EARLY_PRESERVED` on the preserved file
4. Then installs the new wrapper as `page.tsx`

On rerun, if `page.tsx` is already the wrapper, the script **never** copies it onto `page.early.tsx`. If the wrapper is present but `page.early.tsx` is missing or is the local stub, the script **aborts**.

## Prepare locally

```bash
node deploy/guidance-v2-steps-11-18/pack-local.mjs
```

Copy the whole `deploy/guidance-v2-steps-11-18/` folder to the server.

Rerun is safe when the target migration is already applied: `prisma migrate status`
exit 0 plus `Database schema is up to date!` skips `migrate deploy` and continues
generate / typecheck / build / PM2. It does **not** require the migration name to
appear in that up-to-date status text.

## Apply on the server (do not run from this workspace unless asked)

```bash
cd /var/www/setareganplus && bash deploy/guidance-v2-steps-11-18/apply-production.sh
```

## Rollback

File rollback is written under `/var/backups/guidance-v2-steps-11-18-*/ROLLBACK.sh`.
Additive tables/columns are **not** dropped automatically.
