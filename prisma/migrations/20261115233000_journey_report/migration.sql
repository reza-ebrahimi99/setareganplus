-- Journey consultation report. Additive only.

ALTER TABLE "JourneyRun" ADD COLUMN IF NOT EXISTS "adminNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JourneyAnswer" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
