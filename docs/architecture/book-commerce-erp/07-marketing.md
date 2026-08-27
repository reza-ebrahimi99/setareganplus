# 07 — Marketing & Campaign Engine

**Status:** v2  
**Flags:** `bookCommerce` and `bookCommerce.marketing` (both off by default)

[Index](./README.md) · Previous: [Sales](./06-sales.md) · Next: [Commission](./08-commission.md)

---

## 1. Marketing is not the storefront

This context wins **channels**: teachers, consultants, schools, parents, students, affiliates. It does not replace catalog or warehouse.

Sales applies a coupon or attribution token; marketing **rules** decide discounts/rewards; commission **posts** money later ([08](./08-commission.md)).

---

## 2. Campaign engine (rules)

A campaign is a dated container. **CampaignRule** rows make it real. New promotions should not need a deploy if they compose existing triggers/actions.

### 2.1 Example campaigns

| Campaign | Typical rules |
|----------|----------------|
| Buy 3 Get 1 | trigger SKU_QTY (same group, qty≥3) → action FREE_BOOK qty=1 cheapest |
| Buy 20 Get 2 Free | SKU_QTY ≥20 → FREE_BOOK 2 from pool |
| Summer Discount | ORDER_CONFIRMED in window → ORDER_DISCOUNT_PERCENT |
| Teacher Week | partnerType=TEACHER + window → extra COMMISSION_PERCENT |
| Consultant Bonus | CONSULTANT + GMV_THRESHOLD → WALLET_CREDIT |
| School Week | partnerType=SCHOOL → DISCOUNT + optional donation match |
| Referral Reward | FIRST_ORDER with referral token → POINTS or coupon to both sides |
| Coupons | code redeem → discount |
| Wallet Bonus | TARGET_HIT → WALLET_CREDIT |

### 2.2 Triggers

ORDER_CREATED, ORDER_DEPOSIT, ORDER_PAID, FIRST_ORDER, SKU_QTY, BUNDLE_SOLD, GMV_THRESHOLD, TARGET_HIT, SCHOOL_CAMPAIGN_ENROLL.

### 2.3 Actions

ORDER_DISCOUNT_PERCENT / FIXED, FREE_BOOK (still **reserves stock**, usually GIFT or SHELF per rule `issueLocationKind`), COUPON_ISSUE, COMMISSION_PERCENT / FIXED, WALLET_CREDIT, POINTS, GIFT, BONUS, SCHOLARSHIP (requires finance approve), LEADERBOARD_SCORE, DONATION_MATCH.

### 2.4 Limits & stacking

Per campaign: budget cap, per-partner cap, per-customer cap, window.  
`stackingPolicy`: NONE | DISCOUNT_ONLY | COMMISSION_ONLY | ALLOW_ALL.  
v1 checkout: **one coupon per order** unless policy ALLOW_ALL.

Base for percent: default `GROSS_AFTER_DISCOUNT` of eligible lines. Never remaining unpaid.

Free books: campaign budget + ATP check; else wait like any shortage.

---

## 3. Coupons

Normalized codes (Persian digits → Latin). Types: percent, fixed, free SKU. Max redemptions, max per Party, min order, partner-lock, window. Append-only redemptions.

---

## 4. Referral links & QR

`ReferralLink.token` → `/r/{token}`. Partner optional (org-level campaigns exist). QR is the same URL (`PARTNER_REFERRAL`). Print sheets for teachers (v1 even before partner portals).

Attribution: last-click vs first-click, window days, freeze at first qualifying payment (`OrderAttributionSnapshot` immutable). Override permission audited; does not silently rewrite LOCKED commission.

---

## 5. School campaigns

Schools are Partners (`type=SCHOOL`) on a Party organization.

Program types (campaign category):

| Program | Effect |
|---------|--------|
| Donation Campaign | Donation Invoice + issue from GIFT or purchased stock; optional public count |
| Discount Campaign | School-locked coupon / auto discount on school Party orders |
| Scholarship Campaign | Scholarship grants → credit remaining on student orders (finance approve) |
| School Competition | Leaderboard among students/classes; prizes as grants |
| Free Book Distribution | FREE_BOOK pool capped; scan-on-distribute |
| Gift Programs | Gift Invoice + GIFT location |

School bulk order: one SalesOrder, campaignId set, delivery SCHOOL_BATCH.

Consent: marketing SMS only if `ConsentType.MARKETING_CONTACT` (existing enum) is granted for that Party/lead.

---

## 6. Teacher week / consultant week

Time-boxed campaigns that **raise commission rules** or set multipliers. They do not replace the standing CommissionRule table — they add overlay rules with priority.

---

## 7. Event flow (marketing)

```text
Order confirmed/paid
  → evaluate campaigns (deterministic, versioned rule set id snapshotted)
  → apply discounts already on the order (no second surprise)
  → enqueue grants / commission / points
Cancel/refund → reverse pending grants; stock follows returns
```

Evaluation is a pure function of (order snapshot, active rules). Store `campaignEvaluationId` on the order for disputes.

---

## 8. Admin UX

Nav **بازاریابی کتاب** (hidden if marketing flag off): campaigns, rules builder, coupons, referral print, school programs, grant queue.

No public “deals page” until public store flag.
