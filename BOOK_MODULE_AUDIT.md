# StarOS Book / Commerce Module Audit

**Status:** read-only inventory. No code, schema, UI, or route changes were made.

**Scope:** everything under Book Commerce ERP (`/admin/books`, `lib/books`, Prisma `Book*`) and the live booklet shop (`/admin/commerce`, `/shop`, `/booklet`, `lib/commerce`, Prisma `Commerce*`). Booking (`/admin/bookings`) and Guidance case-book are **out of scope**.

**Actual stack (repo, not the brief):** Next.js **16.2.10**, React, TypeScript strict, Prisma, PostgreSQL, Tailwind, App Router.

**Hard fact:** there are **two catalogs and two products**, not one unfinished module. They do not share SKUs, stock, orders, or pricing.

| System | Flag / gate | Purpose | Stock | Orders |
| --- | --- | --- | --- | --- |
| **A. Book Commerce ERP** (Pen Book Agency) | `OrganizationFeatureFlag` key `bookCommerce` (default OFF) + env `STAROS_BOOKS_ERP_HARD_OFF` | Wholesale/agency catalog for books | Explicitly **no** scalar stock | Sales nav items `enabled: false` |
| **B. Booklet shop commerce** | Always on when RBAC allows | Physical booklet storefront + staff ops | Scalar `CommerceItem.stockQuantity` | Full ops pipeline + public checkout |

Prisma comment on the Book ERP section: warehouse ledger, sales/reservations, procurement, treasury, marketing, commission, partner portals, and reporting are **later phases — not shipped**.

Referenced architecture pack `docs/architecture/book-commerce-erp/` is **not in this repo**.

---

## 1. Current Architecture

### Folders

```
app/admin/(dashboard)/books/          Book ERP admin (flag-gated)
app/admin/(dashboard)/commerce/       Booklet shop admin
app/admin/(dashboard)/settings/commerce-notifications/
app/shop/                             Public storefront (CommerceItem)
app/booklet/[token]/                  Public ticket / delivery / QR
lib/books/                            Book ERP services + flag
lib/commerce/                         Booklet catalog, orders, inventory, SMS
components/admin/books/
components/admin/commerce/
components/shop/
components/commerce/
scripts/books-*.ts, scripts/commerce-*.ts
```

No `hooks/` directory for either system. No dedicated `app/api/books` or `app/api/commerce` REST tree. Mutations are Server Actions; a few App Router `route.ts` handlers exist for Excel/QR.

### Pages (24 `page.tsx`)

**Book ERP (7)** — all `requireBookCommerceAccess(...)`:

| Route | File | Gate |
| --- | --- | --- |
| `/admin/books` | `books/page.tsx` | `books.view` |
| `/admin/books/catalog` | `books/catalog/page.tsx` | `books.catalog.manage` |
| `/admin/books/catalog/new` | `books/catalog/new/page.tsx` | `books.catalog.manage` |
| `/admin/books/catalog/[id]` | `books/catalog/[id]/page.tsx` | `books.catalog.manage` |
| `/admin/books/catalog/types` | `books/catalog/types/page.tsx` | `books.catalog.manage` |
| `/admin/books/catalog/import` | `books/catalog/import/page.tsx` | `books.import` |
| `/admin/books/settings` | `books/settings/page.tsx` | `books.settings.manage` |

**Booklet commerce admin (12)** — `requirePermission(...)`:

| Route | File | Gate |
| --- | --- | --- |
| `/admin/commerce` | hub | `commerce.view` |
| `/admin/commerce/categories` | placeholder | `commerce.categories.manage` |
| `/admin/commerce/products` | list | `commerce.products.manage` |
| `/admin/commerce/products/new` | create | `commerce.products.manage` |
| `/admin/commerce/products/[id]` | edit | `commerce.products.manage` |
| `/admin/commerce/orders` | ops workspace | `commerce.orders.view` |
| `/admin/commerce/orders/labels` | print labels | `commerce.orders.view` |
| `/admin/commerce/production` | print queue | `commerce.orders.view` |
| `/admin/commerce/performance` | staff KPIs | `commerce.orders.view` |
| `/admin/commerce/pickup` | desk | `commerce.orders.view` |
| `/admin/commerce/pickup/[token]` | handover | `commerce.orders.view` |
| `/admin/commerce/payments` | **stale empty state** | `commerce.payments.view` |

**Settings (1):** `/admin/settings/commerce-notifications` — `commerce.orders.manage`.

**Public (4):** `/shop`, `/shop/[slug]`, `/booklet/[token]`, `/booklet/[token]/delivery`.

### Layouts

- No `books/layout.tsx` or `commerce/layout.tsx`.
- Both inherit `app/admin/(dashboard)/layout.tsx`.
- That layout strips every `books.*` permission from the sidebar **unless** `isBookCommerceEnabled(org)` is true. Direct URL still hits `requireBookCommerceAccess` → `/admin/forbidden`.

### Components (36 UI + 1 types helper)

**Book ERP (4):**

- `components/admin/books/BookSkuForm.tsx`
- `components/admin/books/CatalogImportWizard.tsx`
- `app/admin/(dashboard)/books/settings/BookAgencyProfileForm.tsx`
- `app/admin/(dashboard)/books/catalog/types/BookTypeForms.tsx` (`CreateBookTypeForm`, `BookTypeRowForm`)

