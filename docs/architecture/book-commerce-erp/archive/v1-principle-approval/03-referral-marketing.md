# 03 — Referral & Marketing Engine

**Status:** DRAFT — awaiting approval  
**Bounded context:** `marketing` (separate from inventory/sales ledgers)  
**Flag:** `books.marketing.enabled` (default off)

[Index](./README.md) · Previous: [ERD](./02-database-erd.md) · Next: [Permissions & UX](./04-permissions-ux.md)

Everything below is **data-configured**. New campaign types should not require a deploy if they compose existing actions.

---

## 1. Purpose

Turn teachers, consultants, schools, parents, students, and external affiliates into a measurable acquisition and retention channel for the Book Agency — with **auditable commission**, **wallets**, **targets**, and **rewards** — without putting marketing math inside the stock ledger.

Sales posts a single domain event: `BOOK_ORDER_PAID` / `BOOK_ORDER_CANCELLED` / `BOOK_ORDER_RETURNED`.  
Marketing **reacts** (worker) and writes wallets / commissions / points.  
Never compute commission inside the stock transaction.

---

## 2. Actors (Partner types)

`PartnerType` enum (additive later with `ADD VALUE`):

| Type | Typical identity link | Default capability |
|------|----------------------|--------------------|
| `TEACHER` | Party, optional User | Referral link/QR, class coupon, commission, target, leaderboard |
| `CONSULTANT` | Party, optional User / CRM advisor | Same as teacher; often higher tier |
| `SCHOOL` | Party kind=ORGANIZATION | Bulk coupon, school wallet, gift/free-book pool |
| `PARENT` | Party → Guardian | Referral + discount; usually lower commission |
| `STUDENT` | Party → Student | Referral + points + gamification; payout may be gift-only |
| `AFFILIATE` | Party only | Link/QR/coupon; wallet payout |

One Party can have **multiple** Partner rows only if types differ (unique `(organizationId, partyId, type)`). Same person as parent + affiliate is allowed; reporting must not double-pay unless a rule says so (`stackingPolicy`).

---

## 3. Core objects

```text
Campaign ──► CampaignRewardRule[]   (what you earn)
    │
    ├── ReferralLink   (token, utm, partnerId?)
    ├── ReferralQr     (image derived from link token)
    └── Coupon         (code, partnerId?, campaignId)

Order ──► attribution snapshot (immutable)
       ──► CouponRedemption
       ──► CommissionEntry (pending → locked → payable → paid / clawed back)
       ──► RewardGrant
       ──► WalletLedger / PointLedger
```

### 3.1 Campaign

Configurable fields:

- name, code, status (`DRAFT, ACTIVE, PAUSED, ENDED`)
- window `startsAt` / `endsAt` (UTC)
- eligible `PartnerType[]`
- eligible SKU scope (all / groups / majors / sku list)
- channel: link, QR, coupon, staff-entered code, all
- stacking policy: `NONE | WITH_DISCOUNT_ONLY | WITH_COMMISSION_ONLY | ALLOW_ALL`
- budget cap (max discount Rials, max commission Rials, max free books)
- per-partner cap
- landing path (public catalog later)

### 3.2 CampaignRewardRule (the configurability spine)

Each rule has `trigger` + `action` + `limits`.

**Triggers**

| Trigger | Payload |
|---------|---------|
| `ORDER_CREATED` | optional min lines |
| `ORDER_DEPOSIT` | minDepositPercent |
| `ORDER_PAID` | minPaidPercent = 100 |
| `FIRST_ORDER` | per customer |
| `SKU_QTY` | sku/group + qty |
| `GMV_THRESHOLD` | amountRials |
| `TARGET_HIT` | targetId |

**Actions** (composable; multiple rules per campaign)

