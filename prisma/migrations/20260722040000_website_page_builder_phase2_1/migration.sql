-- Visual Page Builder Phase 2.1:
-- - seoImageMediaId + templateKey on website_pages
-- - partial unique live slug (supports soft-delete / restore)

ALTER TABLE "website_pages"
  ADD COLUMN IF NOT EXISTS "seoImageMediaId" TEXT,
  ADD COLUMN IF NOT EXISTS "templateKey" TEXT;

DROP INDEX IF EXISTS "website_pages_organizationId_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "website_pages_organizationId_slug_live_key"
  ON "website_pages" ("organizationId", "slug")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "website_pages_seoImageMediaId_idx"
  ON "website_pages" ("seoImageMediaId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'website_pages_seoImageMediaId_fkey'
  ) THEN
    ALTER TABLE "website_pages"
      ADD CONSTRAINT "website_pages_seoImageMediaId_fkey"
      FOREIGN KEY ("seoImageMediaId") REFERENCES "media_assets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
