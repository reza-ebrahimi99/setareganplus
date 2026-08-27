# 00 — Current State & Constraints

**Status:** Inspection canon (unchanged). v1 architecture principle-approved; v2 ERP pack supersedes implementation shape.  
**Inspection date:** 2026-08-27  
**Rule:** Design against *production truth*, not the agent snapshot and not the prompt’s assumed stack.

[Index](./README.md) · Next: [Overview](./01-overview.md)

---

## 1. What was inspected

| Ref | What it actually is |
|-----|---------------------|
| Workspace branch `feat/admin-crm-ui-foundation` | Early public RTL website + **admin CRM UI foundation**. Prisma: Organization, Branch, User, memberships, AuditLog, Lead. Auth **not wired**. |
| `origin/master` (production canon) | Full StarOS: custom admin/portal sessions, RBAC, CRM, form builder, booking engine, SMS.ir queue, student/parent portal, assessment center, media library, Excel import/export, QR. **No book catalog. No warehouse. No commerce tables.** |
| `origin/cursor/commerce-order-tracking-sms-581d` | Large unmerged **booklet (جزوه)** commerce: `CommerceItem` / `CommerceOrder`, on-site pickup, print production pipeline, scalar `stockQuantity`, shop + booklet tickets, SMS, QR, Excel export. **Not published-book agency ERP.** |

The Book Commerce ERP must be designed as if **master is production** and booklet commerce **may or may not** merge later. Both futures must be safe.

---

## 2. Stack corrections (prompt vs repo)

The request assumed Next.js 15 + NextAuth. Production is different. **Do not introduce a second auth or a second app.**

| Topic | Prompt | Production (`origin/master`) | Design decision |
|-------|--------|------------------------------|-----------------|
| Framework | Next.js 15 | **Next.js 16.2.10** App Router | Stay on 16. Read `node_modules/next/dist/docs/` before any code. |
| UI | React + Tailwind | React 19.2 + Tailwind CSS 4 + Vazirmatn, `lang="fa"` `dir="rtl"` | Persian-first, RTL, existing admin shells. |
| Language | TypeScript strict | `strict: true` | Keep strict; no `any` in domain services. |
| ORM | Prisma | **Prisma 7** + `@prisma/adapter-pg` + generated client at `generated/prisma` | Additive migrations only. |
| DB | PostgreSQL | PostgreSQL, amounts in **integer Rials**, timestamps **UTC** | Jalali only at UI / Excel boundaries (`lib/datetime`). |
| Auth | NextAuth | **Custom** hashed cookie sessions (`AdminSession`, portal cookies, OTP). Middleware is cookie-presence only; real auth is in loaders. | **Do not add NextAuth.** Extend `lib/auth/permissions.ts`. |
| RBAC | RBAC | `SystemRole` → permission sets; `isPlatformAdmin`; branch scope via `BranchMembership` (empty = all branches). | New permissions + a few job roles. No silent role reuse that over-grants. |
| Tenancy | Multi-tenant | Every tenant row has `organizationId`; branch rows have composite FKs `(organizationId, branchId)`. Unscoped reads forbidden. Soft-delete `deletedAt`. `onDelete: Restrict` for historical rows. | Same rules for every new table. |
| SMS | — | Provider-neutral `SmsMessage` queue + SMS.ir Verify templates; CLI worker `communication:worker-once`. | New purposes/templates; same queue. Never call the provider from a page action as the durable send path. |
| Excel | — | `exceljs`; CRM + assessment import wizards; form/booking export. Formula-injection hardening already a known risk. | Reuse wizard/job pattern; never eval Excel formulas. |
| QR | — | `qrcode` for forms, booking check-in, booklet tickets. | Reuse; books get their own token namespace. |
| Money | — | `PaymentIntent` + `PaymentSession` + `PaymentEventLog`. On the commerce branch, `PaymentPayableType.COMMERCE_ORDER` already exists. | Partial pay / deposit is **allocations on top of intents**, not a second payment stack. |
| Jobs | — | Cron CLI workers on VPS (SMS, CRM automation, CRM scheduled). Not in-process Next.js. | Inventory expiry, import, commission: same worker style. |

---

## 3. Production domains that must keep working

These are live (or staging-complete on master) and are **out of scope to rewrite**:

1. Public marketing site (Persian RTL pages).
2. Admin session login + staff RBAC.
3. CRM leads, pipelines, tasks, calls, SMS, Excel import.
4. Form builder + submissions + QR.
5. Smart booking engine (`/book/[serviceSlug]` is **appointment booking**, not books).
6. Communication / OTP / SMS.ir.
7. Student & parent portal.
8. Assessment center.
9. Media library / gallery / team / student CMS.
10. Site placements.

Any Book ERP change that requires editing these must be **additive** (new enum values, new permission keys, new nav group, new worker). Behavior-preserving refactors of shared helpers (`lib/prisma.ts`, `require-admin`, SMS send, Excel) need golden tests first.