| Action | Config |
|--------|--------|
| `ORDER_DISCOUNT_PERCENT` | percent, maxRials |
| `ORDER_DISCOUNT_FIXED` | amountRials |
| `COUPON_ISSUE` | couponTemplateId |
| `COMMISSION_PERCENT` | percent of GMV or of paid amount (explicit) |
| `COMMISSION_FIXED` | amountRials per order or per qty |
| `WALLET_CREDIT` | amountRials, spendableOn |
| `POINTS` | points, multiplier |
| `FREE_BOOK` | skuId or `ANY_FROM_POOL`, qty, max per partner |
| `GIFT` | catalog giftId (non-book SKU or physical gift) |
| `BONUS` | one-off wallet credit with reason |
| `SCHOLARSHIP` | amountRials to student Party; requires finance approval |
| `LEADERBOARD_SCORE` | points toward ranking |

**Base amount for %** must be explicit per rule: `GMV | PAID | GROSS_AFTER_DISCOUNT | LINE_ELIGIBLE_ONLY`. Default: `GROSS_AFTER_DISCOUNT` excluding already-free lines.

### 3.3 ReferralLink / ReferralQr

- `token` unique, opaque, URL-safe
- `partnerId` nullable (org-level campaign links exist)
- `campaignId` required
- click + conversion counters (projections)
- QR is a generated PNG stored as `MediaAsset` or produced on the fly from the same URL (`/r/[token]`)

SMS and print sheets always use the **short URL**, never the admin path.

Attribution window: configurable last-click vs first-click (`AttributionPolicy` on campaign, default last-click within 30 days). Freeze as `OrderAttributionSnapshot` at first confirmed payment (immutable, same idea as Admissions CRM v2 revenue snapshots).

### 3.4 Coupon codes

- `code` unique per org (normalized: Persian/Arabic digits → Latin, uppercase English, strip spaces)
- types: `%`, fixed Rials, free shipping (n/a in v1 pickup), free SKU
- `maxRedemptions`, `maxPerParty`, `minOrderRials`, window, partner lock
- redemption row is append-only; void = new row or status on same row with actor

Checkout / staff order UI: one coupon per order in v1 (`stackingPolicy` can relax later).

### 3.5 Commission

`CommissionRule`: partnerType or partnerId override, rate, base, delayDays (default 7 after PAID), clawback on refund/cancel.

`CommissionEntry` states:

```text
ACCRUED → LOCKED → PAYABLE → PAID
        ↘ VOID
        ↘ CLAWED_BACK
```

Worker moves ACCRUED → LOCKED after delay if order still paid.  
Payout batch creates `WalletLedger` `COMMISSION_PAYOUT` or marks `PAID` if cash/transfer outside wallet (finance records a receipt the other way).

**Double-pay guard:** unique `(organizationId, orderId, partnerId, ruleId)`.

### 3.6 Wallet

Per `(organizationId, partnerId, currency=IRR)`.

`WalletLedger` append-only: credit/debit, type (`COMMISSION, BONUS, GIFT_CONVERSION, SPEND_ON_ORDER, PAYOUT, CLAWBACK, ADJUST`), `idempotencyKey`.

Spend-on-order: creates a `PaymentAllocation` `kind=WALLET` (or discount) — **choose one at approval**:

- **Recommended:** wallet spend = discount lines + audit, not mixed with cash remaining, to keep treasury simple.
- Alternative: wallet is tender like cash.

v1 recommendation: **wallet is not cash tender**. It pays out to partners (teachers) or converts to coupons. Student/parent wallets spend as **discount** up to balance.

### 3.7 Target

`PartnerTarget`: period (Jalali month/term), metric (`GMV, QTY, NEW_CUSTOMERS, PAID_ORDERS`), goal value, campaignId optional.

Progress is a projection from snapshots, refreshed by worker or on event.

### 3.8 Leaderboard

`LeaderboardSnapshot` daily: campaign or period, rank, partnerId, score, GMV, qty.  
UI reads snapshots, not live table scans of all orders.

