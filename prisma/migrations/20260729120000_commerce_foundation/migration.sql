-- Additive: Commerce Foundation + Payment payable polymorphism
-- Safe for existing Registration payment rows (backfill + nullable registrationId).

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "PaymentPayableType" AS ENUM (
  'REGISTRATION',
  'COMMERCE_ORDER',
  'BOOKING',
  'TUITION',
  'INSTALLMENT'
);

CREATE TYPE "CommerceSystemKind" AS ENUM (
  'PHYSICAL',
  'DIGITAL',
  'COURSE',
  'EVENT',
  'EXAM',
  'CONSULTING',
  'SERVICE',
  'CUSTOM'
);

CREATE TYPE "CommerceItemStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'ARCHIVED'
);

CREATE TYPE "CommerceOrderStatus" AS ENUM (
  'DRAFT',
  'AWAITING_PAYMENT',
  'PAID',
  'FULFILLING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "CommerceOrderPaymentStatus" AS ENUM (
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIAL'
);

-- ─── PaymentIntent polymorphism (additive, backward-compatible) ──────────────

ALTER TABLE "payment_intents" ADD COLUMN "payableType" "PaymentPayableType";
ALTER TABLE "payment_intents" ADD COLUMN "payableId" TEXT;

UPDATE "payment_intents"
SET
  "payableType" = 'REGISTRATION',
  "payableId" = "registrationId"
WHERE "payableType" IS NULL;

ALTER TABLE "payment_intents" ALTER COLUMN "payableType" SET NOT NULL;
ALTER TABLE "payment_intents" ALTER COLUMN "payableId" SET NOT NULL;

ALTER TABLE "payment_intents" DROP CONSTRAINT "payment_intents_organizationId_registrationId_fkey";
ALTER TABLE "payment_intents" ALTER COLUMN "registrationId" DROP NOT NULL;
ALTER TABLE "payment_intents"
  ADD CONSTRAINT "payment_intents_organizationId_registrationId_fkey"
  FOREIGN KEY ("organizationId", "registrationId")
  REFERENCES "registrations"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_intents"
  ADD CONSTRAINT "payment_intents_payable_target_check"
  CHECK (
    (
      "payableType" = 'REGISTRATION'
      AND "registrationId" IS NOT NULL
      AND "payableId" = "registrationId"
    )
    OR (
      "payableType" <> 'REGISTRATION'
      AND "registrationId" IS NULL
      AND "payableId" IS NOT NULL
      AND length("payableId") > 0
    )
  );

CREATE INDEX "payment_intents_organizationId_payableType_payableId_status_idx"
  ON "payment_intents"("organizationId", "payableType", "payableId", "status");

-- ─── Commerce tables ─────────────────────────────────────────────────────────

CREATE TABLE "commerce_categories" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "parentId" TEXT,
  "seedKey" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "icon" TEXT,
  "color" TEXT,
  "imageAssetId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "commerce_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce_business_types" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "commerce_business_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce_items" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "status" "CommerceItemStatus" NOT NULL DEFAULT 'DRAFT',
  "systemKind" "CommerceSystemKind" NOT NULL DEFAULT 'CUSTOM',
  "businessTypeId" TEXT,
  "basePriceRials" INTEGER NOT NULL DEFAULT 0,
  "salePriceRials" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'IRR',
  "priceStartsAt" TIMESTAMP(3),
  "priceEndsAt" TIMESTAMP(3),
  "primaryImageAssetId" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "trackInventory" BOOLEAN NOT NULL DEFAULT false,
  "stockQuantity" INTEGER,
  "unlimitedStock" BOOLEAN NOT NULL DEFAULT true,
  "requiresShipping" BOOLEAN NOT NULL DEFAULT false,
  "grantsDigitalAccess" BOOLEAN NOT NULL DEFAULT false,
  "requiresScheduling" BOOLEAN NOT NULL DEFAULT false,
  "requiresEnrollment" BOOLEAN NOT NULL DEFAULT false,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "commerce_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce_item_categories" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commerce_item_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce_orders" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "orderNumber" TEXT NOT NULL,
  "status" "CommerceOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "paymentStatus" "CommerceOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "buyerName" TEXT,
  "buyerMobile" TEXT,
  "buyerEmail" TEXT,
  "buyerNationalCode" TEXT,
  "leadId" TEXT,
  "subtotalRials" INTEGER NOT NULL DEFAULT 0,
  "discountRials" INTEGER NOT NULL DEFAULT 0,
  "taxRials" INTEGER NOT NULL DEFAULT 0,
  "shippingRials" INTEGER NOT NULL DEFAULT 0,
  "grandTotalRials" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IRR',
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commerce_order_items" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "itemId" TEXT,
  "titleSnapshot" TEXT NOT NULL,
  "skuSnapshot" TEXT,
  "systemKindSnapshot" "CommerceSystemKind" NOT NULL,
  "unitPriceRials" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "discountRials" INTEGER NOT NULL DEFAULT 0,
  "totalRials" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id")
);

