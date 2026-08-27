# 05 — Folder Structure

**Status:** DRAFT — awaiting approval  
**Rule:** Follow existing StarOS layout (`app/admin/(dashboard)/…`, `lib/<domain>/`, `components/admin/<domain>/`, `content/` for copy). **No code in this PR.**

[Index](./README.md) · Previous: [Permissions & UX](./04-permissions-ux.md) · Next: [Roadmap](./06-roadmap.md)

---

## 1. Why this shape

- Domain logic lives in `lib/*`, not in React components.
- Server Actions stay thin (auth → permission → service).
- Booklet commerce (if merged) keeps `lib/commerce/*` for جزوه. Book Agency does **not** dump 50 files into that root.
- Marketing is a sibling context, not a subfolder of inventory.

---

## 2. Target tree

```text
docs/architecture/book-commerce-erp/     # this pack (already)

prisma/schema.prisma                     # additive models (later)
prisma/migrations/<ts>_book_erp_*/       # later

lib/auth/permissions.ts                  # additive keys only
lib/books/
  index.ts                               # public exports
  flags.ts                               # feature flags
  permissions.ts                         # books.* constants
  sequences.ts                           # document numbers
  errors.ts
  catalog/
    service.ts
    validation.ts
    search.ts
  inventory/
    balances.ts
    movements.ts
    reservation.ts
    reservation-expiry.ts
    count.ts
    adjustment.ts
    transfer.ts
    atp.ts
  sales/
    orders.ts
    order-items.ts
    totals.ts
    customer.ts
    delivery.ts
  treasury/
    allocations.ts
    deposit.ts
    remaining.ts
    receipts.ts
    invoices.ts
  procurement/
    suppliers.ts
    purchase-orders.ts
    goods-receipt.ts
    planning.ts
  import/
    parser.ts
    service.ts
    job.ts
  export/
    catalog-xlsx.ts
    stock-xlsx.ts
    orders-xlsx.ts
    sanitize.ts                          # formula injection
  reports/
    operational.ts
  analytics/
    daily.ts
    rollup-worker.ts
  sms/
    purposes.ts
    enqueue.ts
  qr.ts
  barcode.ts

lib/marketing/                           # referral engine
  index.ts
  permissions.ts
  partners.ts
  campaigns.ts
  rules.ts
  coupons.ts
  referral.ts
  attribution.ts
  commission.ts
  wallet.ts
  points.ts
  grants.ts
  targets.ts
  leaderboard.ts
  gamification.ts
  worker.ts

lib/communication/                       # additive template purposes only
lib/datetime/                            # reuse jalali

content/books.ts                         # Persian labels, empty states, nav
content/marketing.ts

app/admin/(dashboard)/books/
  page.tsx                               # dashboard
  layout.tsx                             # require flag + permission
  catalog/
  inventory/
  movements/
  counts/
  orders/
    [id]/
  balances/
  receipts/
  delivery/
  customers/
  procurement/
  import/
  reports/
  settings/

app/admin/(dashboard)/marketing/         # or /admin/books/marketing
  campaigns/
  partners/
  coupons/
  referrals/
  commissions/
  wallets/
  leaderboard/

app/admin/(dashboard)/books/export.xlsx/ # route handlers per export

app/r/[token]/route.ts                   # referral redirect (later)
app/order/ba/[orderNumber]/page.tsx      # public tracking (later)
app/shop/books/                          # public catalog (later, flagged)

components/admin/books/
  BookOrderCapture.tsx
  BookScanField.tsx
  RemainingBadge.tsx
  WarehouseSwitcher.tsx
  …

components/admin/marketing/
  …

scripts/
  books-import-worker-once.ts
  books-reservation-expiry-once.ts
  books-commission-worker-once.ts
  books-analytics-rollup-once.ts
  books-smoke.ts
  books-inventory-unit-tests.ts
```

---

## 3. What we will not do

| Anti-pattern | Why |
|--------------|-----|
| `app/book/*` for merchandise | Collides with booking |
| New `pages/` router | App Router only |
| `lib/commerce/inventory.ts` as the book ledger | Booklet file is a scalar decrement helper; books need a ledger module |
| Copy-paste SMS provider clients | Use `lib/communication/send.ts` / queue |
| Prisma calls in components | Services only |
| `any` for Excel rows | Typed parse result + field errors |

---

## 4. Shared booklet files (if that branch is merged)

Allowed reuse:

- `lib/commerce/orders/short-code.ts` (or extract a generic `lib/identifiers/short-code.ts`)
- `lib/commerce/orders/qr.ts` patterns
- Pickup QR scanner component
- `exceljs` export sanitizer
- PaymentIntent payable type `COMMERCE_ORDER`

Not reused as-is:

- `CommerceOpsStage` production kanban
- `decrementCommerceItemStock` as ATP
- Booklet SMS copy builder (new purposes)

---

## 5. Tests location

Match master: `scripts/*-unit-tests.ts` and `scripts/*-integration-tests.ts` with npm scripts. Domain math (ATP, remaining, commission uniqueness) must have unit tests **before** UI.

---

## 6. Content vs code

Persian strings for nav, badges, SMS fallbacks, empty states live in `content/books.ts` / `content/marketing.ts`, same pattern as `content/admin.ts`.