**Booklet admin (23 UI + `order-ops-types.ts`):**  
`OrderOpsWorkspace`, `OrderOpsDrawer`, `OrderOpsExpanded`, `OrderOpsInstantSearch`, `OrderOpsSignals`, `OrderOpsNotifications`, `OrderOpsQuickLinks`, `OrderOpsBulkBar`, `OrderNextAction`, `OrderCreatePanel`, `OrderBranchBadge`, `OrderQrThumb`, `CommerceProductForm`, `CommerceNotificationSettingsForm`, `PickupDeskSearch`, `PickupLookupForm`, `PickupOrderPanel`, `PickupDeliverForm`, `PickupSignaturePad`, `PickupQrScanner`, `PrintQueueButton`.

**Public shop (3):** `ShopProductCard`, `ShopProductCover`, `ShopCheckoutForm`.

**Public booklet (6):** `BookletPublicTicket`, `BookletPaymentReceipt`, `BookletReceiptActions`, `OrderTrackingPage`, `CommerceQrImg`, `StudentAcademicFields`.

**Shared reused (not counted above):** `AdminPageHeader`, `AdminEmptyState`, `AdminShell`, `Button`, `Container`, `PageHero`, `SiteShell`, `PublicFormShell`.

### Hooks

None dedicated. Client forms use `useActionState` / `useTransition` inline.

### Utilities (Book ERP — `lib/books/`)

| File | Role |
| --- | --- |
| `constants.ts` | Flag key, hard-off env, import limits, default book types, sequence pad |
| `flags.ts` | `isBookCommerceEnabled`, `resolveBooksFlag` |
| `require.ts` | `requireBookCommerceAccess` |
| `agency-profile.ts` | `ensureBookAgencyProfile`, `ensureDefaultBookTypes` |
| `catalog/list-service.ts` | Paginated catalog list + SKU detail |
| `catalog/sku-service.ts` | Create/update SKU, temporal prices, duplicate code/barcode checks |
| `catalog/search.ts` | Denormalized `searchText` builder |
| `catalog/price.ts` | Covering-price resolver + rial format |
| `catalog/tags.ts` | Reuse generic `Tag` via `BookSkuTag` |
| `catalog/taxonomy.ts` / `taxonomy-options.ts` | Grade/subject/major/publisher/type options |
| `catalog/sequence.ts` | `formatDocumentNumber`, `nextDocumentSequenceValue` (unused by UI) |
| `catalog/import-parser.ts` | XLSX load, header detect, mapping, validation |
| `catalog/import-mapping.ts` | Client-safe column field list |
| `catalog/import-service.ts` | Commit rows + CSV report |

### Utilities (Booklet — `lib/commerce/`)

48 files: catalog service/validation, categories seed/validation, inventory decrement, pricing windows, order create/ops/bulk/filters/KPIs/export/QR/pickup/production/timeline/notify/staff/intelligence, booklet SMS, notification settings, student fields, branches, payment payable helpers, `extensions.ts` (documented, not implemented).

### Server Actions

**Books (9 exports):**

- `createBookSkuAction`, `updateBookSkuAction`
- `createBookTypeAction`, `updateBookTypeAction`
- `inspectCatalogImportAction`, `validateCatalogImportAction`, `commitCatalogImportAction`, `downloadImportReportCsvAction`
- `updateBookAgencyProfileAction`

**Commerce (13) + shop (1) + notifications (4):**

- Product: `createCommerceProductAction`, `updateCommerceProductAction`
- Ops: `advanceOrderStageAction`, `rollbackOrderStageAction`, `addOrderNoteAction`, `updateOrderDetailsAction`, `createAdminCommerceOrderAction`, `bulkCommerceOrdersAction`, `markCommerceOpsNotificationsReadAction`
- SMS: `resendOrderSmsAction`, `retryOrderSmsAction`, `previewOrderSmsAction`, `sendTestOrderSmsAction`
- Shop: `startShopCheckoutAction`
- Notify: `setCommerceNotifyEnabledAction`, `addCommerceNotifyRecipientAction`, `removeCommerceNotifyRecipientAction`, `toggleCommerceNotifyRecipientAction`

### API Routes (`route.ts` — 3)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/admin/commerce/orders/export.xlsx` | Admin session + `commerce.orders.view` + branch scope |
| GET | `/admin/commerce/orders/qr/[token]` | Admin session + `commerce.orders.view` + branch scope |
| GET | `/booklet/[token]/qr` | **Public** (org-scoped lookup by `qrToken`) |

Commerce checkout reuses existing payment routes via `startCheckoutForCommerceOrder` (`PaymentPayableType.COMMERCE_ORDER`). There is no Book ERP payment path.

### Prisma models involved

**Book ERP dedicated (11):** `OrganizationFeatureFlag`, `BookAgencyProfile`, `DocumentSequence`, `BookPublisher`, `BookType`, `BookTitle`, `BookSku`, `BookSkuPrice`, `BookSkuTag`, `BookImportJob`, `BookImportRowResult`.

**Booklet dedicated (8):** `CommerceCategory`, `CommerceBusinessType`, `CommerceItem`, `CommerceItemCategory`, `CommerceNotificationSettings`, `CommerceOrder`, `CommerceOrderEvent`, `CommerceOrderItem`.

**Reused:** `Organization`, `User`, `Branch`, `Tag`, `StudentGrade`, `Subject`, `StudentMajor`, `MediaAsset`, `Lead`, `AuditLog`, payment intents (`COMMERCE_ORDER`).

**Enums (Book):** `BookSkuStatus`, `BookPriceKind`, `BookImportJobType`, `BookImportJobStatus`, `BookImportRowAction`.