-- Unique / indexes
CREATE UNIQUE INDEX "commerce_categories_organizationId_slug_key" ON "commerce_categories"("organizationId", "slug");
CREATE UNIQUE INDEX "commerce_categories_organizationId_id_key" ON "commerce_categories"("organizationId", "id");
CREATE UNIQUE INDEX "commerce_categories_organizationId_seedKey_key" ON "commerce_categories"("organizationId", "seedKey");
CREATE INDEX "commerce_categories_organizationId_parentId_sortOrder_idx" ON "commerce_categories"("organizationId", "parentId", "sortOrder");
CREATE INDEX "commerce_categories_organizationId_isActive_isVisible_deletedAt_idx" ON "commerce_categories"("organizationId", "isActive", "isVisible", "deletedAt");
CREATE INDEX "commerce_categories_organizationId_branchId_idx" ON "commerce_categories"("organizationId", "branchId");
CREATE INDEX "commerce_categories_imageAssetId_idx" ON "commerce_categories"("imageAssetId");

CREATE UNIQUE INDEX "commerce_business_types_organizationId_slug_key" ON "commerce_business_types"("organizationId", "slug");
CREATE UNIQUE INDEX "commerce_business_types_organizationId_id_key" ON "commerce_business_types"("organizationId", "id");
CREATE INDEX "commerce_business_types_organizationId_isActive_deletedAt_sortOrder_idx" ON "commerce_business_types"("organizationId", "isActive", "deletedAt", "sortOrder");

CREATE UNIQUE INDEX "commerce_items_organizationId_slug_key" ON "commerce_items"("organizationId", "slug");
CREATE UNIQUE INDEX "commerce_items_organizationId_id_key" ON "commerce_items"("organizationId", "id");
CREATE INDEX "commerce_items_organizationId_status_deletedAt_idx" ON "commerce_items"("organizationId", "status", "deletedAt");
CREATE INDEX "commerce_items_organizationId_systemKind_deletedAt_idx" ON "commerce_items"("organizationId", "systemKind", "deletedAt");
CREATE INDEX "commerce_items_organizationId_businessTypeId_idx" ON "commerce_items"("organizationId", "businessTypeId");
CREATE INDEX "commerce_items_organizationId_branchId_idx" ON "commerce_items"("organizationId", "branchId");
CREATE INDEX "commerce_items_organizationId_isFeatured_sortOrder_idx" ON "commerce_items"("organizationId", "isFeatured", "sortOrder");
CREATE INDEX "commerce_items_organizationId_sku_idx" ON "commerce_items"("organizationId", "sku");
CREATE INDEX "commerce_items_primaryImageAssetId_idx" ON "commerce_items"("primaryImageAssetId");

CREATE UNIQUE INDEX "commerce_item_categories_itemId_categoryId_key" ON "commerce_item_categories"("itemId", "categoryId");
CREATE UNIQUE INDEX "commerce_item_categories_organizationId_id_key" ON "commerce_item_categories"("organizationId", "id");
CREATE INDEX "commerce_item_categories_organizationId_categoryId_sortOrder_idx" ON "commerce_item_categories"("organizationId", "categoryId", "sortOrder");
CREATE INDEX "commerce_item_categories_organizationId_itemId_idx" ON "commerce_item_categories"("organizationId", "itemId");