Ties: earlier `targetHitAt`, then higher GMV.

### 3.9 Gift, bonus, free books, scholarship, discount, points, gamification

| Mechanism | Implementation |
|-----------|----------------|
| Gift | `RewardGrant` type GIFT; fulfillment = staff task or delivery note with zero-price lines |
| Bonus | Wallet credit with type BONUS |
| Free books | Order line at 0 Rials flagged `isReward`; still **reserves stock** |
| Scholarship | Grant requiring `marketing.scholarships.approve` + finance; pays remaining balance or issues credit |
| Discount | Applied at order total time; snapshot on order |
| Reward points | Parallel ledger; conversion rule to coupon (e.g. 1000 pts = 50,000 Rials coupon) |
| Gamification | Badges (`PartnerBadge`) + levels (`PartnerLevel`) derived from points/GMV thresholds in `GamificationConfig` JSON |

`GamificationConfig` is org-level JSON with version; changing config does not rewrite history. Levels recomputed from ledgers.

---

## 4. Attribution on the order

Immutable snapshot columns / child row:

- campaignId
- partnerId
- referralToken
- couponId
- attributionPolicy
- capturedAt
- paidAt freeze

Staff may **override** attribution with permission `marketing.attribution.override` (audited). Override creates a new snapshot version; commissions already LOCKED are not silently moved — finance must void/re-accrue.

---

## 5. Event flow

```text
Order confirmed/paid
  → DomainEventOutbox BOOK_ORDER_PAID
  → marketing worker:
       1. freeze attribution if not frozen
       2. apply coupon already on order (no double discount)
       3. insert CommissionEntry ACCRUED
       4. insert points / grants
       5. bump leaderboard dirty flag
  → SMS optional (referral thank-you)

Reservation/order cancel or refund
  → BOOK_ORDER_REVERSED
  → void pending commission; clawback locked if policy says so
  → reverse points; free-book lines follow returns module
```

---

## 6. Permissions (marketing)

See also [04](./04-permissions-ux.md):

- `marketing.view`
- `marketing.campaigns.manage`
- `marketing.partners.manage`
- `marketing.coupons.manage`
- `marketing.commissions.manage`
- `marketing.wallets.manage`
- `marketing.attribution.override`
- `marketing.scholarships.approve`
- `marketing.leaderboard.view`

Partners logging in later use portal-style accounts (`PartnerPortal` — **phase 3**, not v1). v1 is staff-operated: print QR sheets for teachers.

---

## 7. UX (staff)

Navigation group **بازاریابی کتاب** (only if flag on):

- Campaigns
- Partners
- Coupons
- Referral links / print QR
- Commission queue
- Wallets
- Targets / leaderboard
- Grants (gifts, free books, scholarships)

Partner create: search existing Party / teacher / parent / student first to avoid duplicates.

---

## 8. Abuse & risk controls

- Coupon brute force: rate-limit public redeem; codes ≥ 6 chars.
- Self-referral: block partner mobile = customer mobile unless type=STUDENT and policy allows.
- Teacher buying for themselves: configurable.
- Commission on unpaid remaining: **never**; accrue on paid amount only unless rule base is GMV **and** finance signs off (default paid only).
- Free-book stock: still ATP-checked; campaign budget cap.
- Excel export of wallets = `DATA_EXPORTED` audit.

---

## 9. v1 vs later

| v1 | Later |
|----|--------|
| Staff-assigned coupons + printable QR | Partner self-serve portal |
| One coupon per order | Stacking engine |
| Commission % of paid | Multi-tier MLM **out of scope forever** unless explicitly approved |
| Points ledger | Public gamification on student portal |
| Manual payout list | Bank transfer batch |

**Out of scope:** multi-level pyramids, crypto, automated Instagram scraping, sending SMS campaigns to purchased lists without consent (`ConsentType.MARKETING_CONTACT` already exists — respect it).
