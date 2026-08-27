# 01 — Architecture

**Status:** DRAFT — awaiting approval  
**Style:** SAP / Odoo / Dynamics-inspired modular ERP, implemented as StarOS bounded contexts.

[Index](./README.md) · Previous: [Current state](./00-current-state.md) · Next: [Database ERD](./02-database-erd.md)

---

## 1. Design principles

1. **Production never breaks.** Feature flags default off. Additive Prisma migrations. No rewrite of CRM, booking, forms, portal, or SMS.
2. **One platform, two merchandise lines.** Booklet (جزوه) and Book Agency (کتاب) share *platform* services (identity, payments, SMS, Excel, QR, audit). They do **not** share ops pipelines.
3. **Ledger over scalar.** Stock, money, points, and commission move through append-only journals. Snapshot tables exist for speed, not as the only truth.
4. **Documents over status soup.** Order, reservation, payment allocation, invoice, receipt, delivery note, purchase order, goods receipt, count sheet, adjustment — each is a document with lines, status, and audit.
5. **ATP before hope.** An order line that needs stock must reserve it. Over-sell is an explicit policy per SKU (`allowBackorder`), default false.
6. **Persian-first, UTC-canonical.** UI and Excel are Jalali / fa-IR. Database instants are UTC. Money is integer Rials.
7. **Tenant always in the query.** Every repository function takes `organizationId`. Branch scope from the session.
8. **Workers for heavy work.** Import, commission settlement, reservation expiry, SMS — CLI cron, same as existing StarOS workers.
9. **Configurable before hardcoded.** Commission, campaigns, coupons, gifts, targets, SMS templates, and document numbering are data, not deploys.
10. **Approve then code.** This document is the contract.

---

## 2. Context map

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         StarOS Platform (existing)                       │
│  Identity / RBAC / Org+Branch / AuditLog / Media / SMS / OTP / Outbox    │
│  Payment Foundation (PaymentIntent / Session / EventLog)                 │
│  CRM Lead · Student · Guardian · User (link, do not clone)               │
└────────────┬─────────────────────────┬─────────────────┬─────────────────┘
             │                         │                 │
             ▼                         ▼                 ▼
┌────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ Booklet Commerce   │   │ BOOK AGENCY ERP     │   │ Marketing Engine    │
│ (feature branch)   │   │ (this design)       │   │ (this design)       │
│ PHYSICAL print     │   │ Published books     │   │ Partners, campaigns │
│ production pickup  │   │ Inventory + orders  │   │ wallet, commission  │
└────────────────────┘   └──────────┬──────────┘   └──────────▲──────────┘
                                    │                         │
                                    │  events / coupons       │
                                    └─────────────────────────┘
