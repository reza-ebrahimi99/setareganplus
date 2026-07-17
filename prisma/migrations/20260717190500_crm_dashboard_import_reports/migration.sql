-- CRM-specific import summaries used by the existing admin dashboard.
-- No source files or generic job infrastructure are persisted.
CREATE TABLE "crm_lead_import_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "importedByUserId" TEXT,
    "sourceFileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "invalidCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "ownerDistribution" JSONB NOT NULL DEFAULT '[]',
    "resultCsv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_lead_import_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_lead_import_reports_organizationId_branchId_createdAt_idx"
    ON "crm_lead_import_reports"("organizationId", "branchId", "createdAt");

CREATE INDEX "crm_lead_import_reports_organizationId_importedByUserId_createdAt_idx"
    ON "crm_lead_import_reports"("organizationId", "importedByUserId", "createdAt");

ALTER TABLE "crm_lead_import_reports"
    ADD CONSTRAINT "crm_lead_import_reports_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_lead_import_reports"
    ADD CONSTRAINT "crm_lead_import_reports_organizationId_branchId_fkey"
    FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_lead_import_reports"
    ADD CONSTRAINT "crm_lead_import_reports_importedByUserId_fkey"
    FOREIGN KEY ("importedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
