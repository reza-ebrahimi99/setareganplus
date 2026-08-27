# 12 — Roadmap, Migration, Risks

[Index](./README.md) · Previous: [UX](./11-ux-public.md) · Next: [Open questions](./13-open-questions.md)

---

## 1. Roadmap (sequence, not a calendar)

| Phase | Name | In | Exit |
|-------|------|----|------|
| **S0** | Flag + no UX change | `sxp=false`, docs only | production identical |
| **S1** | Profile + timeline projector | ExperienceProfile, outbox→timeline for **existing** BOOKING/FORM/SMS events, hub Home + Timeline + Profile | today’s portal still works; new nav behind flag |
| **S2** | Files vault | point assessment/certificate media + future receipts | download authz uses guardian flags |
| **S3** | Hub reservations | BookingReservation projection | matches `/admin/bookings` for that user/mobile |
| **S4** | Wallet + loyalty + referral | ledgers, hub sections | no cash payout |
| **S5** | Booklet orders in hub | map ops stages | only if booklet tables exist |
| **S6** | Book orders in hub | map ERP statuses | only if `bookCommerce` data exists |
| **S7** | Payments/invoices | PaymentIntent + documents as files | remaining/deposit visible |
| **S8** | Partner modes | teacher/consultant/school | snapshots; no extra admin perms |
| **S9** | Notifications in-app | bell | SMS unchanged |
| **S10** | Login-required public actions | flags | dual-run legacy forms |
| **S11** | AI suggestions | read-only | no auto-execute |

Book Agency ERP phases (A–P in sibling pack) stay **independent**. SXP S5–S7 **consume** them when present.

Workers: `sxp:timeline-projector-once`, later loyalty/referral. Same VPS cron pattern.

---

## 2. Migration strategy

1. Ship S1 with flag **off** on production org.
2. Backfill timeline from recent outbox (and optionally from booking/form tables once).
3. Create ExperienceProfile lazily on first flagged login (from User + Student portrait).
4. Do not move portal cookies.
5. Dual-run: old `/portal/student` routes remain; hub wraps them as sections.
6. Rollback = flag off (new tables remain).
7. Implementation git base: **`origin/master`**, not the CRM-UI snapshot.

Identity: no user merge job unless duplicates are proven (open Q10).

---

## 3. Deployment

Same Next.js process, same Postgres. Middleware: if hub stays under `/portal`, **no matcher change**. If `/partners` is added, extend matcher **carefully** (login exception).

Emergency env `STAROS_SXP_HARD_OFF=true`.

---

## 4. Risks

| Risk | Mitigation |
|------|------------|
| Replacing auth with NextAuth | Forbidden |
| Second User table | Forbidden |
| Breaking XOR portal links | Additive grants; keep XOR per link row |
| Timeline HTTP fan-out | Projector + indexes |
| Mixing CMS achievements with loyalty | Two tabs / two tables |
| Hub writes stock/CRM | Loaders read-only except profile/prefs |
| Permission bleed to teachers | grants ≠ `commerce.manage` |
| Middleware accidentally gating `/r` `/q` | keep public |
| Booklet/book status confusion | mapped labels + channel badge |
| PII on timeline | visibility + no SMS body |
| Flag on too early | default false |
| Duplicate wallets vs Book ERP | one ledger grain userId+org |

---

## 5. Success

- Login still OTP; existing student can see assessments **and** (when flagged) a timeline including a past booking if any
- Parent still cannot see unauthorized children
- Admin CRM unchanged
- `/book` still books appointments
