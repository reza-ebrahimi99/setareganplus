# 08 — Teacher, Consultant, and School Platforms

**Flag:** `sxp.partnerPortals` (and Book ERP `bookCommerce.marketing` when commissions are money)

[Index](./README.md) · Previous: [Wallet](./07-wallet-loyalty-referral.md) · Next: [Module integrations](./09-module-integrations.md)

These are **hub modes**, not copies of `/admin`. They must not receive warehouse or CRM-wide permissions by default.

---

## 1. Teacher panel

Grant `TEACHER` + Partner type TEACHER.

| Block | Content |
|-------|---------|
| Personal dashboard | Home KPIs |
| Sales | attributed qty/GMV |
| Commission | ACCRUED→PAID (from commission module) |
| Monthly / yearly goal | PartnerTarget |
| Remaining to goal | |
| Ranking | teacher leaderboard snapshot |
| Performance | conversion if clicks exist |
| Downloads | printable QR/PDF (files vault) |
| Referral link | profile referral |
| Campaigns | enrolled campaigns |
| Students introduced | counts; names only if org policy (default off) |

Commission posting remains the Book ERP / marketing worker. Hub **reads snapshots** (`PartnerDashboardSnapshot`).

---

## 2. Consultant panel

Same skeleton as teachers, **separate targets and leaderboard**.

Extras: conversion rate, student retention (repeat orders / repeat bookings), consulting reservation counts from booking (advisor = `BookingAdvisor.userId` link).

Do not give consultants `crm.view_all` via this panel.

---

## 3. School panel

Partner type SCHOOL + grant `SCHOOL_MANAGER` (school Party).

Can:

- Invite students (creates INVITED portal users / requests staff approval — Q8)
- Receive gifts / discounts / commission (campaigns)
- Track purchases of the school Party and optionally tagged students
- Track campaigns (donation, competition, free books)

Cannot: see other schools; post stock; edit institute CMS students without `website.manage`.

---

## 4. Rankings, targets, payouts

Reuse Book ERP commission/wallet/target/leaderboard **read models**. SXP does not invent a second commission engine. If Book ERP is not merged yet, snapshots can be empty and the panel shows empty states.

Payout history = wallet COMMISSION + PAID entries.

---

## 5. Routing

Preferred: `/portal` role switcher → `/portal/teacher` etc. (same cookie).  
Alternative: `/partners/*` if cookie isolation is required (Q6).

Admin impersonation of a teacher dashboard: permission `sxp.partners.impersonate`, audited.
