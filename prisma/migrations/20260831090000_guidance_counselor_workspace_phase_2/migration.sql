-- Counselor Workspace Phase 2 — per-step review + field-level audit actions.

ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_STEP_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_STEP_REWOUND';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_FIELD_EDITED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_NOTE_ADDED';

CREATE TYPE "GuidanceStepReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

CREATE TYPE "GuidanceStepReviewEventKind" AS ENUM (
  'APPROVED',
  'REJECTED',
  'REVISION_REQUESTED',
  'NOTE_ADDED',
  'STUDENT_MESSAGE_SET',
  'EDITED',
  'DOCUMENT_REPLACED',
  'DOCUMENT_VERIFIED',
  'DOCUMENT_REJECTED'
);

CREATE TABLE "guidance_step_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "status" "GuidanceStepReviewStatus" NOT NULL DEFAULT 'PENDING',
    "privateNote" TEXT,
    "studentMessage" TEXT,
    "rejectReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "revisionRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guidance_step_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guidance_step_review_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "kind" "GuidanceStepReviewEventKind" NOT NULL,
    "status" "GuidanceStepReviewStatus" NOT NULL,
    "privateNote" TEXT,
    "studentMessage" TEXT,
    "rejectReason" TEXT,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guidance_step_review_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guidance_step_reviews_organizationId_planId_stepNumber_key" ON "guidance_step_reviews"("organizationId", "planId", "stepNumber");
CREATE INDEX "guidance_step_reviews_organizationId_status_idx" ON "guidance_step_reviews"("organizationId", "status");
CREATE INDEX "guidance_step_reviews_organizationId_planId_idx" ON "guidance_step_reviews"("organizationId", "planId");
CREATE INDEX "guidance_step_reviews_approvedByUserId_idx" ON "guidance_step_reviews"("approvedByUserId");
CREATE INDEX "guidance_step_reviews_rejectedByUserId_idx" ON "guidance_step_reviews"("rejectedByUserId");
CREATE INDEX "guidance_step_review_events_organizationId_reviewId_createdAt_idx" ON "guidance_step_review_events"("organizationId", "reviewId", "createdAt");
CREATE INDEX "guidance_step_review_events_actorUserId_idx" ON "guidance_step_review_events"("actorUserId");

ALTER TABLE "guidance_step_reviews" ADD CONSTRAINT "guidance_step_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guidance_step_reviews" ADD CONSTRAINT "guidance_step_reviews_organizationId_planId_fkey" FOREIGN KEY ("organizationId", "planId") REFERENCES "guidance_plans"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guidance_step_reviews" ADD CONSTRAINT "guidance_step_reviews_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guidance_step_reviews" ADD CONSTRAINT "guidance_step_reviews_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "guidance_step_review_events" ADD CONSTRAINT "guidance_step_review_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guidance_step_review_events" ADD CONSTRAINT "guidance_step_review_events_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "guidance_step_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guidance_step_review_events" ADD CONSTRAINT "guidance_step_review_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
