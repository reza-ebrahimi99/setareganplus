-- Guidance ERP Phase 0 — additive only.
-- GuidancePlan + GuidanceDocument. Reuses Organization, User, Student, MediaAsset.
-- Does not alter existing table data. Flag key "guidance" uses existing organization_feature_flags.

CREATE TYPE "GuidancePlanStatus" AS ENUM (
  'PRE_REGISTERED',
  'INTAKE_INCOMPLETE',
  'FINAL_GRADES_UPLOADED'
);

CREATE TYPE "GuidanceExamGroup" AS ENUM (
  'MATHEMATICS',
  'EXPERIMENTAL_SCIENCES',
  'HUMANITIES',
  'ARTS',
  'LANGUAGES'
);

CREATE TYPE "GuidanceDocumentType" AS ENUM ('FINAL_GRADES');

CREATE TYPE "GuidanceDocumentVerificationStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GUIDANCE_PLAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GUIDANCE_DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GUIDANCE_DOCUMENT_REPLACED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GUIDANCE_STATUS_CHANGED';

CREATE TABLE "guidance_plans" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "GuidancePlanStatus" NOT NULL DEFAULT 'PRE_REGISTERED',
  "examGroup" "GuidanceExamGroup" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "guidance_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guidance_documents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "documentType" "GuidanceDocumentType" NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "isLatest" BOOLEAN NOT NULL DEFAULT true,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "verificationStatus" "GuidanceDocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "guidance_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guidance_plans_organizationId_publicId_key" ON "guidance_plans"("organizationId", "publicId");
CREATE UNIQUE INDEX "guidance_plans_organizationId_id_key" ON "guidance_plans"("organizationId", "id");
CREATE INDEX "guidance_plans_organizationId_status_deletedAt_idx" ON "guidance_plans"("organizationId", "status", "deletedAt");
CREATE INDEX "guidance_plans_organizationId_studentId_deletedAt_idx" ON "guidance_plans"("organizationId", "studentId", "deletedAt");
CREATE INDEX "guidance_plans_organizationId_userId_deletedAt_idx" ON "guidance_plans"("organizationId", "userId", "deletedAt");
CREATE INDEX "guidance_plans_userId_idx" ON "guidance_plans"("userId");

CREATE UNIQUE INDEX "guidance_documents_organizationId_planId_documentType_versionNumber_key" ON "guidance_documents"("organizationId", "planId", "documentType", "versionNumber");
CREATE UNIQUE INDEX "guidance_documents_organizationId_id_key" ON "guidance_documents"("organizationId", "id");
CREATE INDEX "guidance_documents_organizationId_planId_documentType_isLatest_idx" ON "guidance_documents"("organizationId", "planId", "documentType", "isLatest");
CREATE INDEX "guidance_documents_organizationId_verificationStatus_idx" ON "guidance_documents"("organizationId", "verificationStatus");
CREATE INDEX "guidance_documents_mediaAssetId_idx" ON "guidance_documents"("mediaAssetId");
CREATE INDEX "guidance_documents_organizationId_deletedAt_idx" ON "guidance_documents"("organizationId", "deletedAt");
CREATE INDEX "guidance_documents_verifiedByUserId_idx" ON "guidance_documents"("verifiedByUserId");

-- At most one latest non-deleted version per plan + document type (version-ready).
CREATE UNIQUE INDEX "guidance_documents_one_latest_per_type"
  ON "guidance_documents" ("organizationId", "planId", "documentType")
  WHERE "isLatest" = true AND "deletedAt" IS NULL;

ALTER TABLE "guidance_plans"
  ADD CONSTRAINT "guidance_plans_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_plans"
  ADD CONSTRAINT "guidance_plans_organizationId_studentId_fkey"
  FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_plans"
  ADD CONSTRAINT "guidance_plans_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_documents"
  ADD CONSTRAINT "guidance_documents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_documents"
  ADD CONSTRAINT "guidance_documents_organizationId_planId_fkey"
  FOREIGN KEY ("organizationId", "planId") REFERENCES "guidance_plans"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_documents"
  ADD CONSTRAINT "guidance_documents_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guidance_documents"
  ADD CONSTRAINT "guidance_documents_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