No `BookWarehouse`, `BookReservation`, `BookSalesOrder`, `BookStockLedger` tables exist.

### RBAC / Permissions

Defined in `lib/auth/permissions.ts`:

```
books.view
books.settings.manage
books.catalog.manage
books.import
books.export

commerce.view
commerce.manage          ← defined, never enforced on a page/action
commerce.categories.manage
commerce.products.manage
commerce.orders.view
commerce.orders.manage
commerce.orders.rollback
commerce.payments.view
commerce.reports.view    ← defined, no reports page uses it
```

Role mapping:

- `PLATFORM_ADMIN` / `ORGANIZATION_OWNER` / `ORGANIZATION_ADMIN`: all permissions.
- `BRANCH_MANAGER`: booklet ops (`commerce.view/orders.*`) **without** catalog product/category manage; **no** `books.*`.
- `CONTENT_MANAGER`: commerce catalog (view/categories/products) only.
- `FINANCE`: commerce view/orders/payments/reports — **no** `books.*`.
- Everyone else: no books, no commerce catalog.

`books.*` is therefore **owner/admin/platform only**, and still invisible until the org flag is on.

### Navigation / Sidebar

`content/admin.ts`:

- Group **فروشگاه** (`/admin/commerce`, `enabled: true`): dashboard, categories, products, booklet ops, production, staff performance, pickup, payments.
- Group **بازرگانی کتاب**: hidden unless flag on. Live items: overview, catalog, types, Excel import, agency settings. Disabled placeholders: warehouses, reservations/shortage, sales orders, treasury, marketing/schools, teacher commission, executive reports.
- Commerce SMS settings live under **Settings**, not the store hub: `/admin/settings/commerce-notifications`.

### Shared components

Admin chrome (`AdminShell`, headers, empty states) plus commerce QR/ticket pieces reused between staff labels and public booklet pages. Book ERP does **not** reuse `CommerceProductForm` or shop cards.

---

## 2. Existing Features

### Book ERP (Phase A foundation + Phase B catalog)

✔ **Feature flag + hard off**  
`bookCommerce` org row must be `enabled: true`. Env `STAROS_BOOKS_ERP_HARD_OFF` wins. No row = OFF. Sidebar and pages both honor this.

✔ **Executive overview**  
Counts SKUs, active SKUs, publishers, import jobs, last import. Placeholder “به‌زودی” cards for stock, open reservations, deposit remainder, bestsellers.

✔ **SKU CRUD**  
Create/edit title + internal code + barcode + edition + type + grade/subject/major + publisher + status + list/sale price + tags. Temporal prices: close covering row, insert new. Duplicate internal code / barcode checked in application code. Audit log on save.

✔ **Catalog list + search + filters**  
Search on denormalized `searchText` (title, code, barcode, keywords). Filters: type, grade, subject, major, publisher, status, price min/max, sort. Server page size 24.

✔ **Book types taxonomy**  
Seeded 14 starter types (`NORMAL`, `BLUE`, … `SPECIAL_EDITION`) as **data**, not enums. Admin can add/edit label, sort, active. System types are not deleted in UI.

✔ **Excel import wizard**  
Upload XLSX → auto-map headers → validate (formula cells rejected) → commit with UPDATE/SKIP duplicate strategy → CSV report download. Job history table (last 10). Limits: 8 MB, 5 000 rows, 40 columns. Magic-byte check (`PK`), `.xlsx` only. Formula-injection sanitization on CSV export.

✔ **Agency settings persist**  
Legal name, deposit %, reservation TTL, unpaid-issue, installments, GMV gifts, teacher name visibility. Written to `BookAgencyProfile` + audit. Most fields have **no runtime consumer** yet (see §10).

✔ **Publisher auto-create on import**  
Publishers are created during import when “create missing taxonomies” is on. No dedicated publisher admin page.

✔ **Tag reuse**  
`BookSkuTag` joins existing `Tag`. No parallel book-tag master.

✔ **Grade / subject / field reuse**  
`BookTitle` FKs `StudentGrade`, `Subject`, `StudentMajor`. Import **does not** auto-create those (must exist in school taxonomy).

✔ **Unit tests / operator script**  
`scripts/books-catalog-unit-tests.ts` (flag, sequence format). `scripts/books-set-org-flag.ts` toggles the org flag.

### Booklet shop (live ops)

✔ **Product CRUD**  
`CommerceItem` with title, slug, prices, sale window, SKU/barcode, inventory flags, authors, grade/subject labels, print/binding/format, features JSON, primary image, category link, visibility/status.

✔ **Public shop**  
`/shop` search + grade/subject filters; `/shop/[slug]` product + checkout form. `revalidate = 120` on list.

✔ **Checkout**  
`startShopCheckoutAction` creates a single-item `CommerceOrder` then `startCheckoutForCommerceOrder`. **This is live.** The payments admin page copy is wrong (see §3).

✔ **Inventory decrement**  
Transactional `decrementCommerceItemStock` when tracking is on; can flip item to `OUT_OF_STOCK`. No increment/restock helper.

✔ **Order ops workspace**  
Filters, KPIs, drawer, stage advance/rollback, notes, bulk assign/advance, staff handover, VIP/urgent signals, instant search, SMS preview/resend/retry/test.

✔ **Production queue**  
Grouped print queue + browser print button.

✔ **Pickup desk**  
QR/token scan, signature pad, handover, branch-scoped.

