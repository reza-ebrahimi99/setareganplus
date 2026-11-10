-- Premium series flag. Additive. Existing lessons stay non-premium.

ALTER TABLE "ClassCourse" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClassLesson" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
