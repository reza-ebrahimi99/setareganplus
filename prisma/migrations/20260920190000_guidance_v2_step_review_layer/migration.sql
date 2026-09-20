-- Guidance V2 — independent counselor review layer (18 steps), additive.

ALTER TYPE "GuidanceStepReviewStatus" ADD VALUE IF NOT EXISTS 'UNREVIEWED';
ALTER TYPE "GuidanceStepReviewStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';
ALTER TYPE "GuidanceStepReviewStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';
ALTER TYPE "GuidanceStepReviewStatus" ADD VALUE IF NOT EXISTS 'RESUBMITTED';
ALTER TYPE "GuidanceStepReviewStatus" ADD VALUE IF NOT EXISTS 'COUNSELOR_EDITED';

ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'RESUBMITTED';
ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'REVISION_CANCELLED';
ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'MARKED_REVIEWED';
ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'COUNSELOR_EDITED';
ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'HOLLAND_RETAKE_REQUESTED';
ALTER TYPE "GuidanceStepReviewEventKind" ADD VALUE IF NOT EXISTS 'HOLLAND_BASIS_SELECTED';

UPDATE "guidance_step_reviews" SET "status" = 'UNREVIEWED' WHERE "status" = 'PENDING';
UPDATE "guidance_step_reviews" SET "status" = 'REVIEWED' WHERE "status" = 'APPROVED';
UPDATE "guidance_step_reviews" SET "status" = 'REVISION_REQUESTED' WHERE "status" IN ('NEEDS_REVISION', 'REJECTED');

ALTER TABLE "guidance_plans"
  ADD COLUMN IF NOT EXISTS "v2OpenRevisionSteps" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "v2StepNeedsReviewFlags" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "v2HollandRetakePending" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "guidance_step_reviews"
  ADD COLUMN IF NOT EXISTS "requestedSections" JSONB,
  ADD COLUMN IF NOT EXISTS "impactMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "counselorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "retakeFromBeginning" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "guidance_step_revisions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guidance_step_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "guidance_step_revisions_reviewId_version_key"
  ON "guidance_step_revisions"("reviewId", "version");
CREATE INDEX IF NOT EXISTS "guidance_step_revisions_organizationId_reviewId_idx"
  ON "guidance_step_revisions"("organizationId", "reviewId");

CREATE TABLE IF NOT EXISTS "guidance_holland_attempts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "isActiveBasis" BOOLEAN NOT NULL DEFAULT false,
    "requestedByUserId" TEXT,
    "requestReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guidance_holland_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "guidance_holland_attempts_org_plan_attempt_key"
  ON "guidance_holland_attempts"("organizationId", "planId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "guidance_holland_attempts_org_plan_basis_idx"
  ON "guidance_holland_attempts"("organizationId", "planId", "isActiveBasis");

ALTER TABLE "guidance_step_revisions"
  ADD CONSTRAINT "guidance_step_revisions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guidance_step_revisions"
  ADD CONSTRAINT "guidance_step_revisions_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "guidance_step_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_holland_attempts"
  ADD CONSTRAINT "guidance_holland_attempts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guidance_holland_attempts"
  ADD CONSTRAINT "guidance_holland_attempts_org_plan_fkey"
  FOREIGN KEY ("organizationId", "planId") REFERENCES "guidance_plans"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_step_reviews"
  ADD CONSTRAINT "guidance_step_reviews_counselorUserId_fkey"
  FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "guidance_step_reviews_counselorUserId_idx"
  ON "guidance_step_reviews"("counselorUserId");
