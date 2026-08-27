# 06 — Development Roadmap

**Status:** DRAFT — awaiting approval  
**Constraint:** Production (CRM, forms, booking, portal, SMS, auth) stays green after every phase.  
**Rule:** No phase starts without the previous phase’s **exit criteria**. This is not a calendar estimate; it is a technical sequence.

[Index](./README.md) · Previous: [Folder structure](./05-folder-structure.md) · Next: [Risks & cutover](./07-risk-migration-deployment.md)

---

## 0. Approval checkpoint (current)

Deliverable: this documentation pack.  
**Exit:** written approval of architecture, ERD, permissions, and phase plan.  
**Forbidden:** schema PRs, nav that 404s in production, NextAuth, rewriting booklet ops.

---

## Phase A — Foundation (expand-only, flag off)

**In:**

- Feature flag table / org flags default `books.erp.enabled = false`
- Enums: productLine, movement types, sales statuses, allocation kinds
- DocumentSequence
- Additive `AuditAction` / `SmsTemplatePurpose` / `DomainEventType` values
- Permissions keys mapped to OWNER/ADMIN only
- Hidden admin layout that 404s or redirects if flag off
- Prisma migrate deploy on production **with no UI** is OK if purely additive and default-off

**Out:** public shop, imports of live Excel, marketing.

**Exit criteria:**

- `prisma migrate deploy` on a copy of prod schema succeeds
- Existing admin, CRM, booking, portal, SMS tests/smoke still pass
- Flag off ⇒ no new nav, no new matchers in middleware

**Risk if skipped:** later phases cannot ship safely.

---

## Phase B — Catalog + Excel import/export

**In:** Publisher, Group, Major, Title, SKU, CommerceItem bridge, catalog admin, barcode/internal code search, Excel import dry-run + commit, catalog export.

**Out:** stock numbers as truth (opening stock import waits for Phase C).

**Exit criteria:**

- 1k+ SKU import dry-run on a sanitized copy of the agency Excel
- Unique internalCode enforced
- Inactive SKU cannot be selected on a (still internal) order form stub
- Formula-injection sanitizer on export

**Cuts pain:** “Excel prepared manually” for the **catalog** only.

---

## Phase C — Inventory ledger + one warehouse

**In:** Warehouse (single CENTRAL), InventoryBalance, InventoryMovement, opening-balance import, adjustment document, movement report, ATP helper.

**Out:** transfers, counts UI (count can be Phase C.2).

**Exit criteria:**

- No stock change without a movement row (unit tests)
- Concurrent reserve/decrement does not go negative (transaction test)
- Booklet `stockQuantity` (if present) is **not** written by book services

**Cuts pain:** “inventory unknown”, “no stock control”.

---

## Phase D — Reservations

**In:** StockReservation, TTL, expiry worker, confirm-order reserves ATP.

**Exit criteria:**

- Two orders cannot both reserve the last unit
- Expiry worker is idempotent
- Cron documented, not run from HTTP

---

## Phase E — Sales orders + customers

**In:** Party, staff order capture (scan), order items snapshots, sales statuses, order detail timeline, QR + short code, print draft.

**Out:** public checkout.

**Exit criteria:**

- Front-desk create order without handwritten paper (shadow mode: staff still keep paper if they want)
- Dual-run SOP: ERP order optional

**Cuts pain:** “orders are handwritten”.

---

## Phase F — Treasury (deposit, partial, remaining, receipt, invoice)

**In:** PaymentAllocation, manual PaymentIntent, remaining fields, deposit policy, receipts print, invoice print, balances queue, SMS deposit/balance templates.

**Exit criteria:**

- Remaining always equals totals − allocations (invariant test)
- Forgotten-deposit queue ordered by `balanceDueAt`
- Issue blocked when remaining > 0 without override permission

**Cuts pain:** “deposits are forgotten”, “no reporting” on money.

---

## Phase G — Delivery + barcode/QR ops

**In:** DeliveryNote, pickup desk, scan to issue (`SALES_ISSUE` movement), convert reservation.

**Exit criteria:**

- Stock on hand drops only at issue, not at draft
- Duplicate scan does not double-issue (idempotency)

---

## Phase H — Procurement + planning + counting

**In:** Supplier, PO, GRN, reorder policy, suggested PO, inventory count + post, transfers if second warehouse exists.

**Exit criteria:**

- Receiving increases on-hand via ledger
- Count post creates COUNT_* movements and updates balances
- Planning is a suggestion, never auto-sends to suppliers

**Cuts pain:** “books ordered from warehouse manually”.

---

## Phase I — Reports + analytics rollup

**In:** Operational reports, Excel exports, daily rollup worker, dashboard KPIs from rollups.

**Exit criteria:**

- Dashboard does not `SUM` the full movements table
- Export audited as `DATA_EXPORTED`

---

## Phase J — SMS completeness

**In:** All book SMS purposes wired through queue; admin templates; worker unchanged except new templates.

**Exit criteria:**

- SMS.ir templates created on host **before** enabling
- Failure goes to existing dead-letter, not thrown to cashier UI

---

## Phase K — Marketing engine (flag off by default)

**In:** Partners, campaigns, coupons, referral link/QR, attribution snapshot, commission entries, wallets, targets, leaderboard snapshots, grants (discount, points, free book, gift, bonus). Scholarship last (approval workflow).

**Exit criteria:**

- Commission unique per order×partner×rule
- Cancel/refund clawback tested
- Marketing worker isolated from stock transaction

**Cuts pain:** “no commission, no marketing, no campaign”.

---

## Phase L — Public catalog + portal “my book orders” (optional)

**In:** `/shop/books`, tracking page, optional portal list. Online payment only if Payment Foundation for COMMERCE_ORDER is production-ready.

**Exit criteria:**

- Public catalog cannot leak other tenants
- Flag off removes routes (or 404)

---

## Phase M — Multi-warehouse / extra branches / partner portal

Only after A–K are stable on one warehouse and one branch.

---

## Future (backlog, not promised)

- Courier integrations
- Full GL / accounting export
- Handheld firmware
- Partner self-serve payout
- Native apps
- PostgreSQL RLS
- Trigram search
- Scholarship automation
- Multi-level affiliate (default **never**)

---

## Cross-cutting on every phase

1. Tests: unit for money/stock; smoke that CRM/booking still load.
2. Indexes with the tables that need them (don’t defer the unique barcode index).
3. Persian empty states + permissions on day one of the UI.
4. Feature flag still default off until a **cutover checklist** in [07](./07-risk-migration-deployment.md) is signed.
5. Commit/PR per phase; no mega-PR that mixes inventory with gamification.

---

## Suggested npm scripts (when coding starts)

```text
books:import-worker-once
books:reservation-expiry-once
books:commission-worker-once
books:analytics-rollup-once
test:books
test:books-inventory
test:marketing-commission
```

Cron on VPS mirrors existing `communication:worker-once` style (every 1–5 minutes). Do not add a long-running daemon in v1.
