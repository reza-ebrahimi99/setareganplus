# Counselor workflow master fix

Booking integrity, Choice Studio publish/revision, dual-session scheduling,
Jalali follow-ups, and Step 14 action UI.

This bundle **does not deploy itself**.

## What it fixes

1. Step 11/15 cannot complete without a real FIRST/SECOND session appointment
2. Counselor publish spinner settles after success
3. After student feedback, counselor can apply revisions on a FINAL draft
4. FIRST and SECOND session schedules are independent, with break windows
5. Follow-up datetime is Jalali (DB stays UTC/Gregorian)
6. Step 14 student review has a premium submit box

## What it never touches

- Prisma schema / migrations
- `lib/payment/**`, Zibal, discounts
- `middleware.ts`
- `page.early.tsx`
- Steps 1–10 business logic

## Pack locally

```bash
node deploy/counselor-workflow-master-fix/pack-local.mjs
```

Copy the whole `deploy/counselor-workflow-master-fix/` folder to the server, then:

```bash
cd /var/www/setareganplus && bash deploy/counselor-workflow-master-fix/apply-production.sh
```

Rollback files are copied under `/var/backups/counselor-workflow-master-fix-*/`.
