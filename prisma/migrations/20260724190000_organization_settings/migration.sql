-- Registration v1.0: Organization.settings for configurable CRM stage mapping
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "settings" JSONB;
