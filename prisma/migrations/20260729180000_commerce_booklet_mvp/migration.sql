-- Commerce booklet MVP: catalog attributes + on-site pickup fulfillment.
-- Additive only (safe for Production when applied after commerce_foundation).

-- Enum extensions / new enums
ALTER TYPE "CommerceItemStatus" ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';

DO $$ BEGIN
  CREATE TYPE "CommercePrintType" AS ENUM ('COLOR', 'BLACK_AND_WHITE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceBindingType" AS ENUM ('STAPLED', 'SPIRAL', 'PERFECT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceFormatSize" AS ENUM ('A4', 'A5', 'RAHLI', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceDeliveryMethod" AS ENUM ('PICKUP_ONSITE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceFulfillmentStatus" AS ENUM ('AWAITING_PICKUP', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CommerceItem booklet + visibility columns
ALTER TABLE "commerce_items"
  ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "authors" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "gradeLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "pageCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "editionYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "printType" "CommercePrintType",
  ADD COLUMN IF NOT EXISTS "bindingType" "CommerceBindingType",
  ADD COLUMN IF NOT EXISTS "formatSize" "CommerceFormatSize",
  ADD COLUMN IF NOT EXISTS "features" JSONB;

CREATE INDEX IF NOT EXISTS "commerce_items_organizationId_isVisible_status_deletedAt_idx"
  ON "commerce_items"("organizationId", "isVisible", "status", "deletedAt");

-- CommerceOrder pickup fulfillment
ALTER TABLE "commerce_orders"
  ADD COLUMN IF NOT EXISTS "deliveryMethod" "CommerceDeliveryMethod" NOT NULL DEFAULT 'PICKUP_ONSITE',
  ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "CommerceFulfillmentStatus",
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_fulfillmentStatus_createdAt_idx"
  ON "commerce_orders"("organizationId", "fulfillmentStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "commerce_orders_deliveredByUserId_idx"
  ON "commerce_orders"("deliveredByUserId");

DO $$ BEGIN
  ALTER TABLE "commerce_orders"
    ADD CONSTRAINT "commerce_orders_deliveredByUserId_fkey"
    FOREIGN KEY ("deliveredByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
