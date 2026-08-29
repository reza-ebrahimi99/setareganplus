# Admissions CRM v2 — Sprint 3.5: KPI Adoption

**Status:** Implemented  
**Depends on:** [Sprint 3 KPI Engine](./06-sprint-3-kpi-engine.md), [Revenue Attribution Contract](./05-revenue-attribution-contract.md)

## Pre-implementation map

| Consumer | Metrics | Adoption |
|----------|---------|----------|
| `lib/reports/staff-performance.ts` | assignedLeads, won, calls, … | `assignedLeads` → `count_leads_created`; activity SQL → KPI sources; won/conversion stay actor-based (≠ KPI owner formula) |
| `lib/crm/dashboard-insights.ts` | overview, advisors, imports | `newToday` / import-created via `count_leads_created`; owned via `count_leads_owned`; stage conversion stays local |
| Admin home `page.tsx` | 30d leads / conversion | `leads30` → `count_leads_created`; `won30` stays `Lead.convertedAt` (≠ CRM CONVERTED / attributed) |
| Registration status counts | funnel | Out of scope (not attribution KPIs) |
| Workspace / board / leads list | ops counts | Out of scope |

## Rules

- Reports call `runKpiFormula` / `FORMULA_REGISTRY` for overlapping metrics.
- Financial credit always via canonical snapshots inside KPI formulas (never PaymentIntent).
- Response shapes of existing report DTOs unchanged.
