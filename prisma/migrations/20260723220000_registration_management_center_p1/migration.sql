-- Registration Management Center Phase 1
-- Expand statuses, progress tracking, documents, notes, activities.

-- 1) Replace RegistrationStatus enum (map legacy values)
CREATE TYPE "RegistrationStatus_new" AS ENUM (
  'NEW',
  'INCOMPLETE',
  'NEEDS_CALL',
  'WAITING_PAYMENT',
  'WAITING_DOCUMENTS',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

ALTER TABLE "registrations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "registrations"
  ALTER COLUMN "status" TYPE "RegistrationStatus_new"
  USING (
    CASE "status"::text
      WHEN 'DRAFT' THEN 'NEW'
      WHEN 'PENDING_PAYMENT' THEN 'WAITING_PAYMENT'
      WHEN 'PAID' THEN 'UNDER_REVIEW'
      WHEN 'COMPLETED' THEN 'APPROVED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'NEW'
    END::"RegistrationStatus_new"
  );

DROP TYPE "RegistrationStatus";
ALTER TYPE "RegistrationStatus_new" RENAME TO "RegistrationStatus";

ALTER TABLE "registrations"
  ALTER COLUMN "status" SET DEFAULT 'NEW'::"RegistrationStatus";

-- 2) Payment status
CREATE TYPE "RegistrationPaymentStatus" AS ENUM (
  'UNPAID',
  'AWAITING',
  'PAID',
  'FAILED',
  'WAIVED'
);

ALTER TABLE "registrations"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "RegistrationPaymentStatus" NOT NULL DEFAULT 'UNPAID';

UPDATE "registrations"
SET "paymentStatus" = 'AWAITING'
WHERE "status" = 'WAITING_PAYMENT';

-- 3) Document / activity enums
CREATE TYPE "RegistrationDocumentType" AS ENUM (
  'STUDENT_PHOTO',
  'NATIONAL_CARD',
  'BIRTH_CERTIFICATE',
  'PARENT_CONSENT',
  'OTHER'
);

CREATE TYPE "RegistrationDocumentReviewStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "RegistrationActivityType" AS ENUM (
  'CREATED',
  'PROGRESS_SAVED',
  'STATUS_CHANGED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_REVIEWED',
  'NOTE_ADDED',
  'CALL_LOGGED',
  'SMS_QUEUED',
  'PAYMENT_STARTED',
  'RESUMED',
  'SYSTEM'
);

-- 4) Progress + draft columns
ALTER TABLE "registrations"
  ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastCompletedStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completionPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalSteps" INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "resumeToken" TEXT,
  ADD COLUMN IF NOT EXISTS "abandonedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "wizardDraft" JSONB,
  ADD COLUMN IF NOT EXISTS "adminNotesSummary" TEXT;

-- 5) Make identity / product fields nullable for incomplete drafts
ALTER TABLE "registrations"
  ALTER COLUMN "studentFirstName" DROP NOT NULL,
  ALTER COLUMN "studentLastName" DROP NOT NULL,
  ALTER COLUMN "nationalCode" DROP NOT NULL,
  ALTER COLUMN "birthDate" DROP NOT NULL,
  ALTER COLUMN "gender" DROP NOT NULL,
  ALTER COLUMN "gradeLabel" DROP NOT NULL,
  ALTER COLUMN "schoolName" DROP NOT NULL,
  ALTER COLUMN "province" DROP NOT NULL,
  ALTER COLUMN "city" DROP NOT NULL,
  ALTER COLUMN "parentName" DROP NOT NULL,
  ALTER COLUMN "parentRelationship" DROP NOT NULL,
  ALTER COLUMN "parentMobile" DROP NOT NULL,
  ALTER COLUMN "parentMobileNormalized" DROP NOT NULL,
  ALTER COLUMN "productKey" DROP NOT NULL,
  ALTER COLUMN "productTitle" DROP NOT NULL;

ALTER TABLE "registrations"
  ALTER COLUMN "amountRials" SET DEFAULT 0,
  ALTER COLUMN "finalAmountRials" SET DEFAULT 0;

ALTER TABLE "registrations"
  ALTER COLUMN "amountRials" SET NOT NULL,
  ALTER COLUMN "finalAmountRials" SET NOT NULL;

-- Backfill progress for existing submitted rows
UPDATE "registrations"
SET
  "currentStep" = 6,
  "lastCompletedStep" = 6,
  "completionPercent" = 100,
  "totalSteps" = 6,
  "lastActivityAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" IN ('WAITING_PAYMENT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_resumeToken_key"
  ON "registrations"("resumeToken");

CREATE INDEX IF NOT EXISTS "registrations_organizationId_paymentStatus_createdAt_idx"
  ON "registrations"("organizationId", "paymentStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "registrations_organizationId_lastActivityAt_idx"
  ON "registrations"("organizationId", "lastActivityAt");

CREATE INDEX IF NOT EXISTS "registrations_organizationId_completionPercent_idx"
  ON "registrations"("organizationId", "completionPercent");

-- 6) Documents / notes / activities tables
CREATE TABLE IF NOT EXISTS "registration_documents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "documentType" "RegistrationDocumentType" NOT NULL,
  "reviewStatus" "RegistrationDocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "registration_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "registration_notes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "registration_activities" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "activityType" "RegistrationActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registration_documents_organizationId_id_key"
  ON "registration_documents"("organizationId", "id");

CREATE INDEX IF NOT EXISTS "registration_documents_organizationId_registrationId_documentType_idx"
  ON "registration_documents"("organizationId", "registrationId", "documentType");

CREATE INDEX IF NOT EXISTS "registration_documents_organizationId_reviewStatus_idx"
  ON "registration_documents"("organizationId", "reviewStatus");

CREATE INDEX IF NOT EXISTS "registration_documents_mediaAssetId_idx"
  ON "registration_documents"("mediaAssetId");

CREATE INDEX IF NOT EXISTS "registration_documents_organizationId_deletedAt_idx"
  ON "registration_documents"("organizationId", "deletedAt");

CREATE INDEX IF NOT EXISTS "registration_notes_organizationId_registrationId_createdAt_idx"
  ON "registration_notes"("organizationId", "registrationId", "createdAt");

CREATE INDEX IF NOT EXISTS "registration_activities_organizationId_registrationId_occurredAt_idx"
  ON "registration_activities"("organizationId", "registrationId", "occurredAt");

CREATE INDEX IF NOT EXISTS "registration_activities_organizationId_activityType_occurredAt_idx"
  ON "registration_activities"("organizationId", "activityType", "occurredAt");

ALTER TABLE "registration_documents"
  ADD CONSTRAINT "registration_documents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_documents"
  ADD CONSTRAINT "registration_documents_organizationId_registrationId_fkey"
  FOREIGN KEY ("organizationId", "registrationId")
  REFERENCES "registrations"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_documents"
  ADD CONSTRAINT "registration_documents_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_documents"
  ADD CONSTRAINT "registration_documents_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "registration_notes"
  ADD CONSTRAINT "registration_notes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_notes"
  ADD CONSTRAINT "registration_notes_organizationId_registrationId_fkey"
  FOREIGN KEY ("organizationId", "registrationId")
  REFERENCES "registrations"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_notes"
  ADD CONSTRAINT "registration_notes_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "registration_activities"
  ADD CONSTRAINT "registration_activities_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_activities"
  ADD CONSTRAINT "registration_activities_organizationId_registrationId_fkey"
  FOREIGN KEY ("organizationId", "registrationId")
  REFERENCES "registrations"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_activities"
  ADD CONSTRAINT "registration_activities_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
