-- SXP Phase S2: Digital Student Card, file index, hub shell projections.
-- Additive. Does not alter booking, CRM, SMS, portal auth, or S1 engine tables beyond enum values.

ALTER TYPE "ExperienceEngineHandlerName" ADD VALUE IF NOT EXISTS 'STUDENT_CARD_REFRESHER';
ALTER TYPE "ExperienceEngineHandlerName" ADD VALUE IF NOT EXISTS 'DOWNLOAD_INDEXER';

ALTER TYPE "ExperienceWidgetKey" ADD VALUE IF NOT EXISTS 'FILES_READY';

CREATE TYPE "ExperienceFileKind" AS ENUM (
  'RECEIPT',
  'CERTIFICATE',
  'INVOICE',
  'BOOKLET',
  'BOOK',
  'PDF',
  'MEDIA',
  'OTHER'
);

ALTER TABLE "experience_profiles"
  ADD COLUMN IF NOT EXISTS "coverMediaId" TEXT;

CREATE TABLE "experience_student_cards" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "studentCode" TEXT,
  "maskedNationalCode" TEXT,
  "schoolName" TEXT NOT NULL,
  "branchName" TEXT,
  "gradeName" TEXT,
  "schoolYear" TEXT,
  "membershipLabel" TEXT NOT NULL,
  "portraitUrl" TEXT,
  "qrPayload" TEXT NOT NULL,
  "qrTokenHash" TEXT NOT NULL,
  "portalId" TEXT NOT NULL,
  "completionRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "payload" JSONB,
  "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "experience_student_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_student_cards_organizationId_userId_studentId_key"
  ON "experience_student_cards"("organizationId", "userId", "studentId");

CREATE UNIQUE INDEX "experience_student_cards_organizationId_id_key"
  ON "experience_student_cards"("organizationId", "id");

CREATE INDEX "experience_student_cards_organizationId_userId_idx"
  ON "experience_student_cards"("organizationId", "userId");

CREATE INDEX "experience_student_cards_userId_idx"
  ON "experience_student_cards"("userId");

ALTER TABLE "experience_student_cards"
  ADD CONSTRAINT "experience_student_cards_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_student_cards"
  ADD CONSTRAINT "experience_student_cards_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_files" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceFileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "mime" TEXT,
  "sizeBytes" INTEGER,
  "mediaStorageKey" TEXT,
  "kind" "ExperienceFileKind" NOT NULL DEFAULT 'OTHER',
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "visibility" "ExperienceTimelineVisibility" NOT NULL DEFAULT 'SELF',
  "inboxId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "experience_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_files_organizationId_userId_sourceFileId_key"
  ON "experience_files"("organizationId", "userId", "sourceFileId");

CREATE UNIQUE INDEX "experience_files_organizationId_id_key"
  ON "experience_files"("organizationId", "id");

CREATE INDEX "experience_files_organizationId_userId_createdAt_idx"
  ON "experience_files"("organizationId", "userId", "createdAt");

CREATE INDEX "experience_files_organizationId_userId_kind_idx"
  ON "experience_files"("organizationId", "userId", "kind");

ALTER TABLE "experience_files"
  ADD CONSTRAINT "experience_files_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_files"
  ADD CONSTRAINT "experience_files_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
