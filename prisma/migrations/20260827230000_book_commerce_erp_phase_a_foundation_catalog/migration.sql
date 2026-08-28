-- Book Commerce ERP — Pen Book Agency
-- Phase A (Foundation) + Phase B (Catalog) — additive only.
-- Does not alter booking, CRM, SMS, auth, RBAC, or any existing table's data.
-- Flag: organization_feature_flags key "bookCommerce". No row = OFF.

CREATE TYPE "BookSkuStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
CREATE TYPE "BookPriceKind" AS ENUM ('LIST', 'SALE');
CREATE TYPE "BookImportJobType" AS ENUM ('CATALOG');
CREATE TYPE "BookImportJobStatus" AS ENUM ('UPLOADED', 'PREVIEWED', 'VALIDATED', 'COMMITTING', 'DONE', 'FAILED', 'CANCELLED');
CREATE TYPE "BookImportRowAction" AS ENUM ('INSERT', 'UPDATE', 'SKIP', 'DUPLICATE_FLAG', 'ERROR');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_CATALOG_TYPE_SAVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_CATALOG_SKU_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_CATALOG_SKU_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_CATALOG_PRICE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKS_CATALOG_IMPORTED';

-- ─── Foundation ────────────────────────────────────────────────────────────

-- "organization_feature_flags" is created by the SXP Phase S1 migration
-- (20260827220000_sxp_experience_engine_s1), which now precedes this migration
-- after the rebase onto master. Book Commerce ERP only contributes its optional
-- "payload" column to the shared per-org feature-flag table.
ALTER TABLE "organization_feature_flags" ADD COLUMN "payload" JSONB;

CREATE TABLE "book_agency_profiles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "legalName" TEXT,
  "logoMediaAssetId" TEXT,
  "defaultDepositPercent" INTEGER NOT NULL DEFAULT 30,
  "defaultReservationTtlHours" INTEGER NOT NULL DEFAULT 168,
  "allowIssueUnpaid" BOOLEAN NOT NULL DEFAULT false,
  "installmentEnabled" BOOLEAN NOT NULL DEFAULT true,
  "countGiftsInGmv" BOOLEAN NOT NULL DEFAULT false,
  "showStudentNamesToTeachers" BOOLEAN NOT NULL DEFAULT false,
  "centralVisibleToAllCashiers" BOOLEAN NOT NULL DEFAULT true,
  "instantInternalTransfer" BOOLEAN NOT NULL DEFAULT true,
  "invoiceAtFulfillment" BOOLEAN NOT NULL DEFAULT true,
  "barcodeSymbologyDefault" TEXT NOT NULL DEFAULT 'CODE128',
  "numberFormatPrefix" TEXT NOT NULL DEFAULT 'BA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "book_agency_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_agency_profiles_organizationId_key"
  ON "book_agency_profiles"("organizationId");

