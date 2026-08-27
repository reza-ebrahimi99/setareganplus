# My Profile v2 — Super App architecture

**Status:** Architecture only — **no S2 implementation until explicit approval**  
**Extends:** Frozen S1 Experience Engine (PR #8)  
**Does not replace:** [parent pack 00–13](../README.md), Book Agency ERP pack, CRM, booking, portal academic dashboards  
**Flag:** `sxp` remains **OFF** by default. Sub-flags stay off until their phase.

This folder is the contract for turning `/portal` into a complete educational Super App **without** the Hub ever depending on business modules.

---

## Golden rule (unchanged)

```text
Every future module MUST publish DomainEventOutbox.
Experience Engine is the ONLY hub consumer.
The Hub renders projections only.

Never query booking tables from Hub HTTP.
Never query commerce / ERP / CRM / SMS queues from Hub HTTP.
No publish → empty state, not a special-case join.
```

---

## Reading order

1. [Inspection findings](./00-inspection-findings.md) — production, S1, portal, RBAC, flags
2. [Vision and phase map](./01-vision-and-phase-map.md) — Super App IA mapped onto frozen S2–S12
3. [UX wireframes](./02-ux-wireframes.md)
4. [Navigation, component tree, folders](./03-navigation-and-components.md)
5. [Events, projections, data & API contracts](./04-events-projections-contracts.md)
6. [Risks, flags, performance, mobile, a11y, tests, rollout, commits](./05-risks-flags-rollout.md)

---

## What this pack is

| This pack | Not this pack |
|-----------|----------------|
| Additive Hub **product** architecture (My Profile v2) | A rewrite of S1 Prisma or routes |
| Exact mapping of every requested Super App surface → frozen phase | Collapsing S3–S12 into one S2 PR |
| Contracts so new modules auto-appear | Hub SQL into `BookingReservation` / unmerged commerce |
| Premium Persian RTL UX specification | Immediate UI/Prisma code |

---

## Approval language (required before S2 code)

> Approved to implement SXP Phase S2 (Downloads + Digital Student Card + Hub shell v2) from `docs/architecture/student-experience-platform/s2-profile-v2/` on `master`, extending S1 without redesigning it.

Until that sentence exists, **do not** add Prisma models, migrations, handlers, or pages for S2.

---

## S2 code slice (when approved — not now)

Frozen roadmap [12](../12-roadmap-migration-risks.md) **S2 = Downloads + Student Card**. This pack **keeps that**.

S2 may also ship a **premium Hub shell** (hero, empty-state dashboard, timeline grouping/search **on Engine tables only**) so later phases fill cards instead of inventing a second layout.

S2 must **not** ship wallet ledgers, loyalty posting, booklet/book orders, in-app message threads, or an executing AI.
