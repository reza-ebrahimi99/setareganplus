# 00 — Inspection findings

[Index](./README.md) · Next: [Vision](./01-vision-and-phase-map.md)

Inspected 2026-08-27 against:

- Production lineage: `origin/master` (`e5dab77`)
- S1 implementation: `origin/cursor/sxp-phase-s1-0a18` (`57c59b2`, PR #8)
- Frozen SXP pack: `origin/cursor/sxp-architecture-0a18`
- Book ERP pack: `origin/cursor/book-commerce-erp-design-0a18` (docs only)
- Unmerged booklet commerce: `origin/cursor/commerce-order-tracking-sms-581d` (not on master)

**Do not treat workspace snapshot `feat/admin-crm-ui-foundation` as production.**

---

## 1. Production truth (master)

StarOS is Next.js 16 + React 19 + Prisma 7 + PostgreSQL + Tailwind 4 + Vazirmatn, `lang="fa"` `dir="rtl"`.

| Domain | On master | Hub implication |
|--------|-----------|-----------------|
| Identity | `User`, OTP, `AdminSession` | Keep. No NextAuth. |
| Cookies | `staros_admin_session`, `staros_portal_session`, `staros_portal_active_link` | Keep. Same portal cookie for S2. |
| Tenancy | `organizationId` on every tenant row | Hub loaders already org-scoped. |
| RBAC | `OrganizationMembership` one role per user per org | Do not add a second membership. Extra modes = future `ExperienceRoleGrant`. |
| Portal | `/portal` student XOR guardian links | Dual-run academic **خانه** vs S1 **تجربه**. |
| Booking | `/book/[serviceSlug]` appointments; `BOOKING_*` outbox | Payloads privacy-limited (no mobile). Worker resolves user; Hub must not `findMany` reservations. |
| CRM | Claims shared outbox `PENDING` → `PROCESSING` | Engine **inbox** stays private (S1 already). |
| SMS | `SmsMessage` queue; **not** in `DomainEventType` | S1 synthetic `sms-message:{id}`. Do not change send path. |
| School ERP | `Student`, assessments, CMS `Achievement` | Academic خانه still live-reads these. Hub Learning section later projects — S2 does not replace assessments pages. |
| Commerce / wallet / loyalty / coupons / referral / messages / files vault / digital card | **Absent on master** | Empty Engine snapshots until publishers exist. Never fake joins. |
| Book ERP | Docs only; flag `bookCommerce` default off | Independent roadmap. SXP consumes `BOOK_*` events in **S6**, not S2. |

`DomainEventType` on master: four `FORM_*` + eight `BOOKING_*`. Nothing else.

---

## 2. Portal, navigation, RBAC

### Portal gate

- Middleware: cookie **presence** on `/portal/*` (login/logout excepted).
- Real auth: `requireStudentPortalAccess` / `requireGuardianPortalAccess` via `PortalAccountLink`, **not** `hasPermission()`.
- Permission keys `portal.student.access` / `portal.guardian.access` exist on `SystemRole.STUDENT` / `PARENT` but **are unused** in portal HTTP. Q7 default: keep reusing link-based access; do not switch the Hub to `hasPermission` in S2.

### Nav today (S1, flag on)

Student: خانه · پروفایل · آزمون‌ها · افتخارات · **تجربه** · **روند**  
Parent: خانه · فرزندان · آزمون‌ها · افتخارات · **تجربه** · **روند**

Academic **خانه** (`/portal/student`, `/portal/parent`) is **not** the Experience Hub. `/portal` still redirects there. S1 **تجربه** is opt-in.

`PortalShell` appends `extraNavItems` when `isSxpEnabled`. Flag off → identical production nav.

### Guardian model

Per-child flags: `canViewAcademicData`, `canViewAchievements`, `canViewCertificates`, `canReceiveNotifications`. S2 downloads **must** honor certificate/academic flags. S1 parent hub shows the **guardian User’s** projections, not child fan-out (deferred).

---

## 3. Feature flags

| Mechanism | Production |
|-----------|------------|
| `OrganizationFeatureFlag` | S1 table. Only key in code: `"sxp"`. |
| No row / `enabled=false` | OFF |
| `STAROS_SXP_HARD_OFF=true\|1\|yes` | OFF, wins |
| `bookCommerce` | Documented, **not implemented** |
| `STAROS_SMS_ENABLED`, `STAROS_AI_ENABLED` | Env, unrelated |

Worker S1 checks **hard-off only**, not per-org `sxp`. Projections may exist for flag-off orgs; Hub 404s. Acceptable; do not “fix” by claiming the shared outbox.

---

## 4. S1 — frozen implementation (do not redesign)

| Piece | Fact |
|-------|------|
| Tables | `OrganizationFeatureFlag`, `ExperienceProfile`, `ExperienceEngineInbox`, `ExperienceTimelineEvent`, `ExperienceWidgetSnapshot` |
| Handlers | `TIMELINE_APPENDER`, `FEED_CURATOR`, `WIDGET_SNAPSHOTTER` only |
| Events | Existing BOOKING/FORM + SENT SMS (OTP skipped; no body) |
| Hub HTTP | Engine tables + `PortalContext` identity strip only |
| Widgets | Next action, upcoming reservation (from **timeline**), recent feed. `OPEN_BALANCE` / `LOYALTY_CHIP` / `READY_PICKUP` = `phase_s1_unavailable` |
| Routes | `/portal/{student\|parent}/{experience\|timeline}` → `notFound()` if flag off |
| Outbox | **Not** marked PROCESSED |

S1 is **Experience Engine v0**, not a full Super App. That is correct.

---

## 5. Gaps vs Super App vision

Requested in the product brief, **missing as data** on master:

Hero extras (cover, membership, level, points, rank, completion, QR, card) · order/payment/message/download/assignment/exam/wallet/coupon/referral/teacher-reward cards · day-grouped infinite timeline with search · unified orders · wallet/loyalty · certificates vault · learning charts · files · booking reschedule from hub · notification inbox · message threads · referral center · coupons · my teachers · settings suite · universal search · AI assistant.

**How to fill them without breaking the golden rule:** publishers + Engine handlers + empty states until the publisher exists. Mapping is [01](./01-vision-and-phase-map.md).

---

## 6. Coupling risks found in S1 (carry forward)

1. Parent hub ≠ child timeline (visibility fan-out not built).
2. Unresolved mobile → event skipped (needs documented backfill, Q14).
3. Academic ERP still live-queried on **خانه** — allowed; Hub must not copy that pattern.
4. Horizontal tab overflow if Super App dumps 20 IA items into `PortalNav` — S2 needs a mobile information architecture, not 20 tabs.

---

## 7. Decision

S2 architecture **extends** S1 tables, worker, flag, and routes. It does **not** replace academic خانه, does **not** query booking/commerce, and does **not** implement S3–S12 ledgers in the S2 slice.
