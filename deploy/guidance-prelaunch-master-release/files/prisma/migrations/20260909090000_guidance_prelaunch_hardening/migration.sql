-- Additive prelaunch hardening. No DROP. Existing documents stay intact.
-- Existing rows keep PENDING unless they already have VERIFIED/REJECTED.

ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2NeedsReviewAt" TIMESTAMP(3);
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2NeedsReviewStep" INTEGER;

CREATE INDEX IF NOT EXISTS "gp_need_rev_idx"
  ON "guidance_plans" ("organizationId", "v2NeedsReviewAt");

ALTER TABLE "guidance_documents" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
