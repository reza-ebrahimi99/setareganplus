# 12 — Roadmap, Deployment, Migration, Risks

**Status:** v2  
**Implementation:** blocked until explicit approval  
**Flag default:** `bookCommerce` = OFF

[Index](./README.md) · Previous: [Public store](./11-public-store.md) · Next: [Open questions](./13-open-questions.md)

---

## 1. Deployment roadmap (technical sequence, not a calendar)

ERP-first. Marketing after ledger. Public store last.

| Phase | Name | In | Exit |
|-------|------|----|------|
| **A** | Foundation | Flag `bookCommerce` off, AgencyProfile, sequences, additive enums, hidden nav stub | Migrate deploy on copy of prod; CRM/booking/portal/SMS smoke green; flag off = no nav |
| **B** | Catalog | Title/SKU/taxonomies, price history, barcode/QR identity, Excel import engine | 1000+ row dry-run; unique codes; price change inserts history |
| **C** | Labels | Print subsystem: SKU/shelf/price/box | Print PDF/ZPL from admin |
| **D** | Warehouse | Unlimited warehouses + locations, ledger, balances, opening stock import, transfer, adjust | No stock write without movement+location; concurrent ATP test |
| **E** | Scan | Receiving, putaway, count, shelf transfer sessions | Idempotent scans |
| **F** | Sales + reservation | Party links, order capture, reservation slip, shortage lines | Two cashiers cannot double-reserve last copy |
| **G** | Treasury | Deposit, remaining, receipt, installment | Invariant remaining; ageing queue |
| **H** | Procurement | Replenishment math, PR, PO, Excel to Pen, GRN, allocate to reservation | Example 120/35/20/15/105 reproducible in tests |
| **I** | Delivery | Pick/pack/deliver, invoice, return/credit/gift/donation docs | Issue blocked when remaining > 0 |
| **J** | Reports | Operational + daily rollups + executive widgets | Home does not SUM movements |
| **K** | Bundles | Pack pricing + explode/assemble | ATP explode correct |
| **L** | Marketing | Campaigns, coupons, school programs | Rule eval snapshotted |
| **M** | Commission | Teacher/consultant entries + admin dashboards | Unique entry; clawback |
| **N** | Partner portals | Teacher/consultant UX | Not admin; flag `partnerPortals` |
| **O** | Public tracking / store | [11](./11-public-store.md) | Isolated flags |
| **P** | AI snapshots | `AiDemandSignal` | Suggest-only |

Cross-cutting every phase: orgId on queries, tests, Persian empty states, no edits to booking/CRM/auth beyond additive keys.

Workers added only when their phase ships: import, reservation-expiry, replenishment, installment-due, commission, analytics-rollup.

---

## 2. Target folder map (reminder — do not create now)

See [01 §10](./01-overview.md). `lib/books/*` separate from `lib/commerce/*`.

---

## 3. Deployment strategy

Same VPS, same Next.js process, same PostgreSQL as SetareganPlus.

1. Merge with `bookCommerce` **false**
2. `prisma migrate deploy` (expand-only, when coding exists)
3. Existing `npm run build` (prisma generate + next build)
4. Smoke: admin login, CRM, booking `/book/...`, SMS worker, portal
5. Enable flag on a staging org
6. Staff UAT (catalog import → opening stock → dummy reservation → PR/PO/GRN)
7. Enable on `setareganplus`
8. Install crons **after** workers exist

Emergency: env `STAROS_BOOKS_ERP_HARD_OFF=true` plus per-org flag.

Nginx: no new public locations until phase O. Do not put `/r` or `/q` behind admin middleware.

SMS.ir: new template IDs on host before enabling SMS in production.

Backup: extra `pg_dump` labeled `pre-book-erp-opening-stock` before first live GRN. Dumps stay on VPS, not git.

---

## 4. Migration strategy

### 4.1 Git base

Implementation PRs target **production `master`**, not the CRM-UI snapshot, unless product says otherwise.

### 4.2 Booklet commerce

If merged first: backfill `productLine=BOOKLET`; Book ERP writes `BOOK_AGENCY` only; never write `stockQuantity`.  
If not merged: introduce ERP tables with productLine from day one.

### 4.3 Excel cutover

```text
Freeze catalog Excel → dry-run import → fix codes
Opening count into SHELF (honest zeros allowed)
Flag on for staff
Dual-run 1–14 days (ERP required, paper optional)
Deposits still owed MUST be entered (the whole point)
Then Excel becomes an ERP export
```

Do not mass-import messy open paper orders except open receivables.

### 4.4 CRM people

Link Party to Student/Guardian/Lead by mobile. Do not mass-create portal users. Teachers as Partners.

### 4.5 Rollback

Flag off hides UI; data remains. No `migrate down` on prod. Compensating adjustments undo bad imports. Marketing has its own child flag.

### 4.6 Schema evolution

Expand → backfill → contract much later. Partial unique indexes in the same migration as the table (when coding starts). Document numbers configurable to avoid colliding with old paper series.

---

## 5. Risk analysis

### 5.1 P0 — can break production

| Risk | Mitigation |
|------|------------|
| Rewriting CRM/booking/auth | Forbidden; additive keys only; separate PRs |
| Permission bleed with booklet `commerce.*` | `books.*` prefix |
| NextAuth | Do not add |
| Unscoped queries | organizationId required in every service |
| Scalar stock dual truth | Book services never write booklet `stockQuantity` |
| Heavy migration locks | Expand-only; concurrent indexes if tables already large |
| SMS pipeline edits | Additive purposes only |
| Excel formula injection | Sanitize exports |
| Middleware catches `/q` `/r` | Public matchers stay public |
| Flag on by mistake | Default false; layout short-circuit |
| Integer overflow on rollups | BigInt/numeric for GMV sums |
| Next 16 API drift | Read `node_modules/next/dist/docs/` before code |

### 5.2 P1 — business data

| Risk | Mitigation |
|------|------------|
| Dirty 1000-row Excel | Dry-run, duplicate rules, error report |
| Wrong opening stock | Count within 7 days; adjustments |
| Dual-run drift | Daily reconciliation report |
| Reservation without PO | Shortage dashboard |
| PO sent twice to Pen | Export version warning |
| Forgotten deposits | Ageing queue + SMS |
| Commission fights | Frozen attribution |
| Teacher sees student PII | Default names hidden |
| Brand/legal Kanoon | Publisher as data; no official claim |

### 5.3 P2 — scope

Building a full ERP in one PR; AI auto-purchase; courier; native apps; pyramid affiliates — all sequenced or rejected.

---

## 6. Success metrics (after flag on)

- 100% of desk sales have an ERP order number after dual-run
- Open deposit ageing visible daily
- Every tracked SKU has a location balance
- Need calculation matches manager’s sample (120/35/20/15/105)
- Zero negative on-hand
- Zero unscoped query incidents
- No regression in OTP/booking/CRM SMS failure rate

---

## 7. Decision carry-forward (v1 D1–D10, still in force unless [13](./13-open-questions.md) overrides)

D1 custom sessions · D2 title+SKU · D3 ledger · D5 wallet ≠ cash drawer · D6 remaining on order · D8 public store later · D9 implement on master · D10 no MLM.

D4 (share CommerceOrder vs dedicated SalesOrder) and D7 (new SystemRoles) remain **open** in v2 — see Q1, Q4.