ALTER TABLE "book_agency_profiles"
  ADD CONSTRAINT "book_agency_profiles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_agency_profiles"
  ADD CONSTRAINT "book_agency_profiles_logoMediaAssetId_fkey"
  FOREIGN KEY ("logoMediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "book_document_sequences" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "prefix" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "book_document_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_document_sequences_organizationId_documentType_periodK_key"
  ON "book_document_sequences"("organizationId", "documentType", "periodKey");

ALTER TABLE "book_document_sequences"
  ADD CONSTRAINT "book_document_sequences_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Catalog ───────────────────────────────────────────────────────────────

CREATE TABLE "book_publishers" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "book_publishers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_publishers_organizationId_name_key" ON "book_publishers"("organizationId", "name");
CREATE UNIQUE INDEX "book_publishers_organizationId_id_key" ON "book_publishers"("organizationId", "id");
CREATE INDEX "book_publishers_organizationId_isActive_deletedAt_idx" ON "book_publishers"("organizationId", "isActive", "deletedAt");

ALTER TABLE "book_publishers"
  ADD CONSTRAINT "book_publishers_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "book_types" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "book_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_types_organizationId_code_key" ON "book_types"("organizationId", "code");
CREATE UNIQUE INDEX "book_types_organizationId_id_key" ON "book_types"("organizationId", "id");
CREATE INDEX "book_types_organizationId_sortOrder_idx" ON "book_types"("organizationId", "sortOrder");
CREATE INDEX "book_types_organizationId_isActive_deletedAt_idx" ON "book_types"("organizationId", "isActive", "deletedAt");

ALTER TABLE "book_types"
  ADD CONSTRAINT "book_types_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "book_titles" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "publisherId" TEXT,
  "bookTypeId" TEXT,
  "gradeId" TEXT,
  "subjectId" TEXT,
  "majorId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "keywords" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "book_titles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_titles_organizationId_id_key" ON "book_titles"("organizationId", "id");
CREATE INDEX "book_titles_organizationId_publisherId_idx" ON "book_titles"("organizationId", "publisherId");
CREATE INDEX "book_titles_organizationId_bookTypeId_idx" ON "book_titles"("organizationId", "bookTypeId");
CREATE INDEX "book_titles_organizationId_gradeId_idx" ON "book_titles"("organizationId", "gradeId");
CREATE INDEX "book_titles_organizationId_subjectId_idx" ON "book_titles"("organizationId", "subjectId");
CREATE INDEX "book_titles_organizationId_majorId_idx" ON "book_titles"("organizationId", "majorId");
CREATE INDEX "book_titles_organizationId_deletedAt_idx" ON "book_titles"("organizationId", "deletedAt");

ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_publisherId_fkey"
  FOREIGN KEY ("organizationId", "publisherId") REFERENCES "book_publishers"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_bookTypeId_fkey"
  FOREIGN KEY ("organizationId", "bookTypeId") REFERENCES "book_types"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_gradeId_fkey"
  FOREIGN KEY ("organizationId", "gradeId") REFERENCES "student_grades"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_subjectId_fkey"
  FOREIGN KEY ("organizationId", "subjectId") REFERENCES "subjects"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_titles"
  ADD CONSTRAINT "book_titles_organizationId_majorId_fkey"
  FOREIGN KEY ("organizationId", "majorId") REFERENCES "student_majors"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "book_skus" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "internalCode" TEXT NOT NULL,
  "barcode" TEXT,
  "editionLabel" TEXT,
  "editionYear" TEXT,
  "status" "BookSkuStatus" NOT NULL DEFAULT 'ACTIVE',
  "searchText" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "book_skus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_skus_organizationId_internalCode_key" ON "book_skus"("organizationId", "internalCode");
CREATE UNIQUE INDEX "book_skus_organizationId_id_key" ON "book_skus"("organizationId", "id");
CREATE INDEX "book_skus_organizationId_titleId_idx" ON "book_skus"("organizationId", "titleId");
CREATE INDEX "book_skus_organizationId_status_deletedAt_idx" ON "book_skus"("organizationId", "status", "deletedAt");
CREATE INDEX "book_skus_organizationId_barcode_idx" ON "book_skus"("organizationId", "barcode");

ALTER TABLE "book_skus"
  ADD CONSTRAINT "book_skus_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_skus"
  ADD CONSTRAINT "book_skus_organizationId_titleId_fkey"
  FOREIGN KEY ("organizationId", "titleId") REFERENCES "book_titles"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "book_sku_prices" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "kind" "BookPriceKind" NOT NULL DEFAULT 'LIST',
  "amountRials" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "book_sku_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "book_sku_prices_organizationId_skuId_kind_effectiveFrom_idx" ON "book_sku_prices"("organizationId", "skuId", "kind", "effectiveFrom");
CREATE INDEX "book_sku_prices_organizationId_skuId_effectiveTo_idx" ON "book_sku_prices"("organizationId", "skuId", "effectiveTo");

ALTER TABLE "book_sku_prices"
  ADD CONSTRAINT "book_sku_prices_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_sku_prices"
  ADD CONSTRAINT "book_sku_prices_organizationId_skuId_fkey"
  FOREIGN KEY ("organizationId", "skuId") REFERENCES "book_skus"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_sku_prices"
  ADD CONSTRAINT "book_sku_prices_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "book_sku_tags" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "book_sku_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_sku_tags_organizationId_skuId_tagId_key" ON "book_sku_tags"("organizationId", "skuId", "tagId");
CREATE INDEX "book_sku_tags_organizationId_tagId_idx" ON "book_sku_tags"("organizationId", "tagId");

ALTER TABLE "book_sku_tags"
  ADD CONSTRAINT "book_sku_tags_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_sku_tags"
  ADD CONSTRAINT "book_sku_tags_organizationId_skuId_fkey"
  FOREIGN KEY ("organizationId", "skuId") REFERENCES "book_skus"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_sku_tags"
  ADD CONSTRAINT "book_sku_tags_organizationId_tagId_fkey"
  FOREIGN KEY ("organizationId", "tagId") REFERENCES "tags"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Excel import ────────────────────────────────────────────────────────────

CREATE TABLE "book_import_jobs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobType" "BookImportJobType" NOT NULL DEFAULT 'CATALOG',
  "status" "BookImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
  "fileName" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "processedRows" INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "priceChangeCount" INTEGER NOT NULL DEFAULT 0,
  "reportMediaAssetId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "book_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_import_jobs_organizationId_id_key" ON "book_import_jobs"("organizationId", "id");
CREATE INDEX "book_import_jobs_organizationId_createdAt_idx" ON "book_import_jobs"("organizationId", "createdAt");
CREATE INDEX "book_import_jobs_organizationId_status_idx" ON "book_import_jobs"("organizationId", "status");

ALTER TABLE "book_import_jobs"
  ADD CONSTRAINT "book_import_jobs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_import_jobs"
  ADD CONSTRAINT "book_import_jobs_reportMediaAssetId_fkey"
  FOREIGN KEY ("reportMediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "book_import_jobs"
  ADD CONSTRAINT "book_import_jobs_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "book_import_row_results" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "action" "BookImportRowAction" NOT NULL,
  "internalCode" TEXT,
  "skuId" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "book_import_row_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_import_row_results_organizationId_jobId_rowNumber_key" ON "book_import_row_results"("organizationId", "jobId", "rowNumber");
CREATE INDEX "book_import_row_results_organizationId_jobId_action_idx" ON "book_import_row_results"("organizationId", "jobId", "action");

ALTER TABLE "book_import_row_results"
  ADD CONSTRAINT "book_import_row_results_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_import_row_results"
  ADD CONSTRAINT "book_import_row_results_organizationId_jobId_fkey"
  FOREIGN KEY ("organizationId", "jobId") REFERENCES "book_import_jobs"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_import_row_results"
  ADD CONSTRAINT "book_import_row_results_organizationId_skuId_fkey"
  FOREIGN KEY ("organizationId", "skuId") REFERENCES "book_skus"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
