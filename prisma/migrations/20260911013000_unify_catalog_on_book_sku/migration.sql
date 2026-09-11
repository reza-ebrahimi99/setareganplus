-- Unify catalog: fold CommerceItem into canonical BookSku.
-- Shop, orders, inventory, and merchandising categories reference BookSku only.

-- ─── 1. BookSku shop / inventory columns (nullable slug until backfill) ───────

ALTER TABLE "book_skus"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "shortDescription" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "authors" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "gradeLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "pageCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "printType" "CommercePrintType",
  ADD COLUMN IF NOT EXISTS "bindingType" "CommerceBindingType",
  ADD COLUMN IF NOT EXISTS "formatSize" "CommerceFormatSize",
  ADD COLUMN IF NOT EXISTS "features" JSONB,
  ADD COLUMN IF NOT EXISTS "metaTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "primaryImageAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "branchId" TEXT,
  ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER,
  ADD COLUMN IF NOT EXISTS "unlimitedStock" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "systemKind" "CommerceSystemKind" NOT NULL DEFAULT 'PHYSICAL',
  ADD COLUMN IF NOT EXISTS "requiresShipping" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "grantsDigitalAccess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresScheduling" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresEnrollment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'IRR';

CREATE TABLE IF NOT EXISTS "book_sku_categories" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "book_sku_categories_pkey" PRIMARY KEY ("id")
);

-- ─── 2. Map every CommerceItem onto a BookSku (merge on code/barcode) ─────────

CREATE TABLE "_commerce_item_sku_map" (
  "itemId" TEXT PRIMARY KEY,
  "skuId" TEXT NOT NULL
);

INSERT INTO "_commerce_item_sku_map" ("itemId", "skuId")
SELECT ci."id", s."id"
FROM "commerce_items" ci
INNER JOIN "book_skus" s
  ON s."organizationId" = ci."organizationId"
 AND s."deletedAt" IS NULL
 AND ci."sku" IS NOT NULL
 AND btrim(ci."sku") <> ''
 AND s."internalCode" = btrim(ci."sku")
ON CONFLICT ("itemId") DO NOTHING;

INSERT INTO "_commerce_item_sku_map" ("itemId", "skuId")
SELECT ci."id", s."id"
FROM "commerce_items" ci
INNER JOIN "book_skus" s
  ON s."organizationId" = ci."organizationId"
 AND s."deletedAt" IS NULL
 AND ci."barcode" IS NOT NULL
 AND btrim(ci."barcode") <> ''
 AND s."barcode" = btrim(ci."barcode")
WHERE NOT EXISTS (
  SELECT 1 FROM "_commerce_item_sku_map" m WHERE m."itemId" = ci."id"
)
AND NOT EXISTS (
  SELECT 1 FROM "_commerce_item_sku_map" m WHERE m."skuId" = s."id"
)
ON CONFLICT ("itemId") DO NOTHING;