✔ **QR + labels**  
Admin PNG route, public booklet ticket, label print page (up to 80 IDs).

✔ **Excel export of orders**  
Authenticated XLSX of current filters.

✔ **Staff performance dashboard**  
Today production/delivery, delays, assigned-to-me, averages, leaderboard.

✔ **Admin-created orders**  
Staff can create a single-item order from ops UI.

✔ **SMS / admin notify**  
Booklet SMS pipeline + org-level admin SMS recipients on paid orders.

✔ **Branch scoping**  
Non-`allBranches` memberships limited on ops/QR/export/pickup.

✔ **Foundation tests / shop smoke**  
`scripts/commerce-foundation-unit-tests.ts`, `scripts/commerce-shop-checkout-smoke.ts`.

---

## 3. Incomplete Features

Effort: **S** < 1 day, **M** 2–5 days, **L** 1–2 weeks, **XL** multi-sprint.

### Book ERP — unfinished inside the shipped catalog slice

| Feature | Current state | Missing | Effort |
| --- | --- | --- | --- |
| Catalog pagination UI | `pageCount` computed, no prev/next links | Controls + querystring `page` | S |
| Price filter / sort | Applied **in memory on the current page only** after `take: 24` | DB-level price filter/sort (or load-all then paginate — worse) | M |
| Import sale-price on UPDATE | INSERT writes LIST+SALE; UPDATE only diffs LIST | SALE history close/insert | S |
| Import transaction / rollback | Per-row writes; chunked; job marked `DONE` even with row errors | All-or-nothing or compensating rollback; `FAILED`/`CANCELLED` transitions | L |
| Import job status machine | Enum has UPLOADED/PREVIEWED/VALIDATED/COMMITTING/DONE/FAILED/CANCELLED | Wizard jumps to VALIDATED then COMMITTING; PREVIEWED/FAILED/CANCELLED unused | M |
| Import report asset | `reportMediaAssetId` on job | Never written; CSV is generated on demand | S |
| Publisher CRUD | Model + import create | Admin list/create/edit/deactivate | M |
| SKU images | No field on `BookSku` / `BookTitle` | Media join or asset FK | M |
| SKU delete / discontinue UX | Status enum includes DISCONTINUED; soft `deletedAt` | No delete action in UI | S |
| Barcode uniqueness | App-level check; `@@index` only | Unique constraint (null-safe) | S |
| `searchText` index | `contains` query | Missing DB index / trigram | M |
| Document sequence | Helper + raw UPSERT SQL | No caller outside tests | — (blocked on sales) |
| Agency settings runtime | Persist only | Consumers (sales/treasury/commission) | see later phases |
| `books.export` | Used only for import CSV | Catalog export XLSX not built | M |

### Book ERP — not started (sidebar `enabled: false`)

| Feature | Current state | Missing | Effort |
| --- | --- | --- | --- |
| Warehouses + stock ledger | Schema comment forbids scalar stock | Tables, movements, locations, counts | XL |
| Reservations / shortage / replenishment | Placeholder cards | Domain + UI | XL |
| Sales orders | Nav disabled | Documents using `DocumentSequence`, pricing, partner | XL |
| Treasury (deposit / installments) | Settings fields exist | Ledger, receipts, aging | XL |
| Marketing / schools | Nav only | Campaigns, school accounts | XL |
| Teacher/advisor commission | Privacy toggle exists | Rules, dashboards | XL |
| Partner portals | Nothing | Auth surface | XL |
| Executive reports | Nav only | Warehouse/sales dependent | L–XL |
| BookSku ↔ CommerceItem link | None | Product decision first | L |

### Booklet commerce — incomplete

| Feature | Current state | Missing | Effort |
| --- | --- | --- | --- |
| Category admin UI | Seed + `listAdminCommerceCategories` for product form; page is empty-state “به‌زودی” | Nested CRUD using existing validation helpers | M |
| Payments admin page | Empty state claims checkout is not connected | List PaymentIntents for `COMMERCE_ORDER` (checkout **is** connected) | M |
| `commerce.reports.view` | Permission + FINANCE role | No page; performance uses `orders.view` | M |
| `commerce.manage` | Constant only | No page/action | S (or delete later) |
| Discount codes | Stored on `CommerceOrder.discountCode` | Not applied to `discountRials` on shop checkout (always 0) | M |
| Inventory restock | Decrement only | Increment on cancel/refund; status back from OUT_OF_STOCK | M |
| Variants / gallery / customer | `extensions.ts` notes | Deferred tables | L each |
| `CommerceBusinessType` admin | Model exists | No UI | M |
| Product list pagination/filters | Unbounded `findMany` | Search/status/page | M |
| Dual catalog | Two masters | Explicit product strategy | L (decision + design) |

---

## 4. Dead Code

Not “never imported,” but **unused by any live flow**, placeholder, or leftover from the status machine.

