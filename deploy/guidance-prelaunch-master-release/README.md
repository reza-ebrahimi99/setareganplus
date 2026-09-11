# Guidance prelaunch master release

Self-contained production bundle. **Does not deploy itself.**

Never copies `page.early.tsx`, `middleware.ts`, Zibal provider internals, `.env`, PM2 config, or Nginx.

## Apply

```bash
cd /var/www/setareganplus
bash deploy/guidance-prelaunch-master-release/apply-production.sh
```

## What it changes

- Unified package checkout + coupon UI
- Step 1 placeholder rejection
- Editable prior-step policy + counselor re-review flag
- Late-journey timeline
- Interest recommendation section
- Complete case book / compact 150-choice print / empty session worksheet
- Document approve / needs-correction gate
- Date-aware first vs second session conflict engine
- FREE plan feature/entitlement correction

## Prisma

Additive migration `20260909090000_guidance_prelaunch_hardening`:

- `guidance_plans.v2NeedsReviewAt`
- `guidance_plans.v2NeedsReviewStep`
- `guidance_documents.reviewNote`

Existing document rows keep their current verification status.
