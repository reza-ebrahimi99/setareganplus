# 13 — Open Questions

**Status:** Must be answered (or explicitly deferred) before production code  
**Until then:** READY FOR IMPLEMENTATION is **not** a green light to generate Prisma/UI.

[Index](./README.md) · Previous: [Roadmap](./12-roadmap.md)

---

## Product / domain

| ID | Question | Recommendation | Default if silent |
|----|----------|----------------|-------------------|
| Q1 | Share booklet `CommerceOrder` with `productLine`, or dedicated `SalesOrder` tables? | Dedicated `SalesOrder*` if booklet merge is uncertain; share only if booklet is already on master | Dedicated tables named for books, still `productLine` if a shared catalog item is used |
| Q2 | New `PaymentPayableType.BOOK_ORDER` vs reuse `COMMERCE_ORDER`? | Reuse COMMERCE_ORDER + metadata productLine if that enum already exists in target branch; else additive BOOK_ORDER | Additive BOOK_ORDER to avoid booklet payment screens mixing |
| Q3 | Hard allocate to RESERVED location on confirm, or only after deposit? | Soft ATP on confirm; hard allocate on deposit or pick | Soft on confirm; firm+hard on deposit |
| Q4 | Add SystemRoles WAREHOUSE_KEEPER, BOOK_CASHIER, BOOK_AGENCY_MANAGER now? | Yes in the first **implementation** PR that posts stock, not in a docs PR | Add with the warehouse phase |
| Q5 | Auto-DRAFT purchase requests from replenishment without human? | Auto-draft yes; auto-approve no | Auto-draft only |
| Q6 | Show student names on teacher dashboards? | Default false | false |
| Q7 | Wallet spend as discount vs tender? | Discount (D5) | Discount |
| Q8 | Invoice at confirm vs at fulfill? | Fulfill (pickup) | Fulfill |
| Q9 | Public tracking page before public catalog? | Yes, small flag | Allow in phase G/I |
| Q10 | Gift/donation count in GMV? | No | Excluded |
| Q11 | Lots/batches as first-class (expiry, publisher lot)? | Metadata on GRN in v1; full lot master later | Metadata only |
| Q12 | Multi-warehouse in first warehouse phase or single then expand? | **Model** unlimited from day one; **operate** one CENTRAL+locations first | Schema unlimited; seed one warehouse + default locations |
| Q13 | Partner portal auth: new cookie vs staff User login? | Separate partner session like portal, not admin cookie | Partner cookie, not ADMIN_SESSION |
| Q14 | Commission on deposit or only full paid lines? | Accrue proportional to **paid** Rials | Paid only |
| Q15 | Implementation git base? | `origin/master` | master |

---

## Out of scope unless a later pack says so

- NextAuth
- Rewriting CRM, booking, booklet commerce, existing RBAC maps
- Courier APIs, native apps, pyramid MLM, AI auto-PO
- Prisma/schema/routes/components in **this** documentation cycle

---

## Approval language

To start code, send an explicit instruction such as:

> Approved to implement Pen Book Agency ERP Phase A from `docs/architecture/book-commerce-erp/` on `master`.

Until that exists, **do not** generate Prisma, migrations, routes, pages, or components.

---

## READY FOR IMPLEMENTATION

Architecture pack **v2 is complete** and ready for **human approval**.

**Not ready to generate production code** until that explicit approval names the phase and the git base.
