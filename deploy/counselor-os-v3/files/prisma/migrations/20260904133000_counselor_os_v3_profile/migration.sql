-- Counselor OS v3 — additive counselor profile fields on existing booking_advisors.
-- null capacity = unlimited; 0 = no new assignments without admin override.
-- No DROP / no destructive change.

ALTER TABLE "booking_advisors" ADD COLUMN "title" TEXT;
ALTER TABLE "booking_advisors" ADD COLUMN "specialty" TEXT;
ALTER TABLE "booking_advisors" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "booking_advisors" ADD COLUMN "photoMediaId" TEXT;

CREATE INDEX "bk_adv_photo_idx" ON "booking_advisors"("photoMediaId");

ALTER TABLE "booking_advisors" ADD CONSTRAINT "bk_adv_photo_fk" FOREIGN KEY ("photoMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
