# Admissions CRM v2 — Sprint 5: Automation Engine

**Status:** Implemented (engine + emitters; no UI redesign)  
**Depends on:** Truth Spine, Attribution (read-only), KPI (read-only), Operational Queues

## Purpose

First-class Automation bounded context that reacts to business events via `DomainEventOutbox` without embedding rule logic inside CRM, Queue, KPI, or UI.

## Rules

- Producers **enqueue only**; Automation evaluates rules and writes through gateways.
- Ownership writes: **only** `setLeadOwner` / `assignLeadOwner` (source `AUTOMATION`).
- KPI: read-only — never compute or route from KPI values.
- Attribution snapshots: never route operational work.
- Reuse existing workers (`crm:automation-worker-once`, `crm:scheduled-worker-once`).
- No UI redesign in this sprint.

## Event catalog (additive `DomainEventType`)

| Event | Aggregate |
|-------|-----------|
| `LEAD_CREATED` | Lead |
| `LEAD_ASSIGNED` / `LEAD_REASSIGNED` | Lead |
| `FOLLOWUP_DUE` | Lead |
| `CALL_LOGGED` | CrmCallLog |
| `REGISTRATION_CREATED` | Registration |
| `PAYMENT_SUCCESS` / `PAYMENT_FAILED` | PaymentIntent |
| `SLA_BREACHED` | Lead / CrmTask / Registration |
| `QUEUE_ITEM_ESCALATED` | OpsEscalation |
| Existing `FORM_*` / `BOOKING_*` | unchanged |

Trigger aliases: rules on `LEAD_CREATED` also match `FORM_LEAD_CREATED`.

## Code map

| Area | Path |
|------|------|
| Engine | `lib/automation/*` |
| Compat shims | `lib/crm/automation-processor.ts`, `lib/crm/automation-contract.ts` |
| Schema | `AutomationActionLog`, `StaffNotification`, rule columns, outbox `dedupeKey` |
| Worker | `scripts/crm-automation-worker-once.ts` → `lib/automation/worker.ts` |

## Clock cutover (Sprint 6.6 Phase C)

- **Default ON:** scheduled/ops emit clock events only (no direct follow-up tasks / SLA escalations).
- Dual-run rollback: `STAROS_AUTOMATION_CLOCK_CUTOVER=0`.
- No-contact and follow-up both emit `FOLLOWUP_DUE` (unified).