| Item | Why |
| --- | --- |
| Sidebar items with `enabled: false` (warehouses, reservations, sales, treasury, marketing, commission, reports) | Labels only; no href |
| `/admin/commerce/categories` page | Empty placeholder; seed/validation live unused by UI |
| `/admin/commerce/payments` page | Stale empty state; checkout already works |
| `commerce.manage`, `commerce.reports.view` | Permission keys with no consumer |
| `nextDocumentSequenceValue` / `formatDocumentNumber` | Only unit-tested; no sales/procurement caller |
| `COMMERCE_EXTENSION_NOTES` | Documentation constant, never imported elsewhere |
| `BookAgencyProfile` fields never read in UI/runtime: `logoMediaAssetId`, `centralVisibleToAllCashiers`, `instantInternalTransfer`, `invoiceAtFulfillment`, `barcodeSymbologyDefault`, `numberFormatPrefix` | Schema-ready, no form, no consumer |
| Import enum values `UPLOADED`, `PREVIEWED`, `FAILED`, `CANCELLED` and row action `SKIP` | Wizard never sets them (`DUPLICATE_FLAG` used instead of `SKIP`) |
| `BookImportJob.reportMediaAssetId` | Column unused |
| Public QR route `/booklet/[token]/qr` vs admin QR | Both valid; public one is unauthenticated by design |

No unused Book ERP **pages**. No `app/api` commerce/books routes sitting idle.

`lib/commerce/index.ts` re-exports a large surface; that is a barrel, not proof of unused internals.

---

## 5. UI Review

No redesign. Weaknesses only.

### Book ERP

- **Hierarchy:** Overview → catalog is clear. Settings and types feel like secondary tools, which is correct. Disabled sidebar items still occupy mental space when the flag is on.
- **Spacing / cards:** `admin-card` + Tailwind grids are consistent with other admin modules. Overview mixes live stats and “به‌زودی” cards; the grey “به‌زودی” type is honest but looks unfinished.
- **Typography:** Persian labels are consistent. Internal codes `dir="ltr"` — good. Catalog table has no barcode column despite search supporting barcode.
- **Forms:** `BookSkuForm` is a long single card, `noValidate` (browser required attributes exist but HTML5 validation is off). Publisher cannot be typed inline — must exist first (import can create, form cannot).
- **Tables:** Catalog min-width 720px, horizontal scroll. No pagination, no row actions except title link. No bulk.
- **Buttons:** Primary for create; outline for types/import. Filter submit is secondary-tint — fine.
- **Filters:** 10 controls in a 4-column grid; dense on tablet. Price min/max are easy to misunderstand given they only filter the current page.
- **Consistency:** Matches admin tokens (`text-primary`, `border-border`). Types page is a stack of small forms, not a table — different pattern from catalog.
- **Responsiveness:** Grids collapse; tables scroll. Import wizard steps are chips, not a full stepper — usable on mobile but mapping many columns will be painful.
- **Accessibility:** Overview has `sr-only` section titles. Forms have associated labels. Import/result errors are text only (no `role="alert"`). Catalog table has no caption / row headers beyond `th`.

### Booklet commerce

- **Ops workspace is the densest screen in the product** (filters, KPIs, list, drawer, bulk, SMS). Powerful, not simple.
- Hub is four links; production/pickup/performance are **not** on the hub even though they are in the sidebar — hub is incomplete as a map.
- Categories and payments pages are empty states next to a live shop — high confusion.
- Product table has no filters; fine at small N, empty of search.
- Pickup + signature pad is purpose-built; labels page is print-oriented (`PrintQueueButton`).
- Public shop uses SiteShell/PageHero — visually a different language from admin, which is expected.

---

## 6. Database Review

Do not modify schema. Observations only.

### Book ERP relationships

```
Organization 1—1 BookAgencyProfile
Organization 1—* DocumentSequence (org, documentType, periodKey)
Organization 1—* BookPublisher 1—* BookTitle
Organization 1—* BookType 1—* BookTitle
BookTitle *—1 StudentGrade / Subject / StudentMajor (optional)
BookTitle 1—* BookSku
BookSku 1—* BookSkuPrice (temporal LIST/SALE)
BookSku *—* Tag via BookSkuTag
BookImportJob 1—* BookImportRowResult *—? BookSku
```

### Indexes that exist

- SKU: unique `(organizationId, internalCode)`, index status/deleted, barcode (non-unique), titleId.
- Price: `(organizationId, skuId, kind, effectiveFrom)`, `(organizationId, skuId, effectiveTo)`.
- Import jobs: createdAt, status.
- Title: publisher/type/grade/subject/major/deletedAt.

### Missing / weak

- **No unique barcode** (duplicates possible under race).
- **No `searchText` index** (ILIKE/`contains` will degrade).
- **No covering-price uniqueness** (two open LIST rows for one SKU possible under concurrent import).
- **Price filter cannot use SQL** without a current-price view/column.
- **Title uniqueness** is application “same title + publisher” on create; DB has no unique on `(org, title, publisherId)`.
- **Import commit is not one transaction**; partial catalog writes survive a crash mid-job.
- **`OrganizationFeatureFlag` is generic** — good. Payload JSON unused.

### Booklet models

`CommerceItem` is a universal sellable (systemKind, shipping/digital/scheduling flags) used in practice as **physical booklets**. Scalar stock on the item (not a ledger). Orders snapshot line titles/SKUs. QR token + shortCode unique globally (not per-org).

### Possible problems

1. Two catalogs, zero FK between `BookSku` and `CommerceItem`.
2. `CommerceOrder.discountCode` is a string, not an FK to a commerce coupon table (guidance discounts are a different module).
3. Soft-delete on SKU vs unique `internalCode` — re-creating the same code after soft-delete may hit unique if `deletedAt` is not part of the unique key (unique is `(organizationId, internalCode)` **without** deletedAt → **cannot reuse a code after soft-delete**).
4. `BookImportRowResult.skuId` `onDelete: Restrict` can block SKU hard-delete.

---

## 7. API Review

There is almost no REST. Treat Server Actions + 3 routes as the API.

