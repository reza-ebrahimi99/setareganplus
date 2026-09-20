-- Additive: store purchased guidance add-ons on the plan (no data loss).
ALTER TABLE "guidance_plans"
ADD COLUMN IF NOT EXISTS "guidancePackageAddons" JSONB NOT NULL DEFAULT '[]';