INSERT INTO "book_titles" (
  "id",
  "organizationId",
  "title",
  "description",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  ci."id" || '_t',
  ci."organizationId",
  ci."title",
  NULLIF(btrim(ci."description"), ''),
  ci."createdAt",
  ci."updatedAt",
  ci."deletedAt"
FROM "commerce_items" ci
WHERE NOT EXISTS (
  SELECT 1 FROM "_commerce_item_sku_map" m WHERE m."itemId" = ci."id"
);

INSERT INTO "book_skus" (
  "id",
  "organizationId",
  "titleId",
  "internalCode",
  "barcode",
  "editionLabel",
  "editionYear",
  "status",
  "searchText",
  "slug",
  "shortDescription",
  "authors",
  "subject",
  "gradeLabel",
  "pageCount",
  "printType",
  "bindingType",
  "formatSize",
  "features",
  "metaTitle",
  "metaDescription",
  "isVisible",
  "isFeatured",
  "sortOrder",
  "primaryImageAssetId",
  "branchId",
  "trackInventory",
  "stockQuantity",
  "unlimitedStock",
  "systemKind",
  "requiresShipping",
  "grantsDigitalAccess",
  "requiresScheduling",
  "requiresEnrollment",
  "currency",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM "book_skus" existing WHERE existing."id" = ci."id")
      THEN ci."id" || '_sku'
    ELSE ci."id"
  END,
  ci."organizationId",
  ci."id" || '_t',
  CASE
    WHEN ci."sku" IS NOT NULL AND btrim(ci."sku") <> '' THEN btrim(ci."sku")
    ELSE 'CI-' || ci."id"
  END,
  NULLIF(btrim(COALESCE(ci."barcode", '')), ''),
  NULL,
  CASE WHEN ci."editionYear" IS NULL THEN NULL ELSE ci."editionYear"::text END,
  CASE ci."status"::text
    WHEN 'DRAFT' THEN 'INACTIVE'::"BookSkuStatus"
    WHEN 'ARCHIVED' THEN 'DISCONTINUED'::"BookSkuStatus"
    ELSE 'ACTIVE'::"BookSkuStatus"
  END,
  lower(
    concat_ws(
      ' ',
      CASE
        WHEN ci."sku" IS NOT NULL AND btrim(ci."sku") <> '' THEN btrim(ci."sku")
        ELSE 'CI-' || ci."id"
      END,
      COALESCE(ci."barcode", ''),
      ci."title",
      COALESCE(ci."authors", ''),
      COALESCE(ci."subject", ''),
      COALESCE(ci."gradeLabel", '')
    )
  ),
  ci."slug",
  COALESCE(ci."shortDescription", ''),
  COALESCE(ci."authors", ''),
  ci."subject",
  ci."gradeLabel",
  ci."pageCount",
  ci."printType",
  ci."bindingType",
  ci."formatSize",
  ci."features",
  ci."metaTitle",
  ci."metaDescription",
  ci."isVisible",
  ci."isFeatured",
  ci."sortOrder",
  ci."primaryImageAssetId",
  ci."branchId",
  ci."trackInventory",
  ci."stockQuantity",
  ci."unlimitedStock",
  ci."systemKind",
  ci."requiresShipping",
  ci."grantsDigitalAccess",
  ci."requiresScheduling",
  ci."requiresEnrollment",
  COALESCE(NULLIF(ci."currency", ''), 'IRR'),
  ci."createdAt",
  ci."updatedAt",
  ci."deletedAt"
FROM "commerce_items" ci
WHERE NOT EXISTS (
  SELECT 1 FROM "_commerce_item_sku_map" m WHERE m."itemId" = ci."id"
);

INSERT INTO "_commerce_item_sku_map" ("itemId", "skuId")
SELECT
  ci."id",
  CASE
    WHEN EXISTS (SELECT 1 FROM "book_skus" existing WHERE existing."id" = ci."id")
      AND EXISTS (SELECT 1 FROM "book_skus" created WHERE created."id" = ci."id" || '_sku')
      THEN ci."id" || '_sku'
    ELSE ci."id"
  END
FROM "commerce_items" ci
WHERE NOT EXISTS (
  SELECT 1 FROM "_commerce_item_sku_map" m WHERE m."itemId" = ci."id"
);

-- Merged rows: copy shop/inventory fields onto the existing BookSku (do not
-- overwrite bibliographic identity). Prefer commerce slug when the SKU has none.
UPDATE "book_skus" s
SET
  "slug" = COALESCE(s."slug", ci."slug"),
  "shortDescription" = CASE
    WHEN s."shortDescription" = '' THEN COALESCE(ci."shortDescription", '')
    ELSE s."shortDescription"
  END,
  "authors" = CASE
    WHEN s."authors" = '' THEN COALESCE(ci."authors", '')
    ELSE s."authors"
  END,
  "subject" = COALESCE(s."subject", ci."subject"),
  "gradeLabel" = COALESCE(s."gradeLabel", ci."gradeLabel"),
  "pageCount" = COALESCE(s."pageCount", ci."pageCount"),
  "printType" = COALESCE(s."printType", ci."printType"),
  "bindingType" = COALESCE(s."bindingType", ci."bindingType"),
  "formatSize" = COALESCE(s."formatSize", ci."formatSize"),
  "features" = COALESCE(s."features", ci."features"),
  "metaTitle" = COALESCE(s."metaTitle", ci."metaTitle"),
  "metaDescription" = COALESCE(s."metaDescription", ci."metaDescription"),
  "isVisible" = s."isVisible" OR ci."isVisible",
  "isFeatured" = s."isFeatured" OR ci."isFeatured",
  "primaryImageAssetId" = COALESCE(s."primaryImageAssetId", ci."primaryImageAssetId"),
  "branchId" = COALESCE(s."branchId", ci."branchId"),
  "trackInventory" = s."trackInventory" OR ci."trackInventory",
  "stockQuantity" = COALESCE(s."stockQuantity", ci."stockQuantity"),
  "unlimitedStock" = s."unlimitedStock" AND ci."unlimitedStock",
  "systemKind" = ci."systemKind",
  "requiresShipping" = ci."requiresShipping",
  "grantsDigitalAccess" = ci."grantsDigitalAccess",
  "requiresScheduling" = ci."requiresScheduling",
  "requiresEnrollment" = ci."requiresEnrollment"
FROM "commerce_items" ci
INNER JOIN "_commerce_item_sku_map" m ON m."itemId" = ci."id"
WHERE s."id" = m."skuId"
  AND s."id" <> ci."id"
  AND s."id" <> ci."id" || '_sku';

INSERT INTO "book_sku_prices" (
  "id",
  "organizationId",
  "skuId",
  "kind",
  "amountRials",
  "effectiveFrom",
  "effectiveTo",
  "source",
  "createdAt"
)
SELECT
  m."itemId" || '_plist',
  ci."organizationId",
  m."skuId",
  'LIST'::"BookPriceKind",
  ci."basePriceRials",
  COALESCE(ci."priceStartsAt", ci."createdAt"),
  NULL,
  'COMMERCE_MIGRATE',
  ci."createdAt"
FROM "commerce_items" ci
INNER JOIN "_commerce_item_sku_map" m ON m."itemId" = ci."id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "book_sku_prices" p
  WHERE p."skuId" = m."skuId"
    AND p."kind" = 'LIST'
    AND p."effectiveTo" IS NULL
);