### Routes

| Endpoint | Purpose | Auth | Validation | Gaps |
| --- | --- | --- | --- | --- |
| `GET /admin/commerce/orders/export.xlsx` | Filtered order workbook | Session + `orders.view` + branch | Query parsed by `parseAdminCommerceOrderFilters` | 503 if exceljs path fails; no row cap documented in route |
| `GET /admin/commerce/orders/qr/[token]` | Staff QR PNG | Session + `orders.view` + branch | Token trim; lookup by `qrToken` | Token in URL (cache: no-store) |
| `GET /booklet/[token]/qr` | Public QR PNG | Org only | Token parse | Unauthenticated; relies on unguessable token |

Payment checkout/callback for `COMMERCE_ORDER` lives in `lib/payment/service.ts` (shared payment API), not under `/commerce`.

### Book actions

| Action | Auth | Validation | Error handling | Gaps |
| --- | --- | --- | --- | --- |
| SKU create/update | `books.catalog.manage` + flag | Form → `BookSkuFormInput`; status enum fallback to ACTIVE | `BookCatalogError` → user message | `noValidate` on client |
| Type create/update | same | Label required; code slug | Duplicate code | No delete; code immutable after create (not sent on update) |
| Import inspect/validate/commit | `books.import` + flag | File size/type/magic, mapping JSON, row caps | Caught → `{ ok: false, error }` | Re-uploads file on every step (no server-side blob store); commit not transactional |
| Import CSV download | `books.export` + flag | Job org-scoped | Throws if missing | Client blob download; no audit |
| Settings update | `books.settings.manage` + flag | Int clamp; booleans from `"on"` | Success/error state | Unlisted profile columns never updated |

### Commerce actions

All go through `requirePermission`. Branch scope applied on ops mutations via `allowedBranchIds`. Rollback uses `commerce.orders.rollback` (correct). SMS actions sit on the same file; confirm each checks `orders.manage` (they do via session in that module).

**Missing validation notes**

- Shop checkout: item/org required; buyer fields trimmed; no CAPTCHA/rate limit visible in the action.
- Discount code accepted on admin order profile, **not** priced.
- Bulk ops: trust form IDs within org/branch (service-layer scoped — verify remains important).

---

## 8. Excel Import Review

**Upload:** Client `File` posted on inspect, validate, and commit (three full uploads). No durable blob; checksum SHA-256 stored on job at commit.

**Parsing:** ExcelJS, first worksheet, values only. Formula cells flagged and **rejected** (not evaluated). Control chars stripped. Arabic Yeh/Kaf normalized.

**Security:** Extension + ZIP magic bytes; 8 MB / 5k rows / 40 cols; CSV cells prefixed if they start with `=+−@`. Mapping JSON is field-name allowlist from the client (unknown fields ignored by mapping type, but a malicious mapping can still point columns at known fields — expected). Authz: `books.import` + flag.

**Mapping:** Alias table (FA/EN) for code, title, publisher, type, grade, subject, major, edition, year, barcode/ISBN, list/sale price, keywords, tags. Unused columns `IGNORE`. Duplicate suggested fields forced to IGNORE.

**Preview:** First 20 data rows in inspect; validate returns up to 50 invalid rows.

**Commit:** Chunks of 200. Per-row process (taxonomy resolve, insert or update). Job `processedRows` incremented per chunk. Final status **always `DONE`** if the action’s try/catch did not throw — row-level ERRORs still `DONE`.

**Rollback:** **None.** Partial inserts remain. No cancel action. Failed throw after job create can leave a VALIDATED/COMMITTING job (catch returns error; status may stick).

**Sale price gap:** UPDATE path does not maintain SALE history.

**Taxonomy:** Missing publishers/types can be created; grades/subjects/majors cannot — correct given school masters, but operators will see row errors if Excel names drift.

**Report:** CSV download by job id; not stored as `MediaAsset`.

---

## 9. Catalog Review

### Book ERP catalog

| Concern | Implementation |
| --- | --- |
| Book / title | `BookTitle` master; `BookSku` is the sellable edition (internalCode) |
| Categories | **None** (types ≠ merchandising categories) |
| Book types | `BookType` admin + seed |
| Grades / subjects / fields | FKs to school taxonomies |
| Pricing | Temporal `BookSkuPrice` LIST/SALE; never in-place amount update |
| SKU | `internalCode` unique per org |
| Barcode | Optional string; app unique; indexed |
| Images | **None** |
| Status | ACTIVE / INACTIVE / DISCONTINUED |
| Stock | Intentionally absent |

### Booklet catalog (`CommerceItem`)

| Concern | Implementation |
| --- | --- |
| Categories | Nested `CommerceCategory` + M2M; **admin UI missing** |
| Types | `CommerceBusinessType` + `systemKind`; **no type admin** |
| Grades / subjects | **Labels on the item**, not FKs |
| Pricing | `basePriceRials` / `salePriceRials` + optional window |
| SKU / barcode | Optional, indexed SKU, not unique |
| Images | `primaryImageAssetId` only (gallery deferred) |
| Status | DRAFT / ACTIVE / OUT_OF_STOCK / ARCHIVED + `isVisible` |
| Inventory | Scalar qty or unlimited |

These catalogs **must not be treated as one** until a mapping strategy exists.

---

## 10. Settings Review

### Book agency (`BookAgencyProfile`)

