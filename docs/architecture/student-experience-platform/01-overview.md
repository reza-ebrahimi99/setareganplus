# 01 — Overview

**Flag:** `sxp` = OFF  
**Heart:** My Profile

[Index](./README.md) · Previous: [Current state](./00-current-state.md) · Next: [Bounded contexts](./02-bounded-contexts.md)

---

## 1. What SXP is

SetareganPlus Experience Platform is the **user-facing operating system** of the institute:

- One person signs in once.
- They land on **My Profile** (Hub).
- From the hub they see **their** books, booklets, reservations, classes, files, wallet, points, referrals, messages — regardless of which staff system created the record.
- Staff keep using `/admin` CRM, booking ops, warehouse, finance.
- Modules remain bounded contexts with their own documents and ledgers.

SXP does **not** become Shopify, does **not** replace Pen Book Agency ERP, and does **not** merge Student CMS rows into `User`.

---

## 2. Hub, not a storefront

```text
     Booking / Booklet / Books / CRM / ERP / Treasury / Identity
                    write own ledgers
                    MUST publish DomainEventOutbox
                              │
                              ▼
                 ┌────────────────────────────┐
                 │     EXPERIENCE ENGINE      │
                 │  sole hub projector        │
                 │  Timeline · Feed · Notify  │
                 │  Widgets · Card · Views    │
                 │  NO business documents     │
                 └─────────────┬──────────────┘
                               ▼
                 ┌────────────────────────────┐
                 │   EXPERIENCE HUB  /portal  │
                 │   Profile UI — reads only  │
                 └────────────────────────────┘
```

CRM remains staff-owned. The Engine projects “your advisor” into widgets; it is not a second pipeline.

The Hub UI never queries booking/order/CRM tables as its source of truth. See [06](./06-experience-engine.md).

---

## 3. One identity, many roles

```text
User  (global login — already exists)
  │
  ├── OrganizationMembership.role     ← KEEP (one primary staff/portal role per org)
  ├── PortalAccountLink[]             ← KEEP (student XOR guardian today; extend types later)
  ├── ExperienceRoleGrant[]           ← ADD (TEACHER, CONSULTANT, CASHIER, … without new membership)
  ├── ExperienceProfile               ← ADD (hub profile fields)
  └── Partner / Student / Guardian    ← LINK, do not clone
```

Role switcher on the hub: “دانش‌آموز | ولی | معلم | مشاور | …” only for grants the user actually has.

---

## 4. Public vs logged-in

Visitors **browse** the marketing site.  
**Login required** for: order, reservation, downloads, wallet, coupons, files, invoices, history, referral payout views, messages.

Anonymous booking/forms that exist today are a **compatibility exception** until a migration window (open question Q3). Default for new SXP actions: login first (OTP).

---

## 5. Feature flags

| Key | Default | Effect |
|-----|---------|--------|
| `sxp` | false | Hub chrome, Experience Engine worker, extra portal nav |
| `sxp.wallet` | false | Wallet UI |
| `sxp.loyalty` | false | Tiers/points |
| `sxp.referral` | false | Profile referral tools |
| `sxp.partnerPortals` | false | Teacher/consultant/school hub modes |
| `sxp.files` | false | File vault |
| `sxp.forceLoginForBooking` | false | When on, `/book` requires portal/admin session |

`bookCommerce` remains the Book Agency ERP flag (sibling pack). SXP **reads** book orders when that module exists; it does not enable warehouse by itself.

---

## 6. UX canon

Persian-first, RTL, responsive, premium (existing navy/gold tokens, Vazirmatn). Hub must feel like a personal product (Apple-like density and calm), **not** a clone of `/admin` tables.

Existing portal cards are the seed; SXP restyles **additively** behind the flag (empty states for modules not yet linked).

---

## 7. AI

Recommendations only: books, classes, consultants, inactive students, top buyers, shortage/procurement hints. **Never** auto-order, auto-pay, or auto-SMS campaigns without a human. See [02](./02-bounded-contexts.md) and [10](./10-permissions-api-data.md).