INSERT INTO "book_sku_prices" (
  "id",
  "organizationId",
  "skuId",
  "kind",
  "amountRials",
  "effectiveFrom",
  "effectiveTo",
  "source",
  "createdAt"
)
SELECT
  m."itemId" || '_psale',
  ci."organizationId",
  m."skuId",
  'SALE'::"BookPriceKind",
  ci."salePriceRials",
  COALESCE(ci."priceStartsAt", ci."createdAt"),
  ci."priceEndsAt",
  'COMMERCE_MIGRATE',
  ci."createdAt"
FROM "commerce_items" ci
INNER JOIN "_commerce_item_sku_map" m ON m."itemId" = ci."id"
WHERE ci."salePriceRials" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "book_sku_prices" p
    WHERE p."skuId" = m."skuId"
      AND p."kind" = 'SALE'
      AND p."effectiveTo" IS NULL
  );

INSERT INTO "book_sku_categories" (
  "id",
  "organizationId",
  "skuId",
  "categoryId",
  "sortOrder",
  "isFeatured",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (m."skuId", cic."categoryId")
  cic."id",
  cic."organizationId",
  m."skuId",
  cic."categoryId",
  cic."sortOrder",
  cic."isFeatured",
  cic."createdAt",
  cic."updatedAt"
FROM "commerce_item_categories" cic
INNER JOIN "_commerce_item_sku_map" m ON m."itemId" = cic."itemId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "book_sku_categories" existing
  WHERE existing."skuId" = m."skuId"
    AND existing."categoryId" = cic."categoryId"
);

-- ─── 3. Retarget order lines ──────────────────────────────────────────────────

ALTER TABLE "commerce_order_items" DROP CONSTRAINT IF EXISTS "commerce_order_items_organizationId_itemId_fkey";

UPDATE "commerce_order_items" oi
SET "itemId" = m."skuId"
FROM "_commerce_item_sku_map" m
WHERE oi."itemId" = m."itemId"
  AND m."skuId" <> m."itemId";

