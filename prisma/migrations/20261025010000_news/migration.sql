-- News & announcements (additive only; safe on live DB)

-- CreateTable
CREATE TABLE IF NOT EXISTS "News" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "cover" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ANNOUNCE',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "formSlug" TEXT,
    "productSlug" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "News_published_publishedAt_idx" ON "News"("published", "publishedAt");
