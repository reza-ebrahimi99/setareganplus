-- Visual Page Builder Phase 1: pages, sections, section media links

CREATE TYPE "WebsitePageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "WebsiteSectionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED');

CREATE TABLE "website_pages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "website_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_pages_organizationId_slug_key"
  ON "website_pages"("organizationId", "slug");

CREATE INDEX "website_pages_organizationId_status_deletedAt_idx"
  ON "website_pages"("organizationId", "status", "deletedAt");

ALTER TABLE "website_pages"
  ADD CONSTRAINT "website_pages_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "website_page_sections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WebsiteSectionStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "website_page_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "website_page_sections_organizationId_pageId_deletedAt_status_sortOrder_idx"
  ON "website_page_sections"("organizationId", "pageId", "deletedAt", "status", "sortOrder");

CREATE INDEX "website_page_sections_pageId_deletedAt_sortOrder_idx"
  ON "website_page_sections"("pageId", "deletedAt", "sortOrder");

ALTER TABLE "website_page_sections"
  ADD CONSTRAINT "website_page_sections_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "website_page_sections"
  ADD CONSTRAINT "website_page_sections_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "website_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "website_page_section_media" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "website_page_section_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_page_section_media_sectionId_role_sortOrder_key"
  ON "website_page_section_media"("sectionId", "role", "sortOrder");

CREATE INDEX "website_page_section_media_mediaId_idx"
  ON "website_page_section_media"("mediaId");

CREATE INDEX "website_page_section_media_organizationId_mediaId_idx"
  ON "website_page_section_media"("organizationId", "mediaId");

CREATE INDEX "website_page_section_media_sectionId_sortOrder_idx"
  ON "website_page_section_media"("sectionId", "sortOrder");

ALTER TABLE "website_page_section_media"
  ADD CONSTRAINT "website_page_section_media_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "website_page_section_media"
  ADD CONSTRAINT "website_page_section_media_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "website_page_sections"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "website_page_section_media"
  ADD CONSTRAINT "website_page_section_media_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
