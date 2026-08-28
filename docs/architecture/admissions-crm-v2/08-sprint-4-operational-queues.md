# Admissions CRM v2 — Sprint 4: Operational Queue Engine

**Status:** Implemented (engine + API; no UI redesign)  
**Depends on:** Truth Spine, Foundation Architecture

## Purpose

Unify operational work lists: Assignment, Follow-up, Call, SLA, Escalation, plus Capacity dispatch.

## Rules

- Ownership writes: **only** `lib/crm/lead-ownership.ts`
- KPI: read-only analytics — never queue membership
- Attribution: never routes work
- Shared DTO: `OperationalQueueItem`
- Claims: `OpsQueueClaim` with TTL
- Dispatch: `MANUAL` | `ROUND_ROBIN` | `LEAST_LOAD` (+ reserved enum values)
- Workers: extend `processScheduledCrmBatch`

## Code map

| Area | Path |
|------|------|
| Types / catalog / priority | `lib/ops/*` |
| Queues | `lib/ops/queues/*` |
| Capacity / SLA / claims / escalate | `lib/ops/{capacity,sla-policy,claims,escalation}.ts` |
| API | `GET/POST /admin/ops/queues` |
| Schema | `OpsSlaPolicy`, `OpsCapacityPolicy`, `OpsEscalation`, `OpsQueueClaim` |
