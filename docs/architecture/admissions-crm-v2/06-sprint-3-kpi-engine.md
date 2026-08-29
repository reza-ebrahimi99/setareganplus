# Admissions CRM v2 — Sprint 3: KPI Computation Engine

**Status:** Implemented (computation layer only)  
**Depends on:** [Revenue Attribution Contract](./05-revenue-attribution-contract.md), [Sprint 2](./04-sprint-2-attribution-engine.md)

[Index](./README.md)

---

## 1. Purpose

Provide a **read-only computation layer** for admissions KPIs:

1. KPI Registry  
2. Formula Registry  
3. Time aggregation  
4. Dimension support  
5. Cached computation  
6. Read-only KPI API  

No dashboards, charts, or UI redesign in this sprint.

## 2. Allowed data sources

| Source | Use |
|--------|-----|
| `AttributionSnapshot` + `selectCanonicalSnapshotsForKpi` | Financial / conversion credit |
| `Lead` (`ownerUserId`, `createdAt`, `branchId`) | Truth Spine volume |
| `CrmActivity` | Assignment / conversion events |

**Forbidden for financial KPIs:** raw `PaymentIntent` / payment tables when attribution snapshots exist.

## 3. Code map

| Concern | Path |
|---------|------|
| Types / registry | `lib/kpi/types.ts`, `lib/kpi/registry.ts` |
| Sources | `lib/kpi/sources/*` |
| Formulas | `lib/kpi/formulas/*` |
| Aggregation | `lib/kpi/aggregation.ts` |
| Cache | `lib/kpi/cache.ts` + `KpiComputationCache` |
| Orchestrator | `lib/kpi/compute.ts` |
| API | `GET /admin/kpi`, `GET /admin/kpi/catalog` |

## 4. Cache

- Table: `kpi_computation_caches`  
- Key: SHA-256 of stable query JSON  
- Default TTL 300s (clamped 30–900)  
- TTL-only invalidation in Sprint 3  

## 5. Auth

- Permission: `reports.view`  
- Tenant: `session.organization.id`  
- Branch scope: membership branches when not all-branches  

## 6. Document links

- [README](./README.md)
- [05 — Revenue Attribution Contract](./05-revenue-attribution-contract.md)
