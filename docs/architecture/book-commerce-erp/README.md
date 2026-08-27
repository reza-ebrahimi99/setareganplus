# StarOS Book Commerce ERP — Architecture Index

**Status:** Principle-approved v1 **extended** — ERP pack v2. **No implementation until explicit go-ahead.**  
**Product (FA):** بازرگانی کتاب — ERP آژانس‌های کتاب قلم  
**Product (EN):** Pen Book Agency ERP  
**Product line:** `BOOK_AGENCY`  
**Feature flag:** `bookCommerce` = **OFF** by default (per organization; hard-off env optional)  
**This is not an online bookstore.** It is a complete agency operating system. Public storefront is a later, flagged module.

**Non-negotiable:** Additive only. Do not rewrite booking, CRM, booklet commerce, authentication, or existing RBAC. Do not generate Prisma, migrations, routes, pages, or components until explicitly approved.

---

## Approval gate

| Gate | State |
|------|--------|
| Repository inspection | Done — [00](./00-current-state.md) |
| v1 architecture (principle) | Approved |
| v2 ERP expansion (this pack) | **Waiting explicit implementation approval** |
| Prisma / routes / UI | **Blocked** |

If a later message says “start building,” implementers still follow **this folder**, not chat improvisation.

---

## Reading order (v2)

1. [Current state](./00-current-state.md) — production constraints (unchanged truth)
2. [Overview](./01-overview.md) — what an agency ERP is, bounded contexts, diagrams, flags, permissions, folder map
3. [Domain model](./02-domain-model.md) — logical entities, relations, indexes (no Prisma)
4. [Warehouse](./03-warehouse.md) — multi-warehouse, locations, ledger, scanner, counts, transfers
5. [Catalog](./04-catalog.md) — SKU, price history, bundles, barcode/QR print, Excel import engine
6. [Procurement](./05-procurement.md) — reservation → need → PR → PO → Pen warehouse → GRN → fulfill
7. [Sales](./06-sales.md) — orders, reservation slips, delivery, documents, CRM links
8. [Marketing](./07-marketing.md) — campaigns, schools, coupons, rules engine
9. [Commission](./08-commission.md) — teacher & consultant incentive platforms + dashboards
10. [Treasury](./09-treasury.md) — deposit, installment, remaining, wallet, AR
11. [Reporting](./10-reporting.md) — operational reports, executive analytics, AI-ready signals
12. [Public store](./11-public-store.md) — deferred storefront contract
13. [Roadmap](./12-roadmap.md) — phases, deployment, migration, risks
14. [Open questions](./13-open-questions.md) — decisions still needed before code

v1 provenance: [`archive/v1-principle-approval/`](./archive/v1-principle-approval/README.md)

---

## One-sentence summary

A **multi-warehouse, document-driven ERP** for Pen Book Agencies: catalog and price history, location-level stock ledger, demand-driven procurement from the Pen warehouse, reservations, deposits and installments, school/teacher/consultant growth engines, and executive analytics — running as an additive StarOS module with `bookCommerce` off until cutover.

---

## What this is / is not

| This is | This is not |
|---------|-------------|
| Agency operations ERP (انبارداری، خرید، فروش، خزانه، پورسانت) | Shopify-style public bookstore |
| Unlimited warehouses + locations (shelf, reserved, gift, return, damaged) | One scalar `stockQuantity` |
| Procurement from Pen central warehouse driven by student demand | Guesswork Excel to the publisher |
| Teacher/consultant **incentive platforms** with their own dashboards | A single affiliate cookie |
| Multi-agency SaaS-ready via existing `organizationId` | A hardcoded single-tenant rewrite |
| Admin-first | Public catalog in the first delivery |

---

## Bounded contexts (v2)

```text
                    StarOS platform (DO NOT REWRITE)
     Identity · Org/Branch · Audit · Media · SMS · PaymentIntent · Outbox
     CRM Lead · Student · Guardian · User  (link only — no second master)
                                    │
        ┌───────────────┬───────────┼────────────┬──────────────┐
        ▼               ▼           ▼            ▼              ▼
   CATALOG         WAREHOUSE    PROCUREMENT    SALES        TREASURY
   titles/SKU      locations    PR / PO / GRN  orders       deposit
   price history   ledger       replenishment  reservation  installment
   bundles         transfer     Pen warehouse  delivery     remaining
   labels/QR       count        Excel to Pen   documents    wallet/AR
        │               │           │            │              │
        └───────────────┴─────┬─────┴────────────┴──────────────┘
                              ▼
                    MARKETING + COMMISSION
              campaigns · schools · teachers · consultants
                              ▼
                         INSIGHTS + AI SIGNALS
                    (read models; no live ledger scans)
```

Booklet commerce (جزوه), if it later merges, remains `productLine = BOOKLET` and **never** shares this warehouse location model or Pen-procurement workflow.

---

## Feature flags

| Key | Default | Meaning |
|-----|---------|---------|
| `bookCommerce` | **false** | Master switch. Nav, mutations, workers no-op when off. |
| `bookCommerce.publicStore` | false | Public catalog |
| `bookCommerce.marketing` | false | Campaigns / school programs |
| `bookCommerce.partnerPortals` | false | Teacher/consultant dashboards |
| `bookCommerce.onlinePayment` | false | Gateway checkout |
| `bookCommerce.ai` | false | Write AI feature snapshots (still collect domain events either way) |
| `bookCommerce.hardOff` (env) | unset | Emergency disable all tenants |

---

## READY FOR IMPLEMENTATION

**Not yet.** This pack is the contract. Wait for an explicit message to generate production code. Until then: documentation only.
