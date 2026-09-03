# Guidance Polish Final — deployment package

Fixes the 10 reported student-facing Guidance/university-selection UI issues.

> **Operators start here: [`RUNBOOK_FINAL.md`](./RUNBOOK_FINAL.md).**
> It is the single ordered command sheet for both stages, including the
> Counselor OS non-deployment proof and the rollback path.

## Contents

| File | Role |
|------|------|
| `RUNBOOK_FINAL.md` | **The runbook.** Backup → Stage A → inspection → Stage B → CSS merge → tsc → build → restart → smoke tests |
| `apply-guidance-polish-final-production.sh` | Stage A applier — six-file allowlist with a Counselor OS grep guard |
| `guidance-polish.css` | The five scoped CSS blocks, generated and verified. Append only |
| `extract-css-blocks.mjs` | Regenerates `guidance-polish.css` from `app/globals.css` |
| `PRODUCTION_DEPLOY.md` | Longer-form notes behind the runbook steps |
| `PRODUCTION_SAFETY.md` | Collision rules and forbidden operations |
| `SMOKE_TEST.md` | Full per-issue verification checklist |

## Scope isolation

This package is **completely independent** of `deploy/counselor-os/`.

It does **NOT**:

- deploy any `/admin/counselor` route
- run any Prisma migration
- seed counselor/student assignments
- link `BookingAdvisor` records
- touch payment logic, `packagePaidAt`, `guidancePackageCode`, or Zibal
- change `journeyVersion`, `currentStep`, or `completedSteps`

**No database change is required for this deployment.**

## Critical context

The previous installer (`deploy/apply-guidance-polish-production.sh`) built and restarted
successfully but **skipped** the production-sensitive sections, so the fixes were never
visible. This package patches the **actually rendered** components instead.

## Branch/production divergence

This repository runs the **V1** journey. Production additionally has **V2**
(`components/guidance/journey-v2/**`, `START`/`SMART`/`SPECIALIZED`/`PREMIUM` packages,
real discount logic). Three issues therefore need a production-side surgical patch and
cannot be completed from this repo:

| Issue | Reason |
|-------|--------|
| 6 — START free-plan benefit | `START` package exists only in production V2 catalog |
| 8 — Journey V2 footer buttons | `journey-v2/**` does not exist here (V1 equivalent fixed) |
| 9 — Discount code UI | Real discount server logic exists only on production |

Patches for these are in:

- `../production-package-start-benefit.patch.md`
- `../production-journey-v2-nav.patch.md`
- `../production-discount-ui-merge.md`

See `PRODUCTION_DEPLOY.md`, `PRODUCTION_SAFETY.md`, `SMOKE_TEST.md`.
