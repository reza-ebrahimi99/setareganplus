# 12 — Roadmap, Migration, Risks

[Index](./README.md) · Previous: [UX](./11-ux-public.md) · Next: [Open questions](./13-open-questions.md)

**Additive (does not change the table below):** Super App / My Profile v2 mapping lives in [s2-profile-v2](./s2-profile-v2/README.md). S2 remains **Downloads + Student Card**. Do not collapse S3–S12.

---

## 1. Roadmap (sequence, not a calendar)

| Phase | Name | In | Exit |
|-------|------|----|------|
| **S0** | Flag + no UX change | `sxp=false`, docs only | production identical |
| **S1** | **Experience Engine v0** | Inbox + TimelineAppender + FeedCurator + WidgetSnapshotter + Profile; consume **existing** BOOKING/FORM/SMS events only; hub Home + Timeline | today’s portal works; Engine is the only hub read path behind flag |
| **S2** | Downloads + Student Card | FILE_READY index, digital card | guardian flags on downloads |
| **S3** | Reservations widgets | booking events → HubReservation | no live `findMany` on booking in hub |
| **S4** | Wallet **views** + loyalty **views** + referral | ledgers remain treasury; Engine projects | no cash payout |
| **S5** | Booklet in hub | booklet events | tables must exist |
| **S6** | Books in hub | book events | `bookCommerce` data |
| **S7** | Payments views | PAYMENT_* | remaining/deposit on widgets |
| **S8** | Partner modes | teacher/consultant/school | still Engine read models |
| **S9** | In-app notifications handler | bell | SMS unchanged |
| **S10** | Favorites / recents / extra widgets | engine-owned state | |
| **S11** | Login-required public actions | flags | dual-run |
| **S12** | AI suggestion widget | read-only | no auto-execute |

Book Agency ERP phases (A–P in sibling pack) stay **independent**. SXP S5–S7 **consume their events** when present — still through the Experience Engine.

Workers: `sxp:experience-engine-once` (inbox handlers). Do **not** replace `communication:worker-once` or CRM workers.

---

## 2. Migration strategy

1. Ship S1 with flag **off** on production org.
2. Backfill Engine inbox from recent outbox (and optionally from booking/form tables **once**).
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
| Timeline HTTP fan-out | Experience Engine snapshots + indexes |
| Second projector in booking/booklet | Forbidden; Engine is the only hub consumer |
| Engine marks shared outbox PROCESSED | Use `ExperienceEngineInbox`; leave CRM/SMS workers |
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

- Login still OTP; existing student can see assessments **and** (when flagged) Engine timeline including a past booking event
- Hub Home widgets come from Engine snapshots, not live booking SQL
- Parent still cannot see unauthorized children
- Admin CRM / SMS workers unchanged
- `/book` still books appointments
