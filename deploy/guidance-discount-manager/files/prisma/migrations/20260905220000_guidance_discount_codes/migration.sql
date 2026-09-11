-- Additive guidance package discount-code manager.
-- Does not alter payment_intents or existing payment history.

CREATE TABLE IF NOT EXISTS "guidance_discount_codes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "packageScope" TEXT NOT NULL DEFAULT 'ALL',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guidance_discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gdc_org_code_uid"
    ON "guidance_discount_codes" ("organizationId", "code");

CREATE INDEX IF NOT EXISTS "gdc_org_active_idx"
    ON "guidance_discount_codes" ("organizationId", "isActive");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gdc_org_fk'
    ) THEN
        ALTER TABLE "guidance_discount_codes"
            ADD CONSTRAINT "gdc_org_fk"
            FOREIGN KEY ("organizationId")
            REFERENCES "organizations"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;
