# 10 — Reporting, Analytics, AI-Ready Signals

**Status:** v2  
**Flag:** `bookCommerce` (`bookCommerce.ai` for extra snapshots)

[Index](./README.md) · Previous: [Treasury](./09-treasury.md) · Next: [Public store](./11-public-store.md)

---

## 1. Two layers

| Layer | Audience | Source |
|-------|----------|--------|
| Operational reports | Desk, warehouse, finance | Filtered OLTP + exports (indexed) |
| Executive analytics | Agency manager | `BookAnalyticsDaily` and partner snapshots — **not** live SUM of movements |

HTTP dashboards never scan the full movement journal.

---

## 2. Operational reports (Excel + screen)

- Stock on hand by warehouse × location
- Below reorder / need purchase (from latest ReplenishmentRun)
- Open reservations & shortages
- Open PRs/POs / in-transit
- Order list, remaining, deposits ageing, installments overdue
- Movements (date, sku, location, type, actor)
- Cash receipts by method (till)
- Import/export audit

Jalali range, branch/warehouse scope, `books.export` audited.

---

## 3. Executive dashboards

Widgets (composition, same idea as StarOS dashboard platform if present — else simple queries on rollups):

| Widget | Definition |
|--------|------------|
| Top Books | qty and GMV paid, non-gift |
| Top Warehouses | GMV / turns |
| Top Teachers | attributed paid GMV + commission |
| Top Consultants | same, consultant board |
| Top Schools | campaign + bulk GMV |
| Top Revenue | paid GMV |
| Top Profit | GMV − COGS (avgCost on issue movements); hide if cost not populated |
| Inventory Turnover | COGS / avg on-hand (period) |
| Fast Moving | top velocity SKUs |
| Slow Moving | low velocity, still on-hand |
| Dead Stock | no issue in N days, qty>0 |
| Lost Sales | expired/unfilled demand qty |
| Pending Reservations | open + short |
| Outstanding Deposits | remaining where deposit>0 or unpaid |

All org-scoped, Jalali period, compare to previous period optional.

---

## 4. Rollup grain

`BookAnalyticsDaily`: organizationId, day (UTC date of Tehran civil day stored as date), dimension, dimensionKey, metrics JSON or typed ints (qtySold, gmvPaid, remainingOpen, depositOpen, stockout, lostSales, cogs).

Dimensions: TOTAL, SKU, WAREHOUSE, LOCATION_KIND, TEACHER, CONSULTANT, SCHOOL, GROUP, MAJOR.

Worker nightly + incremental on events if needed.

---

## 5. AI-ready (no models in v1)

Goal: future models can predict demand, recommended purchase, bestseller, customer recommendation, inventory forecast **without a redesign**.

### 5.1 What we persist now (even if `bookCommerce.ai` is off, events still exist)

- DomainEventOutbox: reservation, payment, GRN, issue, expiry, campaign eval
- ReplenishmentRun snapshots (inputs + need)
- Movement ledger (immutable)
- Attribution snapshots
- Lost-sales counters

### 5.2 What the AI flag adds

`AiDemandSignal` daily grain `(org, skuId, warehouseId)`:

- demandOpen, qtyIssued, qtyExpired, stockoutFlag, priceIdAtDay, campaignIds[]

Optional later: embeddings elsewhere — **not** in Postgres OLTP.

### 5.3 Hard rules

- AI suggests; humans approve PR/PO.
- AI never posts movements or allocations.
- Training exports are `DATA_EXPORTED` and org-scoped.
- Recommendations for customers only after public store / portal flags.

Read-model API (future): `lib/books/ai/signals.ts` returning structured features — not coupled to a vendor.

Existing StarOS `lib/ai/*` is booking-advisory. **Do not** overload it. New namespace `lib/books/ai`.

---

## 6. Profit & cost

Average cost on balance updated at GRN (moving average). Issue movements copy `unitCostRials`. If cost missing, profit widgets show “نامشخص” not zero. Opening stock import may include unit cost.

---

## 7. Performance

Keyset pagination on operational lists. Dashboards 8–12 widgets from daily table. No N+1 per SKU on home.
