# Catalog Unification Migration Report

**Migration:** `prisma/migrations/20260911013000_unify_catalog_on_book_sku`  
**Canonical model:** `BookSku` (plus `BookTitle` for bibliographic identity)  
**Date:** 2026-09-11

This report records the removal of the duplicate shop catalog. After this change there is exactly one sellable product: **BookSku**. ERP admin, public shop, CRM-adjacent order lines, search, and inventory all read and write that row.

---

## 1. Removed duplicate models

| Removed Prisma model | Table | Why it was a duplicate |
| --- | --- | --- |
| `CommerceItem` | `commerce_items` | Second product master (title, slug, SKU, barcode, prices, grade/subject, image, stock) |
| `CommerceItemCategory` | `commerce_item_categories` | M2M from the duplicate product to categories |
| `CommerceBusinessType` | `commerce_business_types` | Parallel “type” taxonomy; shop now uses `BookSku.systemKind` + ERP `BookType` |

| Removed enum | Replacement |
| --- | --- |
| `CommerceItemStatus` | `BookSkuStatus` + derived shop listing status (`shop-status.ts`: DRAFT / ACTIVE / OUT_OF_STOCK / ARCHIVED) |

**Not removed (not product masters):**

- `CommerceCategory` — merchandising tree only; now joins to `BookSku` via `BookSkuCategory`
- `CommerceOrder` / `CommerceOrderEvent` / `CommerceOrderItem` — sales documents; line items now FK to `BookSku`
- `CommerceNotificationSettings` — org SMS settings

---

## 2. Canonical Book surface

`BookSku` is the single sellable edition used by:

| Consumer | How it uses BookSku |
| --- | --- |
| Book ERP admin (`/admin/books/catalog`) | Create/edit bibliographic + temporal prices; `isVisible=false` by default |
| Shop admin (`/admin/commerce/products`) | Same `BookSku.id`; writes shop fields + inventory + `BookSkuPrice` |
| Public shop (`/shop`, `/shop/[slug]`) | Visible + ACTIVE SKUs; search on `searchText` / title / authors / code / barcode |
| Orders | `CommerceOrderItem.bookSkuId` → `BookSku`; snapshots keep historical title/SKU |
| Inventory | `BookSku.trackInventory` / `stockQuantity` / `unlimitedStock` |
| Search | One haystack: `BookSku.searchText` |
| CRM / ops | Order filters and product pickers query `BookSku` (no second item table) |

`BookTitle` remains the bibliographic parent (publisher, type, grade/subject/major FKs). It is **not** a second shop catalog.

---

## 3. Updated relations

### Added

| Model | Relation | Notes |
| --- | --- | --- |
| `BookSkuCategory` | `(organizationId, skuId) → BookSku` | Replaces `CommerceItemCategory` |
| `BookSkuCategory` | `(organizationId, categoryId) → CommerceCategory` | Merchandising only |
| `BookSku` | `primaryImage → MediaAsset` (`BookSkuPrimaryImage`) | Was `CommerceItem.primaryImage` |
| `BookSku` | `branch → Branch` | Optional shop/ops branch |
| `BookSku` | `orderItems → CommerceOrderItem[]` | Reverse of line FK |
| `Organization` | `bookSkuCategories`, `bookSkus` | `commerceItems` / `commerceBusinessTypes` gone |
| `Branch` | `bookSkus` | `commerceItems` gone |

### Changed

| Model | Before | After |
| --- | --- | --- |
| `CommerceOrderItem` | `itemId` → `CommerceItem` | `bookSkuId` → `BookSku` (nullable if the old item could not be mapped) |
| `CommerceCategory` | `itemLinks → CommerceItemCategory[]` | `skuLinks → BookSkuCategory[]` |

### Columns folded onto `BookSku` (no second copy)

`slug`, `shortDescription`, `authors`, `subject`, `gradeLabel`, `pageCount`, `printType`, `bindingType`, `formatSize`, `features`, `metaTitle`, `metaDescription`, `isVisible`, `isFeatured`, `sortOrder`, `primaryImageAssetId`, `branchId`, `trackInventory`, `stockQuantity`, `unlimitedStock`, `systemKind`, fulfillment flags, `currency`.

Prices stay **only** on `BookSkuPrice` (LIST / SALE, temporal). Shop `basePriceRials` / `salePriceRials` were migrated into covering price rows (`source = COMMERCE_MIGRATE`) and are no longer stored on a product table.

---

## 4. Data migration algorithm

SQL: `prisma/migrations/20260911013000_unify_catalog_on_book_sku/migration.sql`

1. Add shop/inventory columns on `book_skus` (slug nullable until backfill).
2. Create `book_sku_categories`.
3. Build `_commerce_item_sku_map`:
   - Match existing SKU on `internalCode = commerce.sku`
   - Else match unused SKU on barcode
   - Else create `BookTitle` + `BookSku` (reuse `commerce_items.id` when free)