| Field | UI | Runtime | Verdict |
| --- | --- | --- | --- |
| `legalName` | Yes | None (no invoices yet) | Future-ready persist |
| `defaultDepositPercent` | Yes | None | Future-ready |
| `defaultReservationTtlHours` | Yes | None | Future-ready |
| `allowIssueUnpaid` | Yes (copy says unused) | None | Placeholder |
| `installmentEnabled` | Yes | None | Placeholder |
| `countGiftsInGmv` | Yes | None | Placeholder |
| `showStudentNamesToTeachers` | Yes | None | Placeholder |
| `logoMediaAssetId` | No | No | Dead / future schema |
| `centralVisibleToAllCashiers` | No | No | Dead / future schema |
| `instantInternalTransfer` | No | No | Dead / future schema |
| `invoiceAtFulfillment` | No | No | Dead / future schema |
| `barcodeSymbologyDefault` | No (default CODE128) | No generator | Dead / future schema |
| `numberFormatPrefix` | No (default `BA`) | Sequence helper unused | Dead / future schema |

Org flag `bookCommerce` is the real on/off setting (script + DB), not this form.

### Booklet

| Setting | State |
| --- | --- |
| Commerce notification SMS | **Implemented** (`CommerceNotificationSettings`) |
| Category merchandising | Seed **implemented**; admin **placeholder** |
| Payments dashboard | **Placeholder / stale** |
| `extensions.ts` | Documented deferred |

---

## 11. Reports Review

### Existing

- Book overview: four catalog counts + last import hint. Not a report.
- Import job history + per-job CSV.
- Booklet: ops KPIs, production grouping, staff performance dashboard, order XLSX export.
- Global `/admin/reports/staff-performance` is CRM/staff, not book GMV.

### Missing (Book ERP — called out in schema/nav)

- On-hand / shortage / replenishment
- Open reservations
- Deposit remainder / installment aging
- Bestsellers / GMV (gift inclusion flag unused)
- Publisher / type mix
- Import quality over time
- Teacher commission

### Missing (booklet)

- Dedicated finance payments/reconciliation UI (`commerce.reports.view` unused)
- Discount effectiveness (codes stored, not priced)
- Inventory valuation / stockouts history

---

## 12. Security Review

**Authentication**

- All `/admin/books/*` and `/admin/commerce/*` require admin session.
- Book pages additionally require org flag.
- Public shop checkout is unauthenticated (expected for storefront).
- Public booklet ticket + QR: knowledge of `qrToken` / short link.

**Authorization**

- Book: permission + flag. Roles below org admin cannot see books even if flag is on.
- Booklet ops: branch OR on `branchId` / `pickupBranchId` for QR/export/pickup.
- `commerce.orders.rollback` correctly separated.

**Validation**

- Import file type/size/formula rejection is solid for an internal tool.
- SKU prices are integers; settings ints clamped.
- Shop checkout logs org/item/order to stdout (PII-adjacent: order ids; buyer data not in the info log snippet).

**Dangerous / sensitive**

1. **Public QR PNG** — anyone with the token gets the image. Token entropy is the control.
2. **Import commit** — can create publishers/types and bulk-update prices; permission is coarse (`books.import`).
3. **No import rollback** — a bad file with UPDATE_EXISTING can rewrite titles/prices with no undo.
4. **Race on barcode/internalCode** — check-then-insert without unique barcode.
5. **Stale payments page** does not leak data; it **hides** live payment state from finance users.
6. **`books.export` CSV** is org-scoped; good.

**Missing checks**

- Rate limit on public checkout.
- Idempotency key on shop order create (double-submit can create two orders — verify payment layer).
- Catalog Excel stored only in memory; still parsed server-side (ExcelJS XXE-class risk is historically lower for xlsx zip, but untrusted office files remain a residual risk).

---

## 13. UX Review

**Production-ready?**

- Booklet shop + ops: **usable in production** for a single-item physical booklet flow, with known holes (categories UI, payments screen, restock, discounts).
- Book ERP: **catalog admin is usable for data entry**, not a sellable agency product. Overview itself says Phase A.

**Unfinished feel**

- “به‌زودی” everywhere on books overview and commerce categories/payments.
- Disabled nav rows in بازرگانی کتاب.
- Settings that warn they do nothing.
- Catalog pagination missing after 24 SKUs.

**Confusing**

- Two “book” worlds: فروشگاه vs بازرگانی کتاب.
- Payments page vs live `/shop` checkout contradiction.
- Categories seeded and selectable on product form, but the categories page says management is coming.
- Grade/subject as FKs in ERP vs free labels in booklet.

**Friction**

- Publishers cannot be created from the SKU form.
- Import requires three file uploads.
- Price sort/filter lies (current page only).
- No catalog images.
- No way to export the catalog (only import report).
- Ops workspace cognitive load for new staff.

---

## 14. Performance Review

| Risk | Detail |
| --- | --- |
| Catalog price filter/sort | Loads one page then filters in memory → empty pages / wrong totals |
| `listAdminCommerceItems` | Unbounded `findMany` + category/image include |
| Import `processOneRow` | Many sequential queries per row (publisher/type/grade/subject/major/sku/barcode/price); 5k rows = very heavy; not chunk-transactional |
| `resolveTaxonomyIds` | N lookups per row; no request-level cache |
| Ops order list | Feature-rich; watch payload size of workspace (detail fetch per selection — check N+1 when opening many drawers) |
| Labels page | Generates QR data URLs for up to 80 orders in one request |
| Shop list | `revalidate = 120`; OK. Filters hit DB each miss |
| `searchText contains` | Unindexed |
| CatalogImportWizard | Client component; mapping module split to avoid exceljs in client bundle — **good** |
| No dedicated books hooks | No extra client subscription churn |

