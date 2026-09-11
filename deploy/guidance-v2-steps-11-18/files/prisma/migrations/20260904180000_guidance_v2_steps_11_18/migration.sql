-- Guidance Journey V2 Steps 11–18 — additive only.
-- No DROP / destructive ALTER. Enum values and nullable columns only.

ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP13_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP14_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP15_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP16_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP17_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE IF NOT EXISTS 'STEP18_COMPLETED';

ALTER TYPE "GuidanceDocumentType" ADD VALUE IF NOT EXISTS 'SANJESH_RECEIPT';

ALTER TABLE "counselor_appointments" ADD COLUMN IF NOT EXISTS "purpose" TEXT;

CREATE INDEX IF NOT EXISTS "cos_appt_stu_purp_idx"
  ON "counselor_appointments" ("organizationId", "studentId", "purpose", "status");

ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2InformedAckVersion" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2InformedRevisionId" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshStatus" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshDeclaredAt" TIMESTAMP(3);
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshReference" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshNote" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshVerifiedAt" TIMESTAMP(3);
ALTER TABLE "guidance_plans" ADD COLUMN IF NOT EXISTS "v2SanjeshVerifiedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "gp_org_curstep_idx"
  ON "guidance_plans" ("organizationId", "currentStep", "deletedAt");

CREATE INDEX IF NOT EXISTS "gp_sanjesh_ver_idx"
  ON "guidance_plans" ("v2SanjeshVerifiedByUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guidance_plans_v2SanjeshVerifiedByUserId_fkey'
  ) THEN
    ALTER TABLE "guidance_plans"
      ADD CONSTRAINT "guidance_plans_v2SanjeshVerifiedByUserId_fkey"
      FOREIGN KEY ("v2SanjeshVerifiedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "guidance_choice_lists" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "counselorUserId" TEXT NOT NULL,
  "readyAt" TIMESTAMP(3),
  "readyByUserId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmationHash" TEXT,
  "ackVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guidance_choice_lists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gcl_org_plan_kind_ver"
  ON "guidance_choice_lists" ("organizationId", "planId", "kind", "version");

CREATE INDEX IF NOT EXISTS "gcl_org_plan_kind_st"
  ON "guidance_choice_lists" ("organizationId", "planId", "kind", "status");

CREATE INDEX IF NOT EXISTS "gcl_org_stu_idx"
  ON "guidance_choice_lists" ("organizationId", "studentId");

CREATE INDEX IF NOT EXISTS "gcl_ready_by_idx"
  ON "guidance_choice_lists" ("readyByUserId");

CREATE TABLE IF NOT EXISTS "guidance_choice_items" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "major" TEXT NOT NULL,
  "university" TEXT NOT NULL,
  "city" TEXT,
  "province" TEXT,
  "educationType" TEXT,
  "admissionType" TEXT,
  "officialCode" TEXT,
  "band" TEXT,
  "notes" TEXT,
  "rationale" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "sourceItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guidance_choice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gci_org_list_idx"
  ON "guidance_choice_items" ("organizationId", "listId");

CREATE INDEX IF NOT EXISTS "gci_list_order_idx"
  ON "guidance_choice_items" ("listId", "sortOrder");

CREATE INDEX IF NOT EXISTS "gci_list_active_idx"
  ON "guidance_choice_items" ("listId", "isActive");

CREATE TABLE IF NOT EXISTS "guidance_choice_feedback" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guidance_choice_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gcf_list_item_stu"
  ON "guidance_choice_feedback" ("listId", "itemId", "studentUserId");

CREATE INDEX IF NOT EXISTS "gcf_org_list_idx"
  ON "guidance_choice_feedback" ("organizationId", "listId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_lists_organizationId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_lists"
      ADD CONSTRAINT "guidance_choice_lists_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_lists_plan_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_lists"
      ADD CONSTRAINT "guidance_choice_lists_plan_fkey"
      FOREIGN KEY ("organizationId", "planId") REFERENCES "guidance_plans"("organizationId", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_lists_student_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_lists"
      ADD CONSTRAINT "guidance_choice_lists_student_fkey"
      FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_lists_counselorUserId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_lists"
      ADD CONSTRAINT "guidance_choice_lists_counselorUserId_fkey"
      FOREIGN KEY ("counselorUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_lists_readyByUserId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_lists"
      ADD CONSTRAINT "guidance_choice_lists_readyByUserId_fkey"
      FOREIGN KEY ("readyByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_items_organizationId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_items"
      ADD CONSTRAINT "guidance_choice_items_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_items_listId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_items"
      ADD CONSTRAINT "guidance_choice_items_listId_fkey"
      FOREIGN KEY ("listId") REFERENCES "guidance_choice_lists"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_feedback_organizationId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_feedback"
      ADD CONSTRAINT "guidance_choice_feedback_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_feedback_listId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_feedback"
      ADD CONSTRAINT "guidance_choice_feedback_listId_fkey"
      FOREIGN KEY ("listId") REFERENCES "guidance_choice_lists"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_feedback_itemId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_feedback"
      ADD CONSTRAINT "guidance_choice_feedback_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "guidance_choice_items"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guidance_choice_feedback_studentUserId_fkey'
  ) THEN
    ALTER TABLE "guidance_choice_feedback"
      ADD CONSTRAINT "guidance_choice_feedback_studentUserId_fkey"
      FOREIGN KEY ("studentUserId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
