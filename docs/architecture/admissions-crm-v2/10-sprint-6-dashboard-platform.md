# Admissions CRM v2 — Sprint 6: Dashboard Platform

**Status:** Implemented (platform + API; pages as consumers; no UI redesign)  
**Depends on:** Truth Spine, KPI Engine, Operational Queues, Automation Engine

## Purpose

Presentation-only composition layer. Dashboards declare widgets; loaders call domain engines. No KPI/queue/attribution/automation logic in pages.

## Rules

- Dashboard NEVER calculates KPIs, queues, attribution, or mutates state.
- Loaders under `lib/dashboard/loaders` must not import `@/lib/prisma`.
- Prefer cached `computeKpis` for KPI widgets.
- Widget cache: TTL-only (`DashboardWidgetCache`).

## Code map

| Area | Path |
|------|------|
| Platform | `lib/dashboard/*` |
| Automation reads | `lib/automation/reads.ts` |
| Truth facades | `lib/crm/manager-dashboard-reads.ts`, `lib/crm/workspace-reads.ts` |
| API | `GET /admin/dashboard`, `/widgets`, `/widget/:id` |
| Schema | `DashboardWidgetCache` |

## Dashboards

`manager` · `advisor` · `executive` · `admissions` · `marketing`
