-- Website Top Rank Archive (آرشیو رتبه‌های برتر کنکور)
CREATE TABLE IF NOT EXISTS "website_top_rank_archives" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "website_top_rank_archives_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "website_top_rank_archives_organizationId_deletedAt_isPublished_year_idx"
  ON "website_top_rank_archives"("organizationId", "deletedAt", "isPublished", "year");

CREATE INDEX IF NOT EXISTS "website_top_rank_archives_organizationId_sortOrder_idx"
  ON "website_top_rank_archives"("organizationId", "sortOrder");

CREATE INDEX IF NOT EXISTS "website_top_rank_archives_mediaId_idx"
  ON "website_top_rank_archives"("mediaId");

-- Live rows only: one year per organization
CREATE UNIQUE INDEX IF NOT EXISTS "website_top_rank_archives_org_year_alive_key"
  ON "website_top_rank_archives"("organizationId", "year")
  WHERE "deletedAt" IS NULL;

ALTER TABLE "website_top_rank_archives"
  ADD CONSTRAINT "website_top_rank_archives_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "website_top_rank_archives"
  ADD CONSTRAINT "website_top_rank_archives_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
