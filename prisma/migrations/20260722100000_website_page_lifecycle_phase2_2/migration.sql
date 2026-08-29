-- Visual Page Builder Phase 2.2: page lifecycle (archivedAt)

ALTER TABLE "website_pages"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "website_pages_organizationId_status_archivedAt_deletedAt_idx"
  ON "website_pages" ("organizationId", "status", "archivedAt", "deletedAt");

-- Backfill archivedAt for existing ARCHIVED pages (do not overwrite non-null values)
UPDATE "website_pages"
SET "archivedAt" = "updatedAt"
WHERE "status" = 'ARCHIVED'
  AND "archivedAt" IS NULL
  AND "deletedAt" IS NULL;
