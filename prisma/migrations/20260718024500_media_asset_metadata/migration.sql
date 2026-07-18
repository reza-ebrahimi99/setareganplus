-- Structured media metadata (team portrait variants, etc.)
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
