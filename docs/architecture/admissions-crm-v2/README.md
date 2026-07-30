# StarOS Admissions CRM v2 — Architecture Index

**Status:** Repository architecture canon  
**Scope:** Documentation only — do not implement features from chat prompts alone  
**Provenance:** Recreated in-repo because the original approved document pack was not checked into this repository. Grounded in the current CRM ownership spine and the stated Sprint 1–2 scope.

## Reading order

Read these documents in order before any Admissions CRM v2 implementation:

1. [Product Blueprint](./00-product-blueprint.md) — product goals, personas, outcomes, non-goals
2. [Foundation Architecture](./01-foundation-architecture.md) — bounded contexts and ownership SSOT
3. [Technical Specifications](./02-technical-specifications.md) — multi-tenant, RBAC, compatibility, immutability
4. [Sprint 1 — Truth Spine](./03-sprint-1-truth-spine.md) — what exists in code today
5. [Sprint 2 — Attribution Engine](./04-sprint-2-attribution-engine.md) — implemented + Sprint 2.6 hardened
6. [Revenue Attribution Contract](./05-revenue-attribution-contract.md) — KPI-safe revenue keys and selection rules
7. [Sprint 3 — KPI Computation Engine](./06-sprint-3-kpi-engine.md) — registry, formulas, aggregation, cache, read-only API
8. [Sprint 3.5 — KPI Adoption](./07-sprint-3.5-kpi-adoption.md) — wire reports to FORMULA_REGISTRY / sources
9. [Sprint 4 — Operational Queues](./08-sprint-4-operational-queues.md) — assignment / follow-up / call / SLA / escalation / capacity
10. [Sprint 5 — Automation Engine](./09-sprint-5-automation-engine.md) — event-driven rules; separate bounded context
11. [Sprint 6 — Dashboard Platform](./10-sprint-6-dashboard-platform.md) — presentation-only widget composition
12. [Sprint 6.6 — Production Hardening](./11-sprint-6.6-production-hardening.md) — outbox reclaim, claims, cutover, loop guard

## Document map

| Document | Purpose |
|----------|---------|
| [00-product-blueprint.md](./00-product-blueprint.md) | Why Admissions CRM v2 exists and what success looks like |
| [01-foundation-architecture.md](./01-foundation-architecture.md) | System boundaries and how CRM relates to Registration / Payment |
| [02-technical-specifications.md](./02-technical-specifications.md) | Non-negotiable technical rules for implementers |
| [03-sprint-1-truth-spine.md](./03-sprint-1-truth-spine.md) | Canonical lead ownership as shipped (Sprint 1) |
| [04-sprint-2-attribution-engine.md](./04-sprint-2-attribution-engine.md) | Ownership history, revenue attribution, policies, snapshots |
| [05-revenue-attribution-contract.md](./05-revenue-attribution-contract.md) | Canonical revenue keys; anti double-count for KPI |
| [06-sprint-3-kpi-engine.md](./06-sprint-3-kpi-engine.md) | KPI computation layer (no UI) |
| [07-sprint-3.5-kpi-adoption.md](./07-sprint-3.5-kpi-adoption.md) | Adopt KPI engine in existing reports |
| [08-sprint-4-operational-queues.md](./08-sprint-4-operational-queues.md) | Operational Queue Engine |
| [09-sprint-5-automation-engine.md](./09-sprint-5-automation-engine.md) | Automation Engine (events, rules, actions) |
| [10-sprint-6-dashboard-platform.md](./10-sprint-6-dashboard-platform.md) | Dashboard Platform (widgets, composition) |
| [11-sprint-6.6-production-hardening.md](./11-sprint-6.6-production-hardening.md) | Production hardening (Sprint 6.6) |

## Glossary (short)

| Term | Meaning |
|------|---------|
| **Lead Owner** | Sales advisor responsible for a lead (`Lead.ownerUserId`) |
| **Truth Spine** | Single source of truth for current ownership, plus durable trails |
| **Ownership history** | Append-only record of owner changes over time (Sprint 2) |
| **Revenue attribution** | Linking paid/approved revenue to owners/policies (Sprint 2) |
| **Attribution snapshot** | Immutable freeze of attribution at a revenue event (Sprint 2) |
| **Attribution policy** | Rules that decide how credit is assigned (Sprint 2) |

## Implementation rules

- Treat this folder as the source of truth for Admissions CRM v2 design intent.
- Prefer extending [`lib/crm/lead-ownership.ts`](../../../lib/crm/lead-ownership.ts) over duplicating ownership write paths.
- Preserve backward compatibility: existing `Lead.ownerUserId` remains the live owner field unless a later sprint explicitly migrates it.
- No UI redesign unless a later sprint doc says otherwise.
- KPI / reports must follow [05-revenue-attribution-contract.md](./05-revenue-attribution-contract.md).

## Related code (read-only references)

- Ownership service: `lib/crm/lead-ownership.ts`
- Ownership history: `lib/crm/ownership-history.ts`
- Attribution: `lib/crm/attribution-snapshot.ts`, `attribution-policy.ts`, `attribution-revenue-contract.ts`
- Lead helpers: `lib/crm/leads.ts`
- CRM activity: `lib/crm/activity.ts`
- Assignment index migration: `prisma/migrations/20260717162000_crm_lead_assignment_sprint_1/`
- Attribution hardening migration: `prisma/migrations/20260731003000_admissions_crm_v2_production_hardening/`
- KPI engine: `lib/kpi/*` (`runKpiFormula` for report adoption)
- KPI cache migration: `prisma/migrations/20260731010000_kpi_computation_cache/`
- Automation engine: `lib/automation/*`
- Automation migration: `prisma/migrations/20260731030000_automation_engine_sprint_5/`
- Dashboard platform: `lib/dashboard/*`
- Dashboard cache migration: `prisma/migrations/20260731040000_dashboard_widget_cache/`
