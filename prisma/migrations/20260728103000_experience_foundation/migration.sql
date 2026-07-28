-- Flow Experience Builder — foundation (Sprint A Checkpoint 1)
-- Versioned experiences + blocks for registration flow landing (and future purposes).

CREATE TYPE "ExperienceOwnerType" AS ENUM ('REGISTRATION_FLOW', 'WEBSITE_PAGE', 'STANDALONE');
CREATE TYPE "ExperiencePurpose" AS ENUM (
  'LANDING',
  'SUCCESS',
  'PAYMENT_PENDING',
  'WAITING_APPROVAL',
  'DOWNLOAD',
  'BOOKING',
  'CUSTOM'
);
CREATE TYPE "ExperienceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ExperienceVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "ExperienceBlockStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED');

CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerType" "ExperienceOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "purpose" "ExperiencePurpose" NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "title" TEXT NOT NULL,
    "templateKey" TEXT,
    "status" "ExperienceStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experiences_organizationId_id_key"
  ON "experiences"("organizationId", "id");

CREATE UNIQUE INDEX "experiences_organization_owner_purpose_key_live_key"
  ON "experiences" ("organizationId", "ownerType", "ownerId", "purpose", "key")
  WHERE "deletedAt" IS NULL;

CREATE INDEX "experiences_organizationId_ownerType_ownerId_purpose_deletedAt_idx"
  ON "experiences"("organizationId", "ownerType", "ownerId", "purpose", "deletedAt");

CREATE INDEX "experiences_organizationId_status_deletedAt_idx"
  ON "experiences"("organizationId", "status", "deletedAt");

CREATE INDEX "experiences_organizationId_publishedVersionId_idx"
  ON "experiences"("organizationId", "publishedVersionId");

ALTER TABLE "experiences"
  ADD CONSTRAINT "experiences_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "ExperienceVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImageMediaId" TEXT,
    "themeOverride" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_versions_organizationId_id_key"
  ON "experience_versions"("organizationId", "id");

CREATE UNIQUE INDEX "experience_versions_organizationId_experienceId_versionNumber_key"
  ON "experience_versions"("organizationId", "experienceId", "versionNumber");

CREATE INDEX "experience_versions_organizationId_experienceId_status_idx"
  ON "experience_versions"("organizationId", "experienceId", "status");

CREATE INDEX "experience_versions_seoImageMediaId_idx"
  ON "experience_versions"("seoImageMediaId");

ALTER TABLE "experience_versions"
  ADD CONSTRAINT "experience_versions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_versions"
  ADD CONSTRAINT "experience_versions_organizationId_experienceId_fkey"
  FOREIGN KEY ("organizationId", "experienceId") REFERENCES "experiences"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_versions"
  ADD CONSTRAINT "experience_versions_seoImageMediaId_fkey"
  FOREIGN KEY ("seoImageMediaId") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "experiences"
  ADD CONSTRAINT "experiences_organizationId_publishedVersionId_fkey"
  FOREIGN KEY ("organizationId", "publishedVersionId") REFERENCES "experience_versions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "experience_blocks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "experienceVersionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ExperienceBlockStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "visibility" JSONB,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "animation" JSONB,
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "experience_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_blocks_organizationId_id_key"
  ON "experience_blocks"("organizationId", "id");

CREATE INDEX "experience_blocks_organizationId_experienceVersionId_deletedAt_status_sortOrder_idx"
  ON "experience_blocks"("organizationId", "experienceVersionId", "deletedAt", "status", "sortOrder");

CREATE INDEX "experience_blocks_experienceVersionId_deletedAt_sortOrder_idx"
  ON "experience_blocks"("experienceVersionId", "deletedAt", "sortOrder");

ALTER TABLE "experience_blocks"
  ADD CONSTRAINT "experience_blocks_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_blocks"
  ADD CONSTRAINT "experience_blocks_organizationId_experienceVersionId_fkey"
  FOREIGN KEY ("organizationId", "experienceVersionId") REFERENCES "experience_versions"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "experience_block_media" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_block_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_block_media_blockId_role_sortOrder_key"
  ON "experience_block_media"("blockId", "role", "sortOrder");

CREATE INDEX "experience_block_media_mediaId_idx"
  ON "experience_block_media"("mediaId");

CREATE INDEX "experience_block_media_organizationId_mediaId_idx"
  ON "experience_block_media"("organizationId", "mediaId");

CREATE INDEX "experience_block_media_blockId_sortOrder_idx"
  ON "experience_block_media"("blockId", "sortOrder");

ALTER TABLE "experience_block_media"
  ADD CONSTRAINT "experience_block_media_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "experience_block_media"
  ADD CONSTRAINT "experience_block_media_blockId_fkey"
  FOREIGN KEY ("blockId") REFERENCES "experience_blocks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "experience_block_media"
  ADD CONSTRAINT "experience_block_media_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