---

## 4. What the agency does today (business truth)

Kanoon Farhangi Amoozesh (Pen Book Agency) sells **thousands of published books**. Each book currently has:

| Field | Today | ERP target |
|-------|--------|------------|
| Internal code | Yes | Unique per organization (`internalCode`) |
| Barcode | Future | EAN/ISBN/custom; nullable; unique when present |
| Title | Yes | Master + display title |
| Group | Yes | Taxonomy (`BookGroup`) |
| Major | Yes | Taxonomy (`BookMajor`), optional by group |
| Price | Yes | List price + optional sale price; snapshot on order lines |
| Publisher | Yes | `Publisher` entity (Kanoon and others) |
| Edition | Yes | Edition / year on the sellable SKU |
| Active/Inactive | Yes | Catalog status, independent of stock |

Current pain (must appear as first-class modules, not reports bolted on later):

- Inventory unknown → warehouse + ledger + ATP
- Handwritten orders → staff order capture + public/optional later
- Deposits forgotten → deposit + remaining balance + ageing
- Excel prepared manually → import/export jobs with audit
- Books ordered from warehouse manually → purchase orders + goods receipt
- No stock control → reservation, issue, adjustment, count
- No commission / marketing / campaign / reporting → marketing engine + finance reports

---

## 5. Booklet commerce vs Book Agency (critical split)

| | Booklet shop (جزوه) | Book Agency (کتاب) |
|--|---------------------|---------------------|
| SKU | In-house printed booklets | Published books from publishers |
| Flow | Register → pay → **production** → ready → pickup | Quote/order → reserve → (deposit) → receive/issue → deliver |
| Stock | Optional scalar `stockQuantity` | Multi-warehouse ledger |
| Delivery | On-site pickup only (`PICKUP_ONSITE`) | Pickup + later courier; school bulk delivery |
| Existing code | Feature branch, not master | **Does not exist** |
| Admin nav | «فروشگاه» / «مرکز عملیات جزوه» | New group «بازرگانی کتاب» |

**Rule:** Never overload `CommerceOpsStage` (`REGISTERED → IN_PRODUCTION → …`) for published books. Books get their own fulfillment states. Shared catalog/order/payment tables are allowed **only** with a discriminator (`productLine` / `systemKind`).

`CommerceSystemKind` already includes `PHYSICAL`. Book agency SKUs are `PHYSICAL` plus `productLine = BOOK_AGENCY` (or `systemKind` additive value `BOOK` if we must distinguish in reports without a second field). Prefer an explicit `productLine` enum: `BOOKLET | BOOK_AGENCY | OTHER`.

---

## 6. Invariants copied from StarOS (non-negotiable)

From `prisma/schema.prisma` header comments on master:

1. Every tenant-owned row carries `organizationId`.
2. Branch-scoped rows also carry `branchId`.
3. Composite relations tie `branchId` to the parent organization.
4. Application queries **always** filter by `organizationId`.
5. User identity ≠ tenant membership.
6. `User.isPlatformAdmin` is independent of membership.
7. Empty `BranchMembership` = all branches in the org.
8. Soft-delete via `deletedAt`; do not hard-delete historical commerce/finance rows.
9. Composite FKs never use `onDelete: SetNull`.
10. Secrets only in environment variables.
11. OTP hashed; never store plaintext OTP.
12. Domain events go through `DomainEventOutbox` when side effects cross modules.

---

## 7. Seed / org context

Seed org: `setareganplus` / ستارگان پلاس.  
Seed branch: `nasim-shahr` / مرکز آموزشی نسیم‌شهر.

Book Agency may start as:

- same organization (recommended — one StarOS tenant), plus
- a dedicated **logical warehouse** (and later physical branch) named for the agency,

**not** a second `Organization` row unless product later sells this ERP to other institutes (multi-tenant is already in the schema for that future).

---

## 8. Public legal / brand constraint

Public site copy already states SetareganPlus does **not** claim official Kanoon Ghalamchi technical connection. Book Agency UI must keep:

- operational name for staff (آژانس کتاب / بازرگانی کتاب),
- no implied official Kanoon exam/portal integration,
- publisher stored as master data, not as a hardcoded brand.

---

## 9. Implications for this design

1. **Phase 0 is flags + empty nav + schema**, not a public shop.
2. **Inventory truth is a ledger**, even if v1 has a single warehouse.
3. **Payments reuse `PaymentIntent`**; deposits are allocations + remaining balance.
4. **Customers are Parties**, linked to Lead / Student / Guardian / User when known.
5. **Marketing is a separate bounded context** with its own wallets, not a column on `CommerceOrder`.
6. Implementation remains **blocked** until the v2 pack is explicitly approved for code. Feature flag `bookCommerce` stays **OFF**.
