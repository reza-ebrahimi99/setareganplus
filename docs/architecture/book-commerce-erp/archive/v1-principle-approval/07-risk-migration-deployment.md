# 07 — Risk Analysis, Migration Strategy, Deployment Strategy

**Status:** DRAFT — awaiting approval

[Index](./README.md) · Previous: [Roadmap](./06-roadmap.md)

---

## 1. Risk analysis

### 1.1 Risks that can break production (P0)

| Risk | Why it’s real | Mitigation |
|------|----------------|------------|
| Shared schema collisions | Booklet branch already uses `CommerceOrder`, `CommerceItem`, payment payable types | Discriminator `productLine`; never reuse `opsStage` for books; additive columns nullable |
| Permission bleed | `commerce.orders.manage` would let booklet staff post book stock | Separate `books.*` permission prefix |
| Auth rewrite | Prompt asked for NextAuth; production is custom sessions | **Do not add NextAuth** |
| Unscoped Prisma | New queries forget `organizationId` | Every service requires `organizationId`; no helper without it; code review checklist |
| Migration downtime / lock | Large table rewrites | Expand-only; create indexes `CONCURRENTLY` in raw SQL if table already large (booklet orders) |
| SMS worker regression | Editing send pipeline for new templates | Additive enum + templates; no change to OTP hashing |
| Middleware matcher too broad | `/r/` or `/shop/books` accidentally gated | Do not add public book routes to admin middleware |
| Excel formula injection | Already bitten booking export | Sanitize `= + - @` on every export cell |
| Stock dual truth | Writing both ledger and `CommerceItem.stockQuantity` | Book services never touch booklet scalar stock |
| Blocking issue on remaining | Cashier deadlock during training | Permission override + audit; flag `allowIssueUnpaid` default false |
| Feature flag forgotten on | Nav 404 or half-migrated UI in prod | Flag default false; layout short-circuits |
| Cron not installed | Reservations never expire → ghost stock | Deploy checklist; dashboard “worker heartbeat” later |
| Integer money overflow | Unlikely in IRR int32 for single lines; possible on analytics sums | Use `Int` for lines; rollups `BigInt` or numeric if GMV can exceed 2^31 |
| Next.js 16 API drift | AGENTS.md warns docs differ from training | Read `node_modules/next/dist/docs/` before implementation |

### 1.2 Business / data risks (P1)

| Risk | Mitigation |
|------|------------|
| Dirty Excel catalog (duplicate codes, mixed Persian digits) | Dry-run import; normalize digits; human commit |
| Opening stock wrong | Opening balances as dated adjustments; recount within 7 days |
| Handwritten orders continue unofficially | Dual-run period with daily reconciliation report |
| Deposit policy fights culture | Configurable %; ageing dashboard for managers |
| Commission disputes | Immutable attribution snapshot; no silent reruns after LOCKED |
| Self-referral fraud | Block same mobile; audit overrides |
| Teacher SMS fatigue | Template + opt-in; `MARKETING_CONTACT` consent |
| Confusing booking URL `/book` vs books | Never reuse path; staff glossary in empty states |
| Brand/legal (Kanoon) | No claim of official Kanoon systems; publisher as data |

### 1.3 Product-scope risks (P2)

| Risk | Mitigation |
|------|------------|
| Building Odoo in one PR | Phased roadmap; marketing after ledger |
| Gamification delaying ATP | Points never in Phase C |
| Courier rabbit-hole | Pickup + school batch only in v1 |
| Native app | Responsive admin first |

---

## 2. Migration strategy

### 2.1 Codebase bases

Implementation PRs should target **production `master`** (or the current release branch), not the incomplete `feat/admin-crm-ui-foundation` snapshot — unless product explicitly wants docs-only on this branch.

If booklet commerce merges first:

1. Backfill `productLine = BOOKLET` on existing items/orders.
2. Ship Book ERP as `BOOK_AGENCY` rows only.
3. Shared payment intents already have `COMMERCE_ORDER`.

If booklet commerce does **not** merge:

1. Introduce Commerce/Payment tables from this pack with `productLine` present.
2. Later booklet merge maps booklet SKUs to `BOOKLET` and must not assume missing columns.

### 2.2 Data cutover (agency Excel → ERP)

```text
Week -2  Freeze a catalog export from current Excel (copy, not the live file)
Week -1  Dry-run import on staging; fix codes; sign off SKU count
Day 0    Opening stock count (or honest “uncounted” warehouse qty 0 + incoming)
Day 0    Flag ON for staff only (no public catalog)
Days 1–14 Dual-run: every real sale entered in ERP; paper optional
Day 14   Compare Excel leftover vs ERP remaining + stock; then Excel becomes export from ERP
```

**No automatic deletion** of Excel files. Keep them in `STAROS_MEDIA_ROOT/imports/archive`.

Open handwritten orders at cutover: import as `DRAFT`/`CONFIRMED` with remaining balance, or finish on paper (choose one SOP; default: **don’t import incomplete paper** except deposits still owed — those must be entered so they are not forgotten).

### 2.3 Identity / customer cutover

- Lookup Party by normalized mobile against Student / Guardian / Lead.
- Do not mass-create portal accounts.
- Teachers as partners: staff-created, QR printed.

### 2.4 Schema evolution

