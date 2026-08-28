-- Phase 2: safely use enum values committed in 20260724023000_add_registration_product_types.
-- Also creates Product & Service Flow foundation tables.

CREATE TYPE "RegistrationFlowFulfillmentMode" AS ENUM (
  'NONE',
  'PICKUP_AT_SCHOOL',
  'COURIER',
  'CLASSROOM_DELIVERY',
  'DIGITAL_DOWNLOAD'
);

CREATE TYPE "RegistrationFlowInventoryMode" AS ENUM (
  'UNLIMITED',
  'TRACKED'
);

CREATE TYPE "RegistrationFlowVariantKind" AS ENUM (
  'SIZE',
  'COLOR',
  'GRADE',
  'PACKAGE',
  'EDITION',
  'GENDER',
  'CUSTOM'
);

ALTER TABLE "registration_flows"
  ADD COLUMN IF NOT EXISTS "fulfillmentMode" "RegistrationFlowFulfillmentMode" NOT NULL DEFAULT 'NONE';

-- Uses enum values added + committed in the previous migration.
ALTER TABLE "registration_flows"
  ALTER COLUMN "productType" SET DEFAULT 'SCHOOL_REGISTRATION'::"RegistrationProductType";

ALTER TABLE "registration_flows"
  ALTER COLUMN "paymentMode" SET DEFAULT 'FIXED_PRICE'::"RegistrationFlowPaymentMode";

CREATE INDEX IF NOT EXISTS "registration_flows_organizationId_productType_deletedAt_idx"
  ON "registration_flows"("organizationId", "productType", "deletedAt");

ALTER TABLE "registration_flow_document_requirements"
  ADD COLUMN IF NOT EXISTS "maxFiles" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "registration_flow_document_requirements"
  ALTER COLUMN "acceptedMimeTypes" SET DEFAULT 'image/jpeg,image/png,image/webp,application/pdf';

CREATE TABLE IF NOT EXISTS "registration_flow_gallery_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_flow_gallery_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "registration_flow_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageMediaId" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "basePriceRials" INTEGER NOT NULL DEFAULT 0,
    "discountRials" INTEGER NOT NULL DEFAULT 0,
    "taxRials" INTEGER NOT NULL DEFAULT 0,
    "depositRials" INTEGER NOT NULL DEFAULT 0,
    "inventoryMode" "RegistrationFlowInventoryMode" NOT NULL DEFAULT 'UNLIMITED',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "registration_flow_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "registration_flow_item_variants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "RegistrationFlowVariantKind" NOT NULL DEFAULT 'CUSTOM',
    "label" TEXT NOT NULL,
    "valueKey" TEXT NOT NULL,
    "sku" TEXT,
    "priceDeltaRials" INTEGER NOT NULL DEFAULT 0,
    "inventoryMode" "RegistrationFlowInventoryMode" NOT NULL DEFAULT 'UNLIMITED',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "registration_flow_item_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "registration_flow_gallery_items_organizationId_id_key"
  ON "registration_flow_gallery_items"("organizationId", "id");
CREATE INDEX IF NOT EXISTS "registration_flow_gallery_items_organizationId_flowId_sortOrder_idx"
  ON "registration_flow_gallery_items"("organizationId", "flowId", "sortOrder");
CREATE INDEX IF NOT EXISTS "registration_flow_gallery_items_mediaId_idx"
  ON "registration_flow_gallery_items"("mediaId");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_flow_items_organizationId_id_key"
  ON "registration_flow_items"("organizationId", "id");
CREATE INDEX IF NOT EXISTS "registration_flow_items_organizationId_flowId_sortOrder_idx"
  ON "registration_flow_items"("organizationId", "flowId", "sortOrder");
CREATE INDEX IF NOT EXISTS "registration_flow_items_organizationId_flowId_isActive_deletedAt_idx"
  ON "registration_flow_items"("organizationId", "flowId", "isActive", "deletedAt");
CREATE INDEX IF NOT EXISTS "registration_flow_items_organizationId_sku_idx"
  ON "registration_flow_items"("organizationId", "sku");
CREATE INDEX IF NOT EXISTS "registration_flow_items_imageMediaId_idx"
  ON "registration_flow_items"("imageMediaId");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_flow_item_variants_itemId_kind_valueKey_key"
  ON "registration_flow_item_variants"("itemId", "kind", "valueKey");
CREATE UNIQUE INDEX IF NOT EXISTS "registration_flow_item_variants_organizationId_id_key"
  ON "registration_flow_item_variants"("organizationId", "id");
CREATE INDEX IF NOT EXISTS "registration_flow_item_variants_organizationId_itemId_sortOrder_idx"
  ON "registration_flow_item_variants"("organizationId", "itemId", "sortOrder");
CREATE INDEX IF NOT EXISTS "registration_flow_item_variants_organizationId_deletedAt_idx"
  ON "registration_flow_item_variants"("organizationId", "deletedAt");

DO $$ BEGIN
  ALTER TABLE "registration_flow_gallery_items"
    ADD CONSTRAINT "registration_flow_gallery_items_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_gallery_items"
    ADD CONSTRAINT "registration_flow_gallery_items_organizationId_flowId_fkey"
    FOREIGN KEY ("organizationId", "flowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_gallery_items"
    ADD CONSTRAINT "registration_flow_gallery_items_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_items"
    ADD CONSTRAINT "registration_flow_items_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_items"
    ADD CONSTRAINT "registration_flow_items_organizationId_flowId_fkey"
    FOREIGN KEY ("organizationId", "flowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_items"
    ADD CONSTRAINT "registration_flow_items_imageMediaId_fkey"
    FOREIGN KEY ("imageMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_item_variants"
    ADD CONSTRAINT "registration_flow_item_variants_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registration_flow_item_variants"
    ADD CONSTRAINT "registration_flow_item_variants_organizationId_itemId_fkey"
    FOREIGN KEY ("organizationId", "itemId") REFERENCES "registration_flow_items"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
