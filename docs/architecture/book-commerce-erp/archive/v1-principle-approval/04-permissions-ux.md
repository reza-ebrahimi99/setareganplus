# 04 — Permissions, Dashboard, Navigation, UX / UI

**Status:** DRAFT — awaiting approval  
**UI canon:** existing `AdminShell`, Vazirmatn, RTL, navy/gold tokens, Persian copy.

[Index](./README.md) · Previous: [Marketing](./03-referral-marketing.md) · Next: [Folder structure](./05-folder-structure.md)

---

## 1. Permissions

Add keys to `lib/auth/permissions.ts`. **Do not** reuse `commerce.*` booklet permissions for books if booklet has already merged — overlapping “orders.manage” would let a booklet operator post stock counts. Prefer a `books.*` / `marketing.*` prefix.

### 1.1 Catalog & inventory

| Permission | Meaning |
|------------|---------|
| `books.view` | See Book ERP nav + dashboards (read, no money/stock write) |
| `books.catalog.manage` | SKU, groups, majors, publishers, prices, barcodes |
| `books.inventory.view` | Balances, movements (read) |
| `books.inventory.manage` | Transfers, receiving (GRN), reservations override |
| `books.inventory.count` | Enter counts |
| `books.inventory.count_post` | Post count variances |
| `books.inventory.adjust` | Post adjustments |

### 1.2 Orders & fulfillment

| Permission | Meaning |
|------------|---------|
| `books.orders.view` | List/detail |
| `books.orders.manage` | Create/edit draft–confirmed, cancel |
| `books.orders.fulfill` | Delivery / pickup / issue stock |
| `books.orders.issue_unpaid` | Override “block issue if remaining > 0” |

### 1.3 Money

| Permission | Meaning |
|------------|---------|
| `books.finance.view` | Invoices, receipts, remaining, deposits |
| `books.finance.manage` | Record receipt/deposit/refund |
| `books.finance.void` | Void financial documents |

### 1.4 Procurement, customers, files

| Permission | Meaning |
|------------|---------|
| `books.procurement.view` | PO / planning |
| `books.procurement.manage` | Create PO, receive |
| `books.customers.view` | Party profiles |
| `books.customers.manage` | Edit Party |
| `books.import` | Excel import jobs |
| `books.export` | Excel export (audited) |
| `books.reports.view` | Reports + analytics |
| `books.settings.manage` | Flags, sequences, deposit policies |

Marketing keys: see [03 §6](./03-referral-marketing.md).

### 1.2 Role mapping (proposed)

Extend `SystemRole` **only if** a real job cannot be expressed with existing roles + new permissions. Prefer mapping first:

| Existing role | Book ERP access |
|---------------|-----------------|
| ORGANIZATION_OWNER / ADMIN / PLATFORM_ADMIN | all `books.*` + `marketing.*` |
| BRANCH_MANAGER | view + orders + fulfill + inventory view + reports for own branches |
| FINANCE | finance view/manage, reports; **no** adjust/count_post |
| REGISTRATION_STAFF | orders manage + customers + view catalog (front desk) |
| ADVISOR | marketing view + partner notes; no stock post |
| TEACHER | none in admin (partner QR is printed by staff in v1) |
| CONTENT_MANAGER | none (unless catalog photos: `books.catalog.manage` optional) |
| REPORT_VIEWER | `books.reports.view` + `books.view` |

**New roles (optional, approval item):**

| Role | When to add |
|------|-------------|
| `WAREHOUSE_KEEPER` | If stock staff must not see CRM |
| `BOOK_CASHIER` | Front desk money + orders, no cost/PO |
| `BOOK_AGENCY_MANAGER` | Full books + marketing, no platform settings |
| `PROCUREMENT_OFFICER` | PO + planning only |

If we add roles, also add them to `STAFF_ASSIGNABLE_ROLES` and Persian `ROLE_LABELS`. Until then, map `WAREHOUSE_KEEPER` duties onto `REGISTRATION_STAFF` **only as a temporary mistake to avoid** — better to add `WAREHOUSE_KEEPER` in the same PR as the first inventory post UI.

Branch scope: all book queries use `scopedBranchWhere` analogue: warehouses whose `branchId` is in session (central warehouse visible to `allBranches` or to a new flag `seeCentralWarehouse`).

---

## 2. Navigation

**New admin group**, not mixed into booklet «فروشگاه»:

**بازرگانی کتاب** (hidden entirely if `books.erp.enabled` is false)

| Item | Href | Permission |
|------|------|------------|
| نمای کلی | `/admin/books` | `books.view` |
| کاتالوگ | `/admin/books/catalog` | `books.catalog.manage` or view |
| موجودی | `/admin/books/inventory` | `books.inventory.view` |
| حرکات انبار | `/admin/books/movements` | `books.inventory.view` |
| شمارش | `/admin/books/counts` | `books.inventory.count` |
| سفارش‌های فروش | `/admin/books/orders` | `books.orders.view` |
| مانده و بیعانه | `/admin/books/balances` | `books.finance.view` |
| صندوق / رسید | `/admin/books/receipts` | `books.finance.manage` |
| تحویل | `/admin/books/delivery` | `books.orders.fulfill` |
| مشتریان | `/admin/books/customers` | `books.customers.view` |
| تأمین | `/admin/books/procurement` | `books.procurement.view` |
| ورود اکسل | `/admin/books/import` | `books.import` |
| گزارش‌ها | `/admin/books/reports` | `books.reports.view` |

