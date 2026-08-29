-- Media Library + Gallery CMS (extends MediaAsset; adds albums, items, placements)

CREATE TYPE "MediaAssetStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "media_assets"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "MediaAssetStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS "media_assets_organizationId_status_deletedAt_idx"
  ON "media_assets"("organizationId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "media_assets_organizationId_category_idx"
  ON "media_assets"("organizationId", "category");

CREATE TABLE IF NOT EXISTS "gallery_albums" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "coverMediaId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gallery_albums_organizationId_slug_key"
  ON "gallery_albums"("organizationId", "slug");

CREATE INDEX IF NOT EXISTS "gallery_albums_organizationId_deletedAt_isActive_sortOrder_idx"
  ON "gallery_albums"("organizationId", "deletedAt", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "gallery_albums_organizationId_publishedAt_idx"
  ON "gallery_albums"("organizationId", "publishedAt");

CREATE INDEX IF NOT EXISTS "gallery_albums_coverMediaId_idx"
  ON "gallery_albums"("coverMediaId");

CREATE TABLE IF NOT EXISTS "gallery_album_items" (
  "id" TEXT NOT NULL,
  "albumId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "caption" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gallery_album_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gallery_album_items_albumId_mediaId_key"
  ON "gallery_album_items"("albumId", "mediaId");

CREATE INDEX IF NOT EXISTS "gallery_album_items_albumId_sortOrder_idx"
  ON "gallery_album_items"("albumId", "sortOrder");

CREATE INDEX IF NOT EXISTS "gallery_album_items_mediaId_idx"
  ON "gallery_album_items"("mediaId");

CREATE TABLE IF NOT EXISTS "media_placements" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "placementKey" TEXT NOT NULL,
  "mediaId" TEXT,
  "albumId" TEXT,
  "titleOverride" TEXT,
  "descriptionOverride" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "media_placements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "media_placements_organizationId_placementKey_deletedAt_isActive_sortOrder_idx"
  ON "media_placements"("organizationId", "placementKey", "deletedAt", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "media_placements_mediaId_idx"
  ON "media_placements"("mediaId");

CREATE INDEX IF NOT EXISTS "media_placements_albumId_idx"
  ON "media_placements"("albumId");

-- Exactly one of mediaId / albumId must be set.
-- Schedule: both NULL, only startAt, only endAt, or both with endAt > startAt.
ALTER TABLE "media_placements"
  DROP CONSTRAINT IF EXISTS "media_placements_target_xor_check";

ALTER TABLE "media_placements"
  ADD CONSTRAINT "media_placements_target_xor_check"
  CHECK (
    ("mediaId" IS NOT NULL AND "albumId" IS NULL)
    OR ("mediaId" IS NULL AND "albumId" IS NOT NULL)
  );

ALTER TABLE "media_placements"
  DROP CONSTRAINT IF EXISTS "media_placements_schedule_check";

ALTER TABLE "media_placements"
  ADD CONSTRAINT "media_placements_schedule_check"
  CHECK (
    "startAt" IS NULL
    OR "endAt" IS NULL
    OR "endAt" > "startAt"
  );

ALTER TABLE "gallery_albums"
  ADD CONSTRAINT "gallery_albums_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gallery_albums"
  ADD CONSTRAINT "gallery_albums_coverMediaId_fkey"
  FOREIGN KEY ("coverMediaId") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gallery_album_items"
  ADD CONSTRAINT "gallery_album_items_albumId_fkey"
  FOREIGN KEY ("albumId") REFERENCES "gallery_albums"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gallery_album_items"
  ADD CONSTRAINT "gallery_album_items_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "media_placements"
  ADD CONSTRAINT "media_placements_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "media_placements"
  ADD CONSTRAINT "media_placements_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "media_placements"
  ADD CONSTRAINT "media_placements_albumId_fkey"
  FOREIGN KEY ("albumId") REFERENCES "gallery_albums"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