ALTER TABLE "commerce_order_items" RENAME COLUMN "itemId" TO "bookSkuId";

DROP INDEX IF EXISTS "commerce_order_items_organizationId_itemId_idx";
CREATE INDEX "commerce_order_items_organizationId_bookSkuId_idx"
  ON "commerce_order_items"("organizationId", "bookSkuId");

-- Null out dangling FKs that did not map (deleted catalog rows with no copy).
UPDATE "commerce_order_items" oi
SET "bookSkuId" = NULL
WHERE oi."bookSkuId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "book_skus" s
    WHERE s."id" = oi."bookSkuId"
      AND s."organizationId" = oi."organizationId"
  );

ALTER TABLE "commerce_order_items"
  ADD CONSTRAINT "commerce_order_items_organizationId_bookSkuId_fkey"
  FOREIGN KEY ("organizationId", "bookSkuId")
  REFERENCES "book_skus"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 4. Unique slugs for remaining ERP-only SKUs ──────────────────────────────

UPDATE "book_skus"
SET "slug" = 'erp-' || "id"
WHERE "slug" IS NULL OR btrim("slug") = '';

-- Collision guard: if two rows somehow share a slug, suffix with id.
UPDATE "book_skus" s
SET "slug" = s."slug" || '-' || right(s."id", 6)
WHERE EXISTS (
  SELECT 1
  FROM "book_skus" other
  WHERE other."organizationId" = s."organizationId"
    AND other."slug" = s."slug"
    AND other."id" <> s."id"
    AND other."id" < s."id"
);

ALTER TABLE "book_skus" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "book_skus_organizationId_slug_key"
  ON "book_skus"("organizationId", "slug");
CREATE INDEX IF NOT EXISTS "book_skus_organizationId_isVisible_status_deletedAt_idx"
  ON "book_skus"("organizationId", "isVisible", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "book_skus_organizationId_isFeatured_sortOrder_idx"
  ON "book_skus"("organizationId", "isFeatured", "sortOrder");
CREATE INDEX IF NOT EXISTS "book_skus_organizationId_branchId_idx"
  ON "book_skus"("organizationId", "branchId");
CREATE INDEX IF NOT EXISTS "book_skus_primaryImageAssetId_idx"
  ON "book_skus"("primaryImageAssetId");

ALTER TABLE "book_skus"
  ADD CONSTRAINT "book_skus_primaryImageAssetId_fkey"
  FOREIGN KEY ("primaryImageAssetId") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "book_skus"
  ADD CONSTRAINT "book_skus_organizationId_branchId_fkey"
  FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "book_sku_categories_skuId_categoryId_key"
  ON "book_sku_categories"("skuId", "categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "book_sku_categories_organizationId_id_key"
  ON "book_sku_categories"("organizationId", "id");
CREATE INDEX IF NOT EXISTS "book_sku_categories_organizationId_categoryId_sortOrder_idx"
  ON "book_sku_categories"("organizationId", "categoryId", "sortOrder");
CREATE INDEX IF NOT EXISTS "book_sku_categories_organizationId_skuId_idx"
  ON "book_sku_categories"("organizationId", "skuId");

ALTER TABLE "book_sku_categories"
  ADD CONSTRAINT "book_sku_categories_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_sku_categories"
  ADD CONSTRAINT "book_sku_categories_organizationId_skuId_fkey"
  FOREIGN KEY ("organizationId", "skuId") REFERENCES "book_skus"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_sku_categories"
  ADD CONSTRAINT "book_sku_categories_organizationId_categoryId_fkey"
  FOREIGN KEY ("organizationId", "categoryId") REFERENCES "commerce_categories"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "_commerce_item_sku_map";

-- ─── 5. Drop duplicate catalog ────────────────────────────────────────────────

DROP TABLE IF EXISTS "commerce_item_categories";
DROP TABLE IF EXISTS "commerce_items";
DROP TABLE IF EXISTS "commerce_business_types";
DROP TYPE IF EXISTS "CommerceItemStatus";