**بازاریابی کتاب** (flag `books.marketing.enabled`)

Campaigns, partners, coupons, QR, commissions, wallets, leaderboard.

Public (later, separate flags):

- `/shop/books` catalog (do not collide with booklet `/shop`)
- `/order/ba/[orderNumber]` tracking
- `/r/[token]` referral redirect

`/book/[serviceSlug]` **stays booking**. Never reuse that path for merchandise.

---

## 3. Dashboards

### 3.1 Book ERP home (`/admin/books`)

KPI cards (Jalali today / this month, branch-scoped):

1. فروش (paid GMV)
2. مانده کل
3. بیعانه‌های باز
4. سفارش‌های رزرو در حال انقضا
5. زیر نقطه سفارش (SKU count)
6. در انتظار تحویل

Queues (not charts for vanity):

- نیاز به پیگیری مانده (ageing)
- آماده تحویل امروز
- پیش‌نویس‌های رهاشده
- دریافت‌های PO امروز

Marketing strip (if flag): top 5 partners this month, coupons used.

### 3.2 Inventory dashboard

- ATP by warehouse
- Negative/zero available
- Incoming vs reserved
- Last count date per warehouse

### 3.3 Cashier / front desk

Large targets, scanner-first, no dense tables on mobile. One column: search customer → scan SKU → qty → deposit → print.

---

## 4. UX principles (admin)

1. **Persian labels, Latin codes.** Internal code and barcode stay Latin/digits; titles Persian.
2. **Scanner is a first-class keyboard.** Persistent focus trap on scan fields; Enter adds line.
3. **مانده always visible** on order header (color: remaining > 0 danger).
4. **Destructive actions** (void, adjust, issue unpaid) require typed reason + permission.
5. **Empty states** copy like existing CRM: explain next step, not “no data.”
6. **Jalali pickers** — reuse CRM Jalali components when that code is on the merge base; never store Jalali strings.
7. **Optimistic UI forbidden** for stock and money. Wait for server transaction.
8. **Print** uses a dedicated print CSS / A5; do not print the admin chrome.
9. **Accessibility:** existing skip link, focus rings, `aria-current` nav.
10. **Disabled booklet vs books:** if both exist, each order screen shows a product-line badge.

---

## 5. Key screens (v1)

| Screen | Desktop | Mobile |
|--------|---------|--------|
| Order capture | two-pane: cart + customer | full-width wizard |
| Order detail | timeline + lines + money + delivery | stacked sections, sticky مانده |
| Catalog | filterable table | card list + search |
| Inventory | warehouse switcher + table | search SKU → qty |
| Count | scan tick UI | scan tick UI (primary) |
| Pickup/delivery | token search + confirm | camera QR if booklet scanner exists |
| Import | wizard like CRM import | “use desktop” notice OK |
| Reports | filters + export | KPI only |

---

## 6. UI design language

Reuse, don’t invent a new theme:

- Surfaces: `admin-card`, `border-border`, `bg-surface`
- Primary navy, secondary gold (`--primary`, `--secondary`)
- Status badges: success / danger / muted (existing `StatusBadge` / lead badges)
- Density: ops tables compact; public catalog (later) premium like current shop cards

Book-specific badges:

- موجود / رزرو / ناموجود
- پرداخت‌نشده / بیعانه / تسویه
- پیش‌نویس / تأییدشده / تحویل‌شده

---

## 7. Admin experience (people in the agency)

| Persona | Happy path |
|---------|------------|
| صندوق | scan, deposit, print receipt in < 45s |
| انباردار | receive PO, scan count, issue against QR |
| مدیر آژانس | morning dashboard: مانده, below-reorder, forgotten deposits |
| مالی | receipts by method, refunds, commission payable |
| بازاریابی | issue teacher QR sheet, see conversions |
| مدیر شعبه | only their warehouse + pickup queue |

Training: each phase ships with empty-state copy that **is** the SOP.

---

## 8. Mobile experience

No native app in v1.

- Admin is responsive (`AdminShell` already stacks on small screens).
- Delivery/count/cashier are the mobile-critical flows.
- QR scan: reuse booklet `PickupQrScanner` pattern if merged; else input + camera `BarcodeDetector` where available, fallback to typed code.
- Partner/teacher v1: **static QR PDF**, not an app.
- Portal “my orders” for students/parents: phase 2 under `app/portal`.

---

## 9. Public / customer UX (flagged off)

- Catalog search by title/group/major
- School bulk request form (later) → staff order
- Tracking page: status, remaining, pickup place, SMS-safe short link
- No self-serve cancel after reservation firm without staff

---

## 10. Future UX roadmap (product, not code now)

1. Teacher mini-portal (see conversions, wallet — not withdraw)
2. School procurement portal
3. Handheld PDA layout (even denser)
4. Shelf labels PDF (barcode + internal code)
5. Customer WhatsApp is **out of scope** (SMS only via existing provider)