4. Copy shop/inventory fields onto matched SKUs without overwriting bibliographic identity.
5. Insert LIST/SALE `book_sku_prices` when no open covering row exists.
6. Copy category joins into `book_sku_categories`.
7. Retarget `commerce_order_items.itemId` → mapped `skuId`, rename column to `bookSkuId`, add FK.
8. Assign `erp-{id}` slugs to ERP-only rows; enforce unique `(organizationId, slug)`.
9. Drop `_commerce_item_sku_map`, `commerce_item_categories`, `commerce_items`, `commerce_business_types`, `CommerceItemStatus`.

**Merge rule:** one CommerceItem never maps to two BookSkus. Two CommerceItems with the same SKU/barcode collapse onto one BookSku (second category links `DISTINCT ON`).

**Order lines:** title/SKU snapshots are unchanged. Live FK points at the canonical book. Dangling IDs (deleted catalog, no copy) are set `bookSkuId = NULL`; the printed snapshot remains.

---

## 5. Application call sites (no duplicate writes)

| Path | Now reads/writes |
| --- | --- |
| `lib/commerce/catalog/service.ts` | `prisma.bookSku` / `bookSkuPrice` / `bookSkuCategory` |
| `lib/commerce/inventory.ts` | `prisma.bookSku` stock decrement |
| `lib/commerce/orders/service.ts` | Create line `bookSkuId`; list/filter on `bookSkuId` |
| `lib/commerce/orders/pickup.ts`, `receipt.ts`, `public-ticket.ts` | `item.bookSku.authors` |
| `lib/payment/service.ts` | Decrement stock by `line.bookSkuId` |
| `lib/books/catalog/sku-service.ts` | Always allocates unique `slug` |
| `lib/books/catalog/import-service.ts` | Same; imported rows stay `isVisible=false` until shop-published |
| `scripts/commerce-shop-checkout-smoke.ts` | Picks `BookSku` |

Legacy function names (`upsertCommerceItemFromForm`, `decrementCommerceItemStock`, `validateCreateCommerceItem`) are **adapters**. They do not persist a second product table.

---

## 6. Feature verification

| Feature | Status | Evidence |
| --- | --- | --- |
| Book ERP SKU create/edit | Pass (code) | `createBookSku` / `updateBookSku` write `BookSku` + `BookSkuPrice`; required `slug` allocated |
| Excel catalog import | Pass (code + unit) | Import creates `BookSku` with slug; parser tests unchanged |
| Catalog search | Pass (unit) | `buildSkuSearchText` includes code, barcode, title, authors, subject, grade |
| Shop product list/edit | Pass (code) | Admin loaders query `bookSku` only |
| Public `/shop` filters | Pass (code) | `isVisible` + `ACTIVE` + in-stock on `BookSku` |
| Checkout / admin create order | Pass (code) | `createSingleItemCommerceOrder` loads `BookSku`, writes `bookSkuId` |
| Inventory decrement on pay | Pass (code) | Payment path uses `bookSkuId` |
| Order ops / production / pickup | Pass (code) | Line snapshots + optional `bookSku` for authors |
| Category merchandising | Pass (code) | Seed + `BookSkuCategory`; category admin UI still placeholder (pre-existing) |
| CRM | Pass (code) | No `CommerceItem` FK existed; orders/leads unchanged except line FK |
| Foundation unit tests | **Pass** | `scripts/books-catalog-unit-tests.ts` — 19 passed (2026-09-11) |
| Commerce foundation tests | **Pass** | `scripts/commerce-foundation-unit-tests.ts` — all passed (2026-09-11) |

Shop listing status is **derived** (`shop-status.ts`), so old DRAFT / OUT_OF_STOCK / ARCHIVED form values still work without a Prisma enum.

ERP-created books stay off the public shop (`isVisible=false`, `unlimitedStock=true`) until a shop admin publishes them. That is the same catalog, not a second product.

---

## 7. Residual naming (not a second catalog)

These identifiers still say “CommerceItem” for compatibility. They are types/functions only:

- `CommerceItemAdminRow`, `getAdminCommerceItem`, `upsertCommerceItemFromForm`
- `CommerceItemStatusValue`, `CommerceItemValidationError`, `validateCreateCommerceItem`
- `decrementCommerceItemStock({ itemId })` — `itemId` is `BookSku.id`
- Form hidden field `itemId` on shop checkout and admin product form

No Prisma `CommerceItem` remains.

---

## 8. Apply

```bash
npx prisma migrate deploy
```

Local/dev: `npx prisma migrate dev` if the migration is not yet in `_prisma_migrations`.

After apply, `commerce_items` must not exist; `book_skus.slug` must be NOT NULL and unique per organization.