CREATE UNIQUE INDEX "commerce_orders_organizationId_orderNumber_key" ON "commerce_orders"("organizationId", "orderNumber");
CREATE UNIQUE INDEX "commerce_orders_organizationId_id_key" ON "commerce_orders"("organizationId", "id");
CREATE INDEX "commerce_orders_organizationId_status_createdAt_idx" ON "commerce_orders"("organizationId", "status", "createdAt");
CREATE INDEX "commerce_orders_organizationId_paymentStatus_createdAt_idx" ON "commerce_orders"("organizationId", "paymentStatus", "createdAt");
CREATE INDEX "commerce_orders_organizationId_branchId_idx" ON "commerce_orders"("organizationId", "branchId");
CREATE INDEX "commerce_orders_organizationId_leadId_idx" ON "commerce_orders"("organizationId", "leadId");
CREATE INDEX "commerce_orders_organizationId_buyerMobile_idx" ON "commerce_orders"("organizationId", "buyerMobile");

CREATE UNIQUE INDEX "commerce_order_items_organizationId_id_key" ON "commerce_order_items"("organizationId", "id");
CREATE INDEX "commerce_order_items_organizationId_orderId_idx" ON "commerce_order_items"("organizationId", "orderId");
CREATE INDEX "commerce_order_items_organizationId_itemId_idx" ON "commerce_order_items"("organizationId", "itemId");

-- Foreign keys
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_organizationId_parentId_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "commerce_categories"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_categories" ADD CONSTRAINT "commerce_categories_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commerce_business_types" ADD CONSTRAINT "commerce_business_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_organizationId_businessTypeId_fkey" FOREIGN KEY ("organizationId", "businessTypeId") REFERENCES "commerce_business_types"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_primaryImageAssetId_fkey" FOREIGN KEY ("primaryImageAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commerce_item_categories" ADD CONSTRAINT "commerce_item_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_item_categories" ADD CONSTRAINT "commerce_item_categories_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "commerce_items"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_item_categories" ADD CONSTRAINT "commerce_item_categories_organizationId_categoryId_fkey" FOREIGN KEY ("organizationId", "categoryId") REFERENCES "commerce_categories"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_organizationId_leadId_fkey" FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_organizationId_orderId_fkey" FOREIGN KEY ("organizationId", "orderId") REFERENCES "commerce_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "commerce_items"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Idempotent category seed (per organization; editable afterward) ─────────
-- Parent rows first, then children via seedKey parent lookup.

INSERT INTO "commerce_categories" (
  "id", "organizationId", "parentId", "seedKey", "title", "slug", "description",
  "sortOrder", "isActive", "isVisible", "isFeatured", "createdAt", "updatedAt"
)
SELECT
  md5(o."id" || ':commerce-cat:' || defaults.seed_key),
  o."id",
  NULL,
  defaults.seed_key,
  defaults.title,
  defaults.slug,
  '',
  defaults.sort_order,
  true,
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" AS o
CROSS JOIN (
  VALUES
    ('books', 'جزوات و کتاب‌ها', 'jozveh-va-ketabha', 10),
    ('courses', 'دوره‌های آموزشی', 'dorehaye-amoozeshi', 20),
    ('exams', 'آزمون', 'azmoon', 30),
    ('events', 'رویدادها و همایش‌ها', 'roydadha-va-hamayeshha', 40),
    ('consulting', 'مشاوره تحصیلی', 'moshavere-tahsili', 50),
    ('other', 'سایر', 'sayer', 60)
) AS defaults(seed_key, title, slug, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM "commerce_categories" AS c
  WHERE c."organizationId" = o."id"
    AND c."seedKey" = defaults.seed_key
);

INSERT INTO "commerce_categories" (
  "id", "organizationId", "parentId", "seedKey", "title", "slug", "description",
  "sortOrder", "isActive", "isVisible", "isFeatured", "createdAt", "updatedAt"
)
SELECT
  md5(o."id" || ':commerce-cat:' || defaults.seed_key),
  o."id",
  parent."id",
  defaults.seed_key,
  defaults.title,
  defaults.slug,
  '',
  defaults.sort_order,
  true,
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" AS o
CROSS JOIN (
  VALUES
    ('courses-inperson', 'courses', 'حضوری', 'hozouri', 21),
    ('courses-online', 'courses', 'آنلاین', 'online', 22)
) AS defaults(seed_key, parent_seed_key, title, slug, sort_order)
INNER JOIN "commerce_categories" AS parent
  ON parent."organizationId" = o."id"
 AND parent."seedKey" = defaults.parent_seed_key
 AND parent."deletedAt" IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM "commerce_categories" AS c
  WHERE c."organizationId" = o."id"
    AND c."seedKey" = defaults.seed_key
);
