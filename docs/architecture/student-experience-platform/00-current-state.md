# 00 — Current State (inspected, not assumed)

**Inspection date:** 2026-08-27  
**Sources:** `origin/master` (production canon), `origin/cursor/commerce-order-tracking-sms-581d` (unmerged booklet commerce), Book Agency ERP architecture pack (sibling, docs only).

[Index](./README.md) · Next: [Overview](./01-overview.md)

SXP must **compose** this reality. It must not invent a parallel login, a second user table, or a second CRM.

---

## 1. Stack (production)

| Layer | Truth |
|-------|--------|
| App | Next.js **16.2.10** App Router, React 19, Tailwind 4, Vazirmatn, `lang="fa"` `dir="rtl"` |
| Data | Prisma 7 + PostgreSQL, integer Rials, UTC instants, Jalali at UI edges |
| Auth | **Custom** hashed cookie sessions. **Not NextAuth.** |
| Tenancy | `organizationId` on tenant rows; composite FKs for branches |
| Jobs | CLI cron workers (SMS, CRM), not in-process daemons |

---

## 2. Identity & sessions (do not replace)

**`User`** is already a global account: `email?`, `normalizedMobile?` unique, `passwordHash?`, `isPlatformAdmin`, status, soft-delete.

**`OrganizationMembership`:** exactly **one row per user per organization** (`@@unique([organizationId, userId])`) with **one** `SystemRole`. Empty `BranchMembership` = all branches.

**Cookies** (`lib/auth/cookie.ts`):

| Cookie | Audience | Storage |
|--------|----------|---------|
| `staros_admin_session` | `/admin` (and staff login) | `AdminSession.tokenHash` |
| `staros_portal_session` | `/portal` | **same `AdminSession` table**, different cookie |
| `staros_portal_active_link` | which portal link is active | re-validated every request |

Middleware (`middleware.ts`) is **cookie presence only** for `/admin` and `/portal`. Real auth is in loaders (`require-admin`, `requirePortalContext`).

**OTP:** `OtpPurpose.LOGIN` / `STAFF_LOGIN` / `VERIFY_MOBILE` / `BOOKING` / `FORM`. Portal login is mobile OTP, not passwords.

**Staff login:** `/admin/login` and `/staff/login` resolve membership by mobile. Portal login requires an active `PortalAccountLink` or it refuses **without** leaking whether a student exists.

---

## 3. Portal today (the seed of the hub)

Documented in `docs/student-parent-portal-foundation.md` on master.

```text
OTP → User → PortalAccountLink → Student XOR Guardian → authorizedStudents → dashboard
```

`PortalAccountType` = `STUDENT | GUARDIAN` only.

Routes:

- `/portal` → redirect student or parent
- `/portal/student` — assessments, achievements, thin profile
- `/portal/parent` — linked students
- `/portal/select-account` — multiple links
- `/portal/student/profile` — name, grade, year, portrait **only**

Student portal is **academic CMS + assessments**, not an experience hub. No orders, wallet, timeline, files vault, or bookings list.

**`Student`** is an org-scoped academic/CMS record (grade, major, portrait, public slug). It is **not** the login identity. Linking is explicit (`PortalAccountLink`), never by matching `parentName` text.

---

## 4. RBAC today

`lib/auth/permissions.ts`: string keys (`crm.*`, `booking.*`, `portal.student.access`, `portal.guardian.access`, …). Role → set. `isPlatformAdmin` bypasses.

`STAFF_ASSIGNABLE_ROLES` does **not** include TEACHER as staff-assignable in the same way as admissions roles; TEACHER and STUDENT/PARENT exist on the enum.

**Constraint for SXP:** one membership role per org. A parent who is also a teacher cannot have two `OrganizationMembership` rows. Multiple experience roles must be **additive grants**, not a second membership.

---

## 5. Routing today

| Prefix | Meaning |
|--------|---------|
| `/` public marketing | browse courses, classes, exams, consultation, pre-registration |
| `/forms/[slug]` | public forms |
| `/book/[serviceSlug]` | **appointment booking** (not books) |
| `/admin` | staff ERP/CRM |
| `/portal` | student/parent |
| `/staff/login` | staff OTP entry |
| `/shop`, `/booklet`, `/order` | booklet commerce **on unmerged branch only** |

Public site is informational; registration/booking/forms already collect data with OTP in places. SXP rule: **meaningful actions require login** — extend this consistently.

---

## 6. CRM, booking, payments, commerce

| Domain | Production (`master`) | Notes |
|--------|------------------------|--------|
| CRM | Leads, pipelines, tasks, SMS, import | Keep as staff write-model |
| Booking | `BookingReservation` + slots + QR check-in | Statuses PENDING…NO_SHOW |
| Forms | Versioned builder + submissions | |
| Payments | **Not on master.** Commerce branch: `PaymentIntent` + `COMMERCE_ORDER` payable | SXP treasury **reuses** this when present |
| Booklet | Unmerged: `CommerceOpsStage` REGISTERED → DELIVERED_TO_STUDENT, pickup, QR | Different pipeline from published books |
| Book Agency ERP | Docs only, `bookCommerce` off | Procurement/warehouse ledger |
| SMS | `SmsMessage` queue + SMS.ir | |
| Outbox | `DomainEventOutbox` (forms/booking types today) | **SXP timeline consumer** |
| Media | `MediaAsset` on disk (`STAROS_MEDIA_ROOT`) | Files vault points here |
| Achievements | Public CMS `Achievement` on Student | **Not** loyalty badges — do not overload |

---

## 7. Implications

1. SXP Hub **extends `/portal`**, it does not replace `/admin` or `/book`.
2. Identity = existing `User`. Profile = new org-scoped `ExperienceProfile` **linked** to User + Student/Guardian/Partner.
3. Timeline **projects** `DomainEventOutbox` (+ new types). Modules keep writing to their tables.
4. Wallet/loyalty/referral live on the **User/Profile**, shared with Book ERP partner wallets via the same wallet ledger (one money notebook).
5. Flag `sxp` off ⇒ today’s portal/admin behavior unchanged.