Heavy client bundles: `OrderOpsWorkspace` tree and import wizard. Book SKU form is light.

---

## 15. Technical Debt

1. Dual catalog with overlapping language (SKU, barcode, grade, price) and no link.
2. Book ERP schema comments vs missing architecture pack in repo.
3. Import status machine unused states.
4. Agency profile columns without UI.
5. `commerce.manage` / `commerce.reports.view` orphan permissions.
6. Payments page copy drift from `startCheckoutForCommerceOrder`.
7. Categories: seed + validation ready, UI not.
8. Discount code field without pricing engine.
9. Inventory decrement without restock.
10. `extensions.ts` as code comments instead of a ticket list.
11. Sequence helper using raw SQL UPSERT — fine, but orphan until sales.
12. Title reuse heuristic (same title+publisher) vs import always creating a **new** title on INSERT even if an identical title exists.
13. Soft-delete vs unique `internalCode` (codes not recyclable).
14. `noValidate` on SKU/settings forms.
15. Console logging in shop checkout.
16. Next version mismatch vs original brief (16 vs 15) — docs/planning should use 16.
17. Deploy snapshot copies of schema/admin nav under `deploy/` — ignore for product planning; source of truth is `prisma/schema.prisma` + `content/admin.ts`.

---

## 16. Recommended Roadmap

Do not implement here. Assumes the next **product** goal is to finish Book ERP without breaking live booklet ops. Dual-catalog decision is Sprint 1 because it blocks warehouse/sales design.

### Sprint 1 — Catalog truth + stop the bleeding

**Goal:** Make Book ERP catalog trustworthy and decide how it relates to the live shop.

**Features**

- Product decision: keep two catalogs vs map `BookSku` → `CommerceItem` vs booklet-only forever.
- Fix catalog pagination UI.
- Fix price filter/sort (correct totals, not in-memory page slice).
- Import: SALE price on UPDATE; job `FAILED` on throw; do not mark `DONE` as success-with-errors without a visible error summary (behavior change, not silent).
- Unique barcode (nullable unique) + document the internalCode/soft-delete trap.
- Rewrite payments admin empty state **or** list live COMMERCE_ORDER payments (copy currently false).
- Publisher list/create (minimal).

**Risk:** Unique barcode migration if dirty data exists. Dual-catalog decision if delayed will waste warehouse work.

**Dependencies:** Flag-on org for QA; sample XLSX; existing booklet orders must keep working.

### Sprint 2 — Import hardened + booklet holes that confuse operators

**Goal:** Safe bulk catalog loads; booklet admin matches reality.

**Features**

- Import: persist file checksum job through inspect; optional transactional chunks / compensating notes; cancel; store CSV as media or keep download.
- Category admin CRUD (seed already there).
- Product list search/pagination.
- Restock on cancel/refund.
- Decide booklet discount codes (wire or hide the field).

**Risk:** Import transaction timeout on 5k rows. Category tree UX.

**Dependencies:** Sprint 1 barcode/price correctness.

### Sprint 3 — Warehouse foundation (Book ERP Phase C)

**Goal:** Quantity exists without putting a scalar on `BookSku`.

**Features**

- Ledger model (location, movement, on-hand view).
- Replace overview “به‌زودی” stock card with real numbers.
- Enable nav “انبارها و موجودی” behind same `bookCommerce` flag + new permissions.
- Barcode scan for receive/count (symbology setting becomes real).

**Risk:** Highest schema risk; must not touch `CommerceItem.stockQuantity` unless Sprint 1 chose unification.

**Dependencies:** Sprint 1 decision; `DocumentSequence` still unused until documents exist.

### Sprint 4 — Sales documents + settings that start meaning something

**Goal:** First Book ERP order: quote/reserve/fulfill using sequence + agency profile.

**Features**

- Sales order / reservation TTL / deposit % / allow-unpaid.
- Consume `nextDocumentSequenceValue` + `numberFormatPrefix`.
- Partner/school account minimum (not full marketing).

**Risk:** Overlap with booklet `CommerceOrder` if naming/UX is unclear.

**Dependencies:** Warehouse on-hand (or explicit “sell without stock” flag).

### Sprint 5 — Treasury, reports, commission slice

**Goal:** Money and management views that the overview already promises.

**Features**

- Deposit remainder, installments (`installmentEnabled`).
- Executive reports (GMV + `countGiftsInGmv`).
- Teacher commission dashboard (`showStudentNamesToTeachers`).
- Finance payments screen for booklet + ERP (if ERP payments exist).

**Risk:** Scope explosion into a second ERP. Keep booklet SMS/ops frozen unless bugs.

**Dependencies:** Sprint 4 documents; accounting rules signed off.

---

## Inventory counts (for planning)

| Kind | Count |
| --- | --- |
| Pages (`page.tsx`) | **24** (7 Book ERP + 12 commerce admin + 1 notify settings + 4 public) |
| Dedicated UI components | **36** (+ `order-ops-types.ts`) |
| HTTP `route.ts` | **3** |
| Server Action modules | **7** (~27 exported actions) |
| Prisma dedicated models | **19** (11 Book ERP including feature flag + 8 Commerce) |
| Book ERP lib files | **15** |
| Commerce lib files | **48** |

---

*End of audit. Generated as a planning inventory only.*
