-- Achievement cinematic hero placements + responsive cover focus points

ALTER TABLE "achievements"
ADD COLUMN "showInHomepageHero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showInHomepageSlider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showInHomepageTicker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showInAchievementHero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showInAchievementGallery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "heroPublishFrom" TIMESTAMP(3),
ADD COLUMN "heroPublishUntil" TIMESTAMP(3),
ADD COLUMN "desktopFocusX" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "desktopFocusY" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "mobileFocusX" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "mobileFocusY" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- Backfill: previously featured items participate in cinematic surfaces
UPDATE "achievements"
SET
  "showInHomepageHero" = true,
  "showInHomepageSlider" = true,
  "showInHomepageTicker" = true,
  "showInAchievementHero" = true,
  "showInAchievementGallery" = true
WHERE "isFeatured" = true
  AND "deletedAt" IS NULL;

CREATE INDEX "achievements_organizationId_showInHomepageSlider_featuredPriority_idx"
ON "achievements"("organizationId", "showInHomepageSlider", "featuredPriority");

CREATE INDEX "achievements_organizationId_showInHomepageTicker_featuredPriority_idx"
ON "achievements"("organizationId", "showInHomepageTicker", "featuredPriority");

CREATE INDEX "achievements_organizationId_showInAchievementHero_featuredPriority_idx"
ON "achievements"("organizationId", "showInAchievementHero", "featuredPriority");

CREATE INDEX "achievements_organizationId_showInAchievementGallery_featuredPriority_idx"
ON "achievements"("organizationId", "showInAchievementGallery", "featuredPriority");
