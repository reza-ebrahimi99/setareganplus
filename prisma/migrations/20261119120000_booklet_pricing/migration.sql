-- Automatic booklet pricing. Existing stored prices and order totals stay put.
-- New columns default so a deploy does not change an old order's amount.

CREATE TABLE IF NOT EXISTS "BookletPricing" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "sheetToman" INTEGER NOT NULL DEFAULT 0,
  "spiralToman" INTEGER NOT NULL DEFAULT 0,
  "colorFirstToman" INTEGER NOT NULL DEFAULT 0,
  "bwFirstToman" INTEGER NOT NULL DEFAULT 0,
  "shippingToman" INTEGER NOT NULL DEFAULT 0,
  "vatPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookletPricing_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BookletPricing" ("id", "sheetToman", "spiralToman", "colorFirstToman", "bwFirstToman", "shippingToman", "vatPercent", "updatedAt")
VALUES ('default', 0, 0, 0, 0, 0, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isSpiral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "firstPageType" TEXT NOT NULL DEFAULT 'bw';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingRials" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vatRials" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vatPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
