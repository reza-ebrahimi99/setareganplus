-- Website marketing cards CMS (homepage Qalamchi section and future sections).
-- No organization-specific seed data.

CREATE TABLE "website_marketing_cards" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "badge" TEXT,
    "imageMediaId" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "website_marketing_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "website_marketing_cards_organizationId_sectionKey_deletedAt_isActive_sortOrder_idx"
  ON "website_marketing_cards"("organizationId", "sectionKey", "deletedAt", "isActive", "sortOrder");

CREATE INDEX "website_marketing_cards_imageMediaId_idx"
  ON "website_marketing_cards"("imageMediaId");

ALTER TABLE "website_marketing_cards"
  ADD CONSTRAINT "website_marketing_cards_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "website_marketing_cards"
  ADD CONSTRAINT "website_marketing_cards_imageMediaId_fkey"
  FOREIGN KEY ("imageMediaId") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