```

### Shared platform services (reuse, do not fork)

| Service | Reuse |
|---------|--------|
| Auth | `lib/auth/*` sessions + `PERMISSIONS` |
| Tenancy | `organizationId` / `branchId` composite FKs |
| Payments | `PaymentIntent` with `payableType = COMMERCE_ORDER` (or additive `BOOK_ORDER` if we must isolate; prefer reuse with `productLine` in metadata + FK) |
| SMS | `SmsTemplate` + `SmsMessage` + worker |
| Excel | `exceljs` + import-report pattern (`CrmLeadImportReport`) |
| QR | `qrcode` + opaque tokens |
| Media | `MediaAsset` for covers |
| Audit | `AuditLog` + domain event outbox |
| Datetime | `lib/datetime/jalali.ts`, Tehran zone at edges |
| Admin UI | `AdminShell`, `AdminPageHeader`, cards, empty states |

### New bounded contexts (this ERP)

| Context | Owns |
|---------|------|
| **Catalog** | Book master data, SKU, taxonomies, barcode, price list |
| **Inventory** | Warehouses, balances, movements, reservation, counts, adjustments |
| **Sales** | Customers (Party), orders, order items, delivery, invoices, receipts |
| **Treasury** | Partial payments, deposits, remaining balance, allocations |
| **Procurement** | Suppliers, purchase planning, purchase orders, goods receipt |
| **Marketing** | Partners, campaigns, referrals, coupons, commission, wallet, gamification |
| **Insights** | Operational reports + analytics rollups (read models) |

---

## 3. Runtime architecture (when built)

```text
Browser (RTL admin / optional public catalog)
        │ Server Actions + Route Handlers (Next.js 16)
        ▼
lib/books/* domain services (org-scoped, transactional)
        │ Prisma 7
        ▼
PostgreSQL  (OLTP ledgers + snapshot balances + import jobs)

Side paths (not request-critical):
  DomainEventOutbox → existing/new CLI workers
  SmsMessage queue  → communication:worker-once
  Excel import job  → books:import-worker-once
  Reservation TTL   → books:reservation-expiry-once
  Commission settle → books:commission-worker-once
```

**No new runtime** (no separate Nest/ERP process). Same Node app, same VPS, same Postgres. Scalability is schema + workers + indexes + snapshot tables, not a microservice split.

---

## 4. Product line discriminator

Every sellable row and every order carries:

```text
CommerceProductLine = BOOKLET | BOOK_AGENCY | OTHER
```

- Queries for the Book ERP **must** filter `productLine = BOOK_AGENCY`.
- Booklet ops **must** filter `BOOKLET`.
- Reports that show “all merchandise” are explicit and permissioned.

If booklet commerce is **not** merged when Book ERP starts, we still introduce `Commerce*` tables with this discriminator so a later merge is a data backfill (`BOOKLET` on existing rows), not a rewrite.

---

## 5. Domain modules (the requested 30)

Each module below is a **capability** with: purpose, source of truth, key documents, production-safe notes.

### 5.1 Product Catalog

**Purpose.** Single catalog of published books for the agency.

**Truth.** `BookTitle` (work) → `BookSku` (edition / internal code / barcode) → optional `CommerceItem` projection for storefront.

Why two layers:

- Thousands of titles share group/major/publisher.
- The same title can have multiple editions and prices over time.
- Storefront slug / SEO / cover live on `CommerceItem` without polluting master data.

**Fields (SKU):** internalCode (required, unique per org), barcode (unique when not null), ISBN (optional), title, group, major, publisherId, editionLabel, editionYear, listPriceRials, salePriceRials, status (DRAFT / ACTIVE / INACTIVE / DISCONTINUED), cover, notes.

**Rules.** Price changes never rewrite historical order lines (snapshot on `CommerceOrderItem`). Inactive SKUs cannot enter new orders; existing reservations complete or cancel by policy.

**Admin UX.** Search-as-you-type on internal code, barcode, title; filters for group/major/publisher/status; bulk activate; Excel import.

### 5.2 Inventory

**Purpose.** Know on-hand, reserved, incoming, damaged, and **available** per warehouse per SKU.

**Truth.** `InventoryMovement` (ledger) + `InventoryBalance` (cached projection, updated in the same transaction).

```text
qtyAvailable = qtyOnHand - qtyReserved - qtyQuarantine
ATP         = qtyAvailable + qtyIncoming  (if allowBackorder)
```

**Forbidden.** Updating `stockQuantity` on the item row as the only write. A compatibility projection may exist for booklet SKUs.

### 5.3 Warehouse movements

**Purpose.** Every stock change is a typed document line.

| Movement type | Meaning |
|---------------|---------|
| `PURCHASE_RECEIPT` | Goods in from supplier / central warehouse |
| `SALES_ISSUE` | Goods out to customer |
| `RESERVE` / `RELEASE` | ATP hold / free |
| `TRANSFER_OUT` / `TRANSFER_IN` | Branch/warehouse transfer (two-step with in-transit) |
| `ADJUST_IN` / `ADJUST_OUT` | Authorized correction |
| `COUNT_GAIN` / `COUNT_LOSS` | Physical count variance |
| `RETURN_IN` / `RETURN_OUT` | Customer or supplier return |
| `DAMAGE` / `WRITE_OFF` | Quarantine / scrap |

**Rules.** Movements are append-only. Reversals are new movements with `reversesMovementId`. Idempotency key per `(organizationId, source, sourceId, type)`.

### 5.4 Orders

**Purpose.** Replace handwritten orders.

**Document.** `CommerceOrder` with `productLine = BOOK_AGENCY`.

**Sales statuses (books, not booklet ops):**

```text
DRAFT → CONFIRMED → PARTIALLY_PAID / PAID → PARTIALLY_FULFILLED / FULFILLED → CLOSED
                 ↘ CANCELLED
                 ↘ ON_HOLD
```

Staff can capture an order in 30 seconds: customer mobile, SKU scan or code, qty, deposit, pickup branch.

**Numbering.** `BA-1405-000123` per org, gapless preferred via Postgres sequence **per organization** (dedicated table `DocumentSequence`, not a global serial).

### 5.5 Order items

Immutable snapshots: title, internalCode, barcode, unit price, discount, qty, tax, warehouse, fulfillment qty.

Partial fulfill: `qtyOrdered`, `qtyReserved`, `qtyIssued`, `qtyReturned`.

### 5.6 Reservation

**Purpose.** Stop selling air.

- On CONFIRMED (or DRAFT if policy `reserveOnDraft`): create `StockReservation` with TTL (default 24h, configurable).
- Payment / deposit **extends or converts** reservation (configurable: deposit ≥ X% converts to firm allocation).
- Expiry worker releases ATP and optionally SMS the customer / flags staff.
- Never decrement `qtyOnHand` at reserve time — only `qtyReserved`.

### 5.7 Partial payment

**Purpose.** Pay in several receipts against one order.

`PaymentIntent` remains the provider/cash attempt.  
`PaymentAllocation` links intent → order (amountRials).  
Order `paymentStatus`: `UNPAID | DEPOSIT | PARTIAL | PAID | REFUNDED | OVERPAID` (overpay is held as customer credit, not silently ignored).

Existing enum on booklet branch already has `PARTIAL`. Book ERP must **use it for real**, with allocations, not as a cosmetic badge.

### 5.8 Deposit (بیعانه)

A deposit is a **named allocation** with `allocationKind = DEPOSIT`.

Configurable policies (org-level, overridable per campaign):

| Policy | Default |
|--------|---------|
| Min deposit % | 30% |
| Min deposit amount | 0 |
| Deposit firms reservation | true |
| Deposit expiry | 7 days after due |
| Forfeit / refund rules | refundable until issue; after issue follow returns |

**Ageing view:** deposits not completed, due date, owner staff, customer mobile — this is how “forgotten deposits” die.

### 5.9 Remaining balance

First-class fields on the order (recomputed in the payment transaction, stored for list performance):

- `grandTotalRials`
- `paidRials`
- `depositRials` (subset of paid)
- `remainingRials`
- `balanceDueAt`

UI always shows **مانده** in red if > 0. Pickup/issue can be blocked when remaining > 0 unless permission `books.orders.issue_unpaid` (manager override, audited).

### 5.10 Customer profile

**Entity:** `Party` (person or organization) + `CustomerProfile`.

Links (nullable, unique where it makes sense):

- `userId` (portal login)
- `leadId` (CRM)
- `studentId`
- `guardianId`
- school `Party` for bulk/school orders

Fields: name, mobile (normalized), national code, city, notes, tags, credit hold, default branch.

**Do not** create a second student master. If a student buys a book, the Party links to `Student`.

### 5.11 Delivery

Documents: `DeliveryNote` (حواله خروج / رسید تحویل).

Methods (enum, additive):

- `PICKUP_ONSITE` (reuse booklet meaning)
- `SCHOOL_BATCH` (تحویل به مدرسه)
- `COURIER` (phase 2 — do not build carrier APIs in v1)
- `INTERNAL_TRANSFER` (to another branch for pickup)

Proof: QR scan, optional signature (booklet pickup already has signature pad — reuse UI pattern), staff user, timestamp, note.

### 5.12 Invoice

`FinancialDocument` type `INVOICE` (proforma vs final).

- Snapshots totals; never a live join to mutable prices.
- Numbered, printable A5/A4 RTL.
- One order may have proforma then final; payments attach to the order, not only the invoice (SAP-style: AR on the customer + clearing).

v1 simplification (recommended): **invoice is a print/legal view of the order totals**, with its own number, not a full separate AR submodule. Remaining balance still lives on the order. Full AR ageing can land in a later finance sprint without schema rewrite if `FinancialDocument` is generic.

### 5.13 Receipt

`FinancialDocument` type `RECEIPT` (رسید دریافت وجه).

Methods: `CASH | CARD | TRANSFER | ONLINE | OTHER` (already on booklet payment method enum).

Each receipt creates or completes a `PaymentIntent` (offline providers allowed: `provider = manual`) + allocation. Printable; SMS optional.

### 5.14 SMS

Reuse `SmsMessage`. Additive `SmsTemplatePurpose` values (examples):

- `BOOK_ORDER_CONFIRMED`
- `BOOK_DEPOSIT_RECEIVED`
- `BOOK_BALANCE_REMINDER`
- `BOOK_READY_FOR_PICKUP`
- `BOOK_DELIVERED`
- `BOOK_RESERVATION_EXPIRING`
- `BOOK_REFERRAL_LINK` (marketing)

Copy is template-managed in admin (existing SMS template UI). No hardcoded Persian strings in workers beyond fallbacks.

### 5.15 QR

Two namespaces (do not reuse booklet `qrToken` format blindly — prefix them):

| Token | Use |
|-------|-----|
| Order public token | Tracking page + pickup |
| Delivery token | Scan-to-deliver |
| SKU barcode/QR | Shelf / receiving |
| Referral QR | Marketing engine |
| Receipt QR | Verify authenticity |

Short codes (6–8 chars) for SMS, like booklet `shortCode`. Collision-checked per org.

### 5.16 Barcode

- Store on SKU; index unique `(organizationId, barcode)` WHERE barcode IS NOT NULL.
- Staff order UI: hardware scanner → focused input → add line.
- Count UI: scan to tick expected qty.
- Unknown barcode → “create SKU” flow (permissioned), never silent ignore.

Future: generate internal Code128 for books that have no publisher barcode.

### 5.17 Excel import

Job-based, like CRM import:

1. Upload xlsx → parse with exceljs (read values, **not formulas**).
2. Dry-run report: create / update / skip / invalid / duplicate.
3. Commit in chunks inside transactions.
4. Persist `ExcelImportReport` (generic, `jobType = BOOK_CATALOG | STOCK_OPENING | OPEN_ORDERS | PARTNERS`).

Catalog columns (v1): internalCode, title, group, major, publisher, edition, year, price, barcode, active.

Opening stock: internalCode, warehouseCode, qty, unitCost optional.

### 5.18 Excel export

Same engine. Exports: catalog, stock by warehouse, orders (+ lines), remaining balances, deposits ageing, movements, purchase orders, partner commissions.

Sanitize cell values that could be interpreted as formulas (`=`, `+`, `-`, `@`) — booking export already learned this.

### 5.19 Supplier ordering

`Supplier` (often “انبار مرکزی کانون” plus other publishers).

`PurchaseOrder` + lines: SKU, qty, expected date, unit cost, destination warehouse.

Statuses: `DRAFT → SUBMITTED → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED → CLOSED / CANCELLED`.

This replaces “books are ordered from warehouse manually.”

### 5.20 Purchase planning

Read model, not a magic AI:

- Reorder point + min/max per SKU per warehouse (`ReorderPolicy`)
- Demand from last N days + open reservations + campaign forecast (manual qty)
- Suggested PO grouped by supplier

Staff accepts/edits suggestions → creates POs. No automatic purchasing in v1.

### 5.21 Inventory counting

`InventoryCount` document: freeze optional, lines from scan or Excel, variance preview, **post** creates `COUNT_*` movements. Dual control: counter ≠ poster (permission split), overridable by manager.

### 5.22 Stock adjustment

`StockAdjustment` document with reason codes (`FOUND`, `DAMAGED`, `DATA_ERROR`, `THEFT`, `OPENING_BALANCE`). Always a movement + audit. Never a hidden UPDATE on balance.

### 5.23 Reports

Operational, org-scoped, branch-filterable, Jalali date range:

- Stock on hand / below reorder
- Reserved vs available
- Open orders and مانده
- Deposit ageing
- Sales by group/major/publisher/staff/branch
- Dead stock
- PO in transit
- Cash receipts by method

### 5.24 Analytics

Daily rollup table `BookAnalyticsDaily` (same pattern as `FormAnalyticsDaily`): sales qty, GMV, paid, remaining, deposits, stockouts. Dashboard widgets read rollups, not raw ledgers.

### 5.25 Audit logs

Reuse `AuditLog` with additive `AuditAction` values (BOOK_* ).  
Financial/stock documents also have their own event tables (like `CommerceOrderEvent`).  
Exports fire `DATA_EXPORTED` (already exists).

### 5.26 Permissions

See [04-permissions-ux.md](./04-permissions-ux.md). Principle: view vs manage vs issue vs adjust vs money vs marketing. FINANCE does not get stock write. WAREHOUSE does not get refund.

### 5.27 Performance

- List pages: keyset pagination, covering indexes `(organizationId, productLine, status, createdAt)`.
- Catalog search: `pg_trgm` on title + exact indexes on internalCode/barcode (phase 1 exact + `startsWith`; trigram in phase 2).
- Balances: O(1) read from `InventoryBalance`; never SUM(movements) in HTTP.
- Import: chunked worker, not one request.
- Admin dashboards: rollup tables + short TTL cache optional (`kpi` pattern if that engine is present on the merge base).

### 5.28 Scalability

- 10k–100k SKUs per org is in-scope with indexes + pagination.
- Multi-warehouse, multi-branch transfers.
- Horizontal scale = more Node workers + Postgres; no shard key other than `organizationId`.
- Outbox prevents dual-write bugs to SMS and marketing.

### 5.29 Multi branch

- Each `Branch` may have 0..n `Warehouse`.
- Orders have `salesBranchId` and `fulfillmentWarehouseId` and optional `pickupBranchId`.
- Staff `BranchMembership` restricts which warehouses/orders they see.
- Transfers: two-step (out + in) so stock is never duplicated.

### 5.30 Multi tenant

Already in StarOS. Book ERP tables **all** include `organizationId`.  
Platform admin can see across orgs only via existing `isPlatformAdmin` tools — not via unscoped Prisma finds.  
Feature flags per organization so Nasim-Shahr can enable Book Agency without enabling it for future tenants.

---

## 6. Money model (treasury)

```text
Order.grandTotalRials
        ▲
        │ allocations (sum)
PaymentIntent (PAID) ──► PaymentAllocation ──► remainingRials = total - allocated + refunded
```

- Offline cash/card: create intent `provider=manual`, mark PAID in the same transaction as the receipt document.
- Online (future): existing PaymentSession callback path; allocate on PAID.
- Refunds: new negative allocation + movement if goods returned.

**Never** store remaining only in the UI.

---

## 7. Document numbering

`DocumentSequence(organizationId, documentType, yearJalali) → nextValue`

Types: `BOOK_ORDER`, `INVOICE`, `RECEIPT`, `DELIVERY`, `PO`, `GRN`, `COUNT`, `ADJUST`, `TRANSFER`.

Format configurable per org. Concurrency: `UPDATE ... RETURNING` row lock.

---

## 8. Idempotency & concurrency

- Stock reserve uses `UPDATE InventoryBalance SET qtyReserved = qtyReserved + :q WHERE qtyOnHand - qtyReserved >= :q`.
- Payment allocations keyed by `PaymentIntent.id`.
- Imports keyed by `(organizationId, checksum)` optional skip.
- Public order create (later): idempotency key from client.

---

## 9. Integration with CRM / portal

| Event | Effect |
|-------|--------|
| New customer mobile | Optional `Party` upsert; optional Lead if source = campaign |
| Large unpaid remaining | CRM task (outbox → CRM worker), not a direct CRM write from books if that creates cycles — prefer DomainEvent |
| Student purchase | Link Party.studentId; portal “my book orders” later |
| Teacher referral | Marketing partner, not a new User role unless they log in |

---

## 10. Feature flags

```text
books.erp.enabled                  default false
books.public_catalog.enabled       default false
books.online_payment.enabled       default false
books.marketing.enabled            default false
books.backorder.enabled            default false
```

Stored as `OrganizationFeatureFlag` or JSON on org settings **if** such a table exists at implementation time; otherwise a small dedicated table. Killing `books.erp.enabled` hides nav and rejects mutations; data remains.

---

## 11. Explicit non-goals (v1)

- Rewriting booklet production kanban.
- Carrier/post APIs.
- Full accounting GL / tax engine / multi-currency.
- NextAuth / a second login product.
- Mobile native apps (responsive admin + pickup scan is enough).
- Automatic purchase posting to suppliers’ external systems.
- Hard-deleting orders or movements.