- Expand → backfill → (much later) contract. Never drop booklet columns in a Book ERP PR.
- Raw SQL partial unique indexes in the same migration as the table.
- DocumentSequence starting numbers configurable so printed numbers don’t collide with old paper series.

### 2.5 Rollback

| Layer | Rollback |
|-------|----------|
| Feature flag | Turn `books.erp.enabled` off — UI gone, data kept |
| Code | Revert deploy; additive columns remain (safe) |
| Migration | Do **not** `migrate down` on prod; forward-fix |
| Bad import | Import reports are the undo map; compensating adjustments, not DELETE |
| Marketing | Separate flag; commissions stay in ledger (void, don’t delete) |

---

## 3. Deployment strategy

### 3.1 Where it runs

Same VPS / same Next.js process / same PostgreSQL as SetareganPlus today.

- `DATABASE_URL` unchanged
- `STAROS_MEDIA_ROOT` stores import files, generated QR PNGs, print PDFs if any
- Nginx: new public paths only when flags on (`/r/`, `/shop/books`, `/order/ba/`)
- No new long-lived Node service

### 3.2 Release train (per phase)

1. Merge to master with flag **off**
2. `prisma migrate deploy`
3. `prisma generate` (already in `npm run build`)
4. Build/start as current StarOS deploy
5. Smoke: `/admin/login`, CRM lead list, one booking path, SMS worker once
6. Enable flag on **staging org** or a clone
7. Staff UAT
8. Enable on `setareganplus` org
9. Add crons only when the worker script exists

### 3.3 Environment

No new secrets for v1 except optional extra SMS.ir **template IDs** for book purposes (same `SMSIR_API_KEY`).

Document in `.env.example` (later):

```text
# Book ERP workers — safe defaults off
# STAROS_BOOKS_ERP_DEFAULT_ENABLED=false
```

Do not use a global env kill switch *instead of* per-org flags; env can force-disable all tenants in emergency (`STAROS_BOOKS_ERP_HARD_OFF=true`).

### 3.4 Cron (add when workers ship)

```text
*/2  * * * *  communication:worker-once          # existing
*/5  * * * *  books:reservation-expiry-once
*/5  * * * *  books:import-worker-once            # if jobs queued
*/10 * * * *  books:commission-worker-once
15   1 * * *  books:analytics-rollup-once
```

All `cd` to the app root like existing CRM workers. Failures must log via `lib/observability/server-log.ts` pattern.

### 3.5 Observability

- Import job status page
- Movement write failures → user-facing Persian error, not 500 HTML
- SMS already has statuses
- Optional: count of expired reservations last 24h on dashboard

### 3.6 Backups

Existing Postgres dump cadence is the backup. Before first opening-stock post: extra manual dump (`pg_dump`) labeled `pre-book-erp-opening-stock`.

Booklet branch already has `backups/pre-commerce-*.dump` in git history as a pattern — **do not commit dumps** to git; keep on the VPS.

### 3.7 Access

- Staff via existing admin login
- No NextAuth
- Pickup tokens are capability URLs; keep them unguessable (cuid + short code separately)

### 3.8 Performance gates before public catalog

- Catalog list p95 indexed
- ATP read is balance table, not ledger scan
- Import of full catalog < worker timeout; chunk

---

## 4. Cutover checklist (staff + engineering)

Engineering:

- [ ] Migrations applied
- [ ] Flag off verified on production
- [ ] Permissions assigned to real users (not only OWNER)
- [ ] SMS templates created in SMS.ir and mapped
- [ ] Crons installed **after** workers exist
- [ ] CRM / booking / portal smoke
- [ ] Backup taken

Agency:

- [ ] SKU codes signed off
- [ ] One warehouse named and staff trained on scan
- [ ] Deposit % policy written
- [ ] Dual-run dates agreed
- [ ] Who can `issue_unpaid` named (ideally nobody in week 1)
- [ ] Excel archive owner named

---

## 5. Success metrics (after flag on)

- % of sales with an ERP order number (target 100% after dual-run)
- Open deposit count and ageing (should be visible daily, trending down forgotten)
- SKUs with known on-hand (target: all tracked SKUs)
- Time to capture an order (cashier)
- Zero negative `qtyOnHand`
- Zero unscoped query incidents
- No increase in SMS OTP / booking failure rate

---

## 6. Decision log (needs approval)

| ID | Decision | Recommendation |
|----|----------|----------------|
| D1 | Auth | Keep custom sessions; no NextAuth |
| D2 | Catalog | BookTitle + BookSku + optional CommerceItem bridge |
| D3 | Stock truth | Ledger + balance snapshot |
| D4 | Orders table | Share CommerceOrder + `productLine` |
| D5 | Wallet as tender | v1 wallet ≠ cash; spend as discount / payout |
| D6 | Invoice | Printable financial document; remaining on order |
| D7 | New SystemRoles | Add WAREHOUSE_KEEPER + BOOK_CASHIER + BOOK_AGENCY_MANAGER |
| D8 | Public shop | Not in first on flag; Phase L |
| D9 | Implementation base | `origin/master`, not the CRM-UI snapshot |
| D10 | Multi-level affiliate | Out of scope |

---

## 7. Waiting for approval

No Prisma schema, no folders under `lib/books`, no admin routes, no crons, until this pack is approved (with any marked changes to D1–D10).
