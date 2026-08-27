# StarOS Book Commerce ERP — Architecture Index

**Status:** DRAFT — awaiting product / architecture approval  
**Scope:** Documentation only. **Do not implement** until this pack is explicitly approved.  
**Module name (FA):** بازرگانی کتاب — آژانس کتاب کانون فرهنگی آموزش  
**Module name (EN):** Book Commerce ERP (Pen Book Agency)  
**Product line code:** `BOOK_AGENCY`  
**Non-negotiable:** Current production must never break.

---

## Approval gate

This folder is a **design contract**, not a sprint backlog to start coding from chat.

| Gate | State |
|------|--------|
| Repository inspection | Done (this pack) |
| Architecture approval | **Waiting** |
| Schema approval | **Waiting** |
| UX / navigation approval | **Waiting** |
| Implementation | **Blocked** |

If a later chat says “start building,” implementers must still treat **this pack** as the source of truth — not ad-hoc prompts.

---

## Reading order

1. [Current state & constraints](./00-current-state.md) — what StarOS actually is today
2. [Architecture](./01-architecture.md) — bounded contexts, 30 domain modules, reuse vs new
3. [Database ERD](./02-database-erd.md) — models, relations, indexes
4. [Referral & marketing engine](./03-referral-marketing.md) — partners, campaigns, wallets, gamification
5. [Permissions, UX, UI](./04-permissions-ux.md) — RBAC, dashboards, navigation, admin + mobile
6. [Folder structure](./05-folder-structure.md) — where code will live when approved
7. [Development roadmap](./06-roadmap.md) — phased delivery that cannot break production
8. [Risks, migration, deployment](./07-risk-migration-deployment.md)

---

## One-sentence summary

Build an **additive**, feature-flagged Book Agency ERP beside existing StarOS domains (CRM, forms, booking, portal, SMS), reuse the Commerce / Payment / Communication foundations where they already exist, and treat **جزوه (booklet shop)** and **کتاب (published-book agency)** as two product lines that must not overwrite each other.

---

## What this is not

- Not a rewrite of SetareganPlus.
- Not NextAuth (production uses hashed cookie sessions).
- Not a second inventory number on `CommerceItem.stockQuantity` as the long-term truth.
- Not a merge of handwritten Excel into production without a dual-run cutover.
- Not a public shop launch in phase 1.

---

## Coverage matrix

| # | Module | Spec |
|---|--------|------|
| 1 | Product Catalog | [01 §5.1](./01-architecture.md) · [02 §3](./02-database-erd.md) |
| 2 | Inventory | [01 §5.2](./01-architecture.md) · [02 §4](./02-database-erd.md) |
| 3 | Warehouse movements | [01 §5.3](./01-architecture.md) |
| 4 | Orders | [01 §5.4](./01-architecture.md) |
| 5 | Order items | [01 §5.5](./01-architecture.md) |
| 6 | Reservation | [01 §5.6](./01-architecture.md) |
| 7 | Partial payment | [01 §5.7](./01-architecture.md) |
| 8 | Deposit | [01 §5.8](./01-architecture.md) |
| 9 | Remaining balance | [01 §5.9](./01-architecture.md) |
| 10 | Customer profile | [01 §5.10](./01-architecture.md) · Party |
| 11 | Delivery | [01 §5.11](./01-architecture.md) |
| 12 | Invoice | [01 §5.12](./01-architecture.md) |
| 13 | Receipt | [01 §5.13](./01-architecture.md) |
| 14 | SMS | [01 §5.14](./01-architecture.md) |
| 15 | QR | [01 §5.15](./01-architecture.md) |
| 16 | Barcode | [01 §5.16](./01-architecture.md) |
| 17 | Excel import | [01 §5.17](./01-architecture.md) |
| 18 | Excel export | [01 §5.18](./01-architecture.md) |
| 19 | Supplier ordering | [01 §5.19](./01-architecture.md) |
| 20 | Purchase planning | [01 §5.20](./01-architecture.md) |
| 21 | Inventory counting | [01 §5.21](./01-architecture.md) |
| 22 | Stock adjustment | [01 §5.22](./01-architecture.md) |
| 23 | Reports | [01 §5.23](./01-architecture.md) |
| 24 | Analytics | [01 §5.24](./01-architecture.md) |
| 25 | Audit logs | [01 §5.25](./01-architecture.md) |
| 26 | Permissions | [04](./04-permissions-ux.md) |
| 27 | Performance | [01 §5.27](./01-architecture.md) |
| 28 | Scalability | [01 §5.28](./01-architecture.md) |
| 29 | Multi branch | [01 §5.29](./01-architecture.md) |
| 30 | Multi tenant | [01 §5.30](./01-architecture.md) |
| — | Referral & marketing | [03](./03-referral-marketing.md) |
| — | Folder structure | [05](./05-folder-structure.md) |
| — | Roadmap | [06](./06-roadmap.md) |
| — | Risk / migration / deploy | [07](./07-risk-migration-deployment.md) |

Open decisions for sign-off: **D1–D10** in [07 §6](./07-risk-migration-deployment.md).

---

## Glossary

| Term | Meaning |
|------|---------|
| **StarOS / SetareganPlus** | The existing multi-tenant education platform (CRM, forms, booking, portal, SMS). |
| **Book Agency / Pen Book Agency** | Kanoon Farhangi Amoozesh book-resale operation: thousands of published books, deposits, warehouse replenishment. |
| **Booklet commerce (جزوه)** | Existing *unmerged* physical-booklet production + on-site pickup shop on `cursor/commerce-order-tracking-sms-581d`. Different SKU, different ops pipeline. |
| **CommerceItem** | Universal sellable catalog entity (goods, services, events). Book SKUs should *extend* this, not fork a parallel product table if booklet commerce lands. |
| **Inventory ledger** | Append-only stock movements. Balances are projections, never the only record. |
| **Reservation** | Soft hold of ATP (available-to-promise) until pay / expire / cancel / issue. |
| **Deposit (بیعانه)** | Allocated customer payment that does not necessarily complete the order. Remaining balance is first-class. |
| **Party** | Canonical person/org record that can be a customer, school, teacher, supplier, or affiliate without duplicating Student / Lead / User. |
| **Partner** | Referral / marketing actor (teacher, consultant, school, parent, student, affiliate). |
| **Feature flag** | Per-organization kill switch. Default **off** in production until cutover. |
