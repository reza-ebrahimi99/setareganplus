# 07 — Wallet, Loyalty, Referral

[Index](./README.md) · Previous: [Timeline](./06-timeline.md) · Next: [Partner platforms](./08-partner-platforms.md)

---

## 1. Wallet

Grain: `(organizationId, userId)`.

**Supported credits:** Gift credit · Cashback · Commission · Manual adjustment · Reward · Scholarship.

**v1 spend:** discount on eligible orders / booklet orders — **not** cash withdrawal, **not** mixing till cash (align Book ERP D5).

Ledger append-only, idempotency keys, staff adjust permission `sxp.wallet.adjust`.

Hub: balance by bucket (gift vs commission vs reward) + history. Payout history for partners lives here too.

Scholarship credit: finance approval required (same as Book ERP).

---

## 2. Loyalty engine

Independent of public CMS achievements.

**Tiers:** Bronze · Silver · Gold · Diamond  
Config: thresholds on points and/or trailing paid GMV; versioned; changing config does not rewrite history (recompute from ledger).

**Points:** LoyaltyLedger, earn on paid eligible GMV, redeem to coupon per rule (e.g. N points → coupon). Never earn on unpaid remaining.

**Badges / achievements / challenges / rewards:**

| Object | Meaning |
|--------|---------|
| Badge | durable icon (first order, 10 referrals, …) |
| Achievement | loyalty definition (not `achievements` CMS table) |
| Challenge | time-boxed (Jalali month: «۳ رزرو مشاوره») |
| Reward | grant: coupon, points, gift book, wallet |

Hub **دستاوردها**: tab «باشگاه» (loyalty) vs «افتخارات مدرسه» (CMS Achievement already in student portal).

---

## 3. Referral (every profile)

Every ExperienceProfile may own:

- Referral **code** (human, unique per org)
- Referral **link** `/r/{token}`
- Referral **QR** (same URL)

**Invite:** friends, parents, teachers, schools, consultants — creates attribution + optional INVITED user. Conversion rules in campaign engine (Book ERP + SXP marketing). Self-referral blocked (same mobile).

Hub section: share sheet, counts (clicks, signups, paid), rewards earned.

Public landing may browse; **claiming rewards requires login**.

---

## 4. Coupons & discounts

Held coupons list; applied discounts appear on order detail and timeline `COUPON_REDEEMED`. Evaluation stays in marketing/sales services; hub is read-only.
