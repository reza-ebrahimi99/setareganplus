# SetareganPlus Experience Platform (SXP)

**Status:** S1 contract **frozen**. S1 code shipped separately. **My Profile v2 architecture is proposed — no S2 code until explicit approval.**  
**Product (FA):** سکوی تجربه ستارگان‌پلاس  
**Product (EN):** SetareganPlus Experience Platform  
**Heart:** **My Profile** — not the store, not booking, not CRM  
**Feature flag:** `sxp` = **OFF** by default  
**Non-negotiable:** Do not rewrite existing auth, RBAC maps, CRM, booking, booklet commerce, or payments. Do not introduce NextAuth. Additive only. Production must not break.

This is **not** a bookstore, **not** an ecommerce site, and **not** only a school ERP. It is a unified education **experience platform**: one identity, one profile, many modules.

---

## Approval gate

| Gate | State |
|------|--------|
| Production inspection | Done — [00](./00-current-state.md) |
| S1 architecture | **Frozen** — [06](./06-experience-engine.md), [12](./12-roadmap-migration-risks.md) |
| S1 implementation | Shipped on `origin/master` lineage — PR **#8** (`cursor/sxp-phase-s1-0a18`) |
| My Profile v2 architecture | **Waiting approval** — [s2-profile-v2](./s2-profile-v2/README.md) |
| S2+ code / Prisma / routes | **Blocked** |

---

## Reading order

1. [Current state](./00-current-state.md) — what StarOS actually is
2. [Overview](./01-overview.md) — vision, hub model, flags
3. [Bounded contexts](./02-bounded-contexts.md) — 21 contexts; **Experience Engine** is the hub projector
4. [Domain model](./03-domain-model.md) — logical entities (no Prisma)
5. [Identity](./04-identity.md) — one User, many roles, sessions
6. [Profile hub](./05-profile-hub.md) — dashboard IA; UI reads the Engine only
7. [Experience Engine](./06-experience-engine.md) — timeline, feed, widgets, card, … (sole hub consumer)
8. [Wallet, loyalty, referral](./07-wallet-loyalty-referral.md) — **ledgers**; Engine owns **views**
9. [Teacher / consultant / school platforms](./08-partner-platforms.md)
10. [Module integrations](./09-module-integrations.md) — books, booklets, booking, CRM, ERP
11. [Permissions, API, data](./10-permissions-api-data.md)
12. [UX & public website](./11-ux-public.md)
13. [Roadmap, migration, risks](./12-roadmap-migration-risks.md)
14. [Open questions](./13-open-questions.md)
15. **[My Profile v2 — Super App architecture](./s2-profile-v2/README.md)** — extends S1; does **not** replace this pack

Sibling pack (Book Agency ERP, separate PR): `docs/architecture/book-commerce-erp/`

---

## One-sentence summary

Keep StarOS modules as they are; add an **Experience Engine** that is the **only** projector of the personal hub (timeline, feed, notifications, widgets, …) from domain events — behind `sxp=off` until cutover. Modules keep their ledgers. The Hub only reads the Engine.

---

## READY FOR IMPLEMENTATION

**S1:** approved and implemented (flag default off).  
**S2 / My Profile v2 code:** **Not yet.** Wait for an explicit go-ahead before any production code. Architecture for that slice is [s2-profile-v2](./s2-profile-v2/README.md).
