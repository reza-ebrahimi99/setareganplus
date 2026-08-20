-- Booklet Operations Center v3
-- Additive: QR token, production timestamp, VIP flag, optional pickup signature.
-- Priority, health, and delay remain computed (not stored).

ALTER TABLE "commerce_orders"
  ADD COLUMN IF NOT EXISTS "qrToken" TEXT,
  ADD COLUMN IF NOT EXISTS "inProductionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opsVip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pickupSignedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "pickupSignedAt" TIMESTAMP(3);

UPDATE "commerce_orders"
SET "qrToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "qrToken" IS NULL OR btrim("qrToken") = '';

UPDATE "commerce_orders" o
SET "inProductionAt" = src."occurredAt"
FROM (
  SELECT DISTINCT ON ("orderId")
    "orderId",
    "occurredAt"
  FROM "commerce_order_events"
  WHERE "stage" = 'IN_PRODUCTION'
  ORDER BY "orderId", "occurredAt" ASC
) src
WHERE o.id = src."orderId"
  AND o."inProductionAt" IS NULL;

UPDATE "commerce_orders"
SET "inProductionAt" = COALESCE("inProductionAt", "readyForPickupAt", "updatedAt")
WHERE "opsStage" IN ('IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED_TO_STUDENT')
  AND "inProductionAt" IS NULL;

ALTER TABLE "commerce_orders"
  ALTER COLUMN "qrToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_qrToken_key"
  ON "commerce_orders"("qrToken");

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_inProductionAt_idx"
  ON "commerce_orders"("organizationId", "inProductionAt");

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_readyForPickupAt_idx"
  ON "commerce_orders"("organizationId", "readyForPickupAt");
