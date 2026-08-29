-- Institute website Achievement CMS (linked to Student profiles)

CREATE TABLE "achievement_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "achievement_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "achievementDate" TIMESTAMP(3),
    "schoolYear" TEXT,
    "issuer" TEXT,
    "level" TEXT,
    "place" TEXT,
    "score" TEXT,
    "certificateMediaId" TEXT,
    "coverMediaId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredPriority" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "achievement_categories_organizationId_slug_key" ON "achievement_categories"("organizationId", "slug");
CREATE UNIQUE INDEX "achievement_categories_organizationId_id_key" ON "achievement_categories"("organizationId", "id");
CREATE INDEX "achievement_categories_organizationId_displayOrder_idx" ON "achievement_categories"("organizationId", "displayOrder");
CREATE INDEX "achievement_categories_organizationId_isActive_deletedAt_idx" ON "achievement_categories"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "achievements_organizationId_slug_key" ON "achievements"("organizationId", "slug");
CREATE UNIQUE INDEX "achievements_organizationId_id_key" ON "achievements"("organizationId", "id");
CREATE INDEX "achievements_organizationId_studentId_achievementDate_idx" ON "achievements"("organizationId", "studentId", "achievementDate");
CREATE INDEX "achievements_organizationId_categoryId_displayOrder_idx" ON "achievements"("organizationId", "categoryId", "displayOrder");
CREATE INDEX "achievements_organizationId_isFeatured_featuredPriority_idx" ON "achievements"("organizationId", "isFeatured", "featuredPriority");
CREATE INDEX "achievements_organizationId_isPublished_deletedAt_idx" ON "achievements"("organizationId", "isPublished", "deletedAt");
CREATE INDEX "achievements_organizationId_schoolYear_idx" ON "achievements"("organizationId", "schoolYear");
CREATE INDEX "achievements_organizationId_isPublished_archivedAt_deletedAt_achievementDate_idx" ON "achievements"("organizationId", "isPublished", "archivedAt", "deletedAt", "achievementDate");

ALTER TABLE "achievement_categories" ADD CONSTRAINT "achievement_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "achievements" ADD CONSTRAINT "achievements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "achievements" ADD CONSTRAINT "achievements_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "achievements" ADD CONSTRAINT "achievements_organizationId_categoryId_fkey" FOREIGN KEY ("organizationId", "categoryId") REFERENCES "achievement_categories"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "achievements" ADD CONSTRAINT "achievements_certificateMediaId_fkey" FOREIGN KEY ("certificateMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "achievements" ADD CONSTRAINT "achievements_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
