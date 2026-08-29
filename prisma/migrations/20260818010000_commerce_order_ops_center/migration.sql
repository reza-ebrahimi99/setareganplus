-- Commerce Order Operations Center
-- Additive: ops pipeline, timeline events, branch accent color.
-- No destructive changes. Existing payment/fulfillment columns remain.

DO $$ BEGIN
  CREATE TYPE "CommerceOpsStage" AS ENUM (
    'REGISTERED',
    'PAID',
    'IN_PRODUCTION',
    'READY_FOR_PICKUP',
    'DELIVERED_TO_STUDENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommerceOrderEventType" AS ENUM (
    'STAGE_CHANGED',
    'NOTE_ADDED',
    'BRANCH_ASSIGNED',
    'ROLLBACK',
    'EDITED',
    'SYSTEM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "accentColor" TEXT;

ALTER TABLE "commerce_orders"
  ADD COLUMN IF NOT EXISTS "opsStage" "CommerceOpsStage" NOT NULL DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS "readyForPickupAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readyForPickupByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryNote" TEXT;

CREATE INDEX IF NOT EXISTS "commerce_orders_organizationId_opsStage_createdAt_idx"
  ON "commerce_orders"("organizationId", "opsStage", "createdAt");

CREATE INDEX IF NOT EXISTS "commerce_orders_readyForPickupByUserId_idx"
  ON "commerce_orders"("readyForPickupByUserId");

DO $$ BEGIN
  ALTER TABLE "commerce_orders"
    ADD CONSTRAINT "commerce_orders_readyForPickupByUserId_fkey"
    FOREIGN KEY ("readyForPickupByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill operational stage from existing payment/fulfillment (non-destructive).
UPDATE "commerce_orders"
SET "opsStage" = 'DELIVERED_TO_STUDENT'
WHERE "status" = 'COMPLETED'
   OR "fulfillmentStatus" = 'DELIVERED';

UPDATE "commerce_orders"
SET "opsStage" = 'IN_PRODUCTION'
WHERE "status" = 'FULFILLING'
  AND "opsStage" = 'REGISTERED';

UPDATE "commerce_orders"
SET "opsStage" = 'READY_FOR_PICKUP'
WHERE "paymentStatus" = 'PAID'
  AND "fulfillmentStatus" = 'AWAITING_PICKUP'
  AND "opsStage" = 'REGISTERED';

UPDATE "commerce_orders"
SET "opsStage" = 'PAID'
WHERE "paymentStatus" = 'PAID'
  AND "opsStage" = 'REGISTERED';

UPDATE "commerce_orders"
SET "readyForPickupAt" = COALESCE("readyForPickupAt", "updatedAt")
WHERE "opsStage" IN ('READY_FOR_PICKUP', 'DELIVERED_TO_STUDENT')
  AND "readyForPickupAt" IS NULL
  AND "paymentStatus" = 'PAID';

CREATE TABLE IF NOT EXISTS "commerce_order_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "eventType" "CommerceOrderEventType" NOT NULL,
  "stage" "CommerceOpsStage",
  "title" TEXT NOT NULL,
  "note" TEXT,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "commerce_order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commerce_order_events_organizationId_orderId_occurredAt_idx"
  ON "commerce_order_events"("organizationId", "orderId", "occurredAt");

CREATE INDEX IF NOT EXISTS "commerce_order_events_organizationId_eventType_occurredAt_idx"
  ON "commerce_order_events"("organizationId", "eventType", "occurredAt");

CREATE INDEX IF NOT EXISTS "commerce_order_events_actorUserId_idx"
  ON "commerce_order_events"("actorUserId");

DO $$ BEGIN
  ALTER TABLE "commerce_order_events"
    ADD CONSTRAINT "commerce_order_events_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "commerce_order_events"
    ADD CONSTRAINT "commerce_order_events_organizationId_orderId_fkey"
    FOREIGN KEY ("organizationId", "orderId") REFERENCES "commerce_orders"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "commerce_order_events"
    ADD CONSTRAINT "commerce_order_events_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Timeline backfill (idempotent: only when an order has no events yet).
INSERT INTO "commerce_order_events" (
  "id", "organizationId", "orderId", "eventType", "stage", "title", "occurredAt", "createdAt"
)
SELECT
  'coe_reg_' || o."id",
  o."organizationId",
  o."id",
  'STAGE_CHANGED',
  'REGISTERED',
  'سفارش ایجاد شد',
  o."createdAt",
  o."createdAt"
FROM "commerce_orders" o
WHERE NOT EXISTS (
  SELECT 1 FROM "commerce_order_events" e WHERE e."orderId" = o."id"
);

INSERT INTO "commerce_order_events" (
  "id", "organizationId", "orderId", "eventType", "stage", "title", "occurredAt", "createdAt"
)
SELECT
  'coe_paid_' || o."id",
  o."organizationId",
  o."id",
  'STAGE_CHANGED',
  'PAID',
  'پرداخت ثبت شد',
  o."updatedAt",
  o."updatedAt"
FROM "commerce_orders" o
WHERE o."opsStage" IN ('PAID', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED_TO_STUDENT')
  AND NOT EXISTS (
    SELECT 1 FROM "commerce_order_events" e
    WHERE e."orderId" = o."id" AND e."stage" = 'PAID'
  );

INSERT INTO "commerce_order_events" (
  "id", "organizationId", "orderId", "eventType", "stage", "title", "occurredAt", "createdAt"
)
SELECT
  'coe_prod_' || o."id",
  o."organizationId",
  o."id",
  'STAGE_CHANGED',
  'IN_PRODUCTION',
  'ورود به تولید',
  o."updatedAt",
  o."updatedAt"
FROM "commerce_orders" o
WHERE o."opsStage" IN ('IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED_TO_STUDENT')
  AND NOT EXISTS (
    SELECT 1 FROM "commerce_order_events" e
    WHERE e."orderId" = o."id" AND e."stage" = 'IN_PRODUCTION'
  );

INSERT INTO "commerce_order_events" (
  "id", "organizationId", "orderId", "eventType", "stage", "title", "occurredAt", "createdAt"
)
SELECT
  'coe_ready_' || o."id",
  o."organizationId",
  o."id",
  'STAGE_CHANGED',
  'READY_FOR_PICKUP',
  'تحویل به مسئول کتاب',
  COALESCE(o."readyForPickupAt", o."updatedAt"),
  COALESCE(o."readyForPickupAt", o."updatedAt")
FROM "commerce_orders" o
WHERE o."opsStage" IN ('READY_FOR_PICKUP', 'DELIVERED_TO_STUDENT')
  AND NOT EXISTS (
    SELECT 1 FROM "commerce_order_events" e
    WHERE e."orderId" = o."id" AND e."stage" = 'READY_FOR_PICKUP'
  );

INSERT INTO "commerce_order_events" (
  "id", "organizationId", "orderId", "eventType", "stage", "title", "note", "actorUserId", "occurredAt", "createdAt"
)
SELECT
  'coe_deliv_' || o."id",
  o."organizationId",
  o."id",
  'STAGE_CHANGED',
  'DELIVERED_TO_STUDENT',
  'تحویل انجام شد',
  o."deliveryNote",
  o."deliveredByUserId",
  COALESCE(o."deliveredAt", o."updatedAt"),
  COALESCE(o."deliveredAt", o."updatedAt")
FROM "commerce_orders" o
WHERE o."opsStage" = 'DELIVERED_TO_STUDENT'
  AND NOT EXISTS (
    SELECT 1 FROM "commerce_order_events" e
    WHERE e."orderId" = o."id" AND e."stage" = 'DELIVERED_TO_STUDENT'
  );

-- Optional presentation color for existing named branches (data only; UI never keys off gender).
UPDATE "branches"
SET "accentColor" = '#7c3aed'
WHERE "accentColor" IS NULL AND "name" = 'شعبه دختران';

UPDATE "branches"
SET "accentColor" = '#2563eb'
WHERE "accentColor" IS NULL AND "name" = 'شعبه پسران';

-- Existing orders: inherit catalog item branch when present.
UPDATE "commerce_orders" o
SET "branchId" = sub."branchId"
FROM (
  SELECT DISTINCT ON (oi."orderId")
    oi."orderId",
    i."branchId"
  FROM "commerce_order_items" oi
  INNER JOIN "commerce_items" i
    ON i."id" = oi."itemId"
   AND i."organizationId" = oi."organizationId"
  WHERE i."branchId" IS NOT NULL
  ORDER BY oi."orderId", oi."createdAt" ASC
) sub
WHERE o."id" = sub."orderId"
  AND o."branchId" IS NULL;

-- Remaining orders: first active branch of the same organization (scalable default).
UPDATE "commerce_orders" o
SET "branchId" = b."id"
FROM (
  SELECT DISTINCT ON (br."organizationId")
    br."id",
    br."organizationId"
  FROM "branches" br
  WHERE br."deletedAt" IS NULL
    AND br."isActive" = true
  ORDER BY br."organizationId", br."createdAt" ASC
) b
WHERE o."organizationId" = b."organizationId"
  AND o."branchId" IS NULL;
