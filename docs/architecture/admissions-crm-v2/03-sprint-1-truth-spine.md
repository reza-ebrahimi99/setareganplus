# Admissions CRM v2 — Sprint 1: Truth Spine

**Status:** Repository architecture canon (recreated in-repo)  
**Implementation status:** Reflected in current production code paths  
**Depends on:** [Technical Specifications](./02-technical-specifications.md)

[Index](./README.md) · Previous: [Technical Specifications](./02-technical-specifications.md) · Next: [Sprint 2 — Attribution Engine (spec)](./04-sprint-2-attribution-engine.md)

---

## 1. Purpose

Document what Sprint 1 (Truth Spine) means **in this codebase today**: a single canonical current owner for each lead, written through one domain service, with an activity/audit trail.

## 2. What “Truth Spine” means here

| Layer | Reality today |
|-------|----------------|
| Current owner SSOT | `Lead.ownerUserId` |
| Domain service | `lib/crm/lead-ownership.ts` — `setLeadOwner`, `setLeadOwnersBulk`, `isEligibleLeadOwner` |
| Thin wrappers | `assignLeadOwner` in `lib/crm/leads.ts` |
| Human trail | `CrmActivity` type `OWNER_ASSIGNED` |
| Security trail | `AuditLog` with CRM assign events (when actor present) |
| List performance | Index `(organizationId, branchId, ownerUserId, updatedAt)` via migration `20260717162000_crm_lead_assignment_sprint_1` |

## 3. Ownership sources

`LeadOwnershipSource` (conceptual / typed in ownership service):

- `MANUAL`
- `BULK`
- `AUTOMATION`
- `IMPORT`
- `SYSTEM`

Callers (non-exhaustive):

- Admin lead actions — assign / bulk assign
- CRM automation `ASSIGN_OWNER`
- Import assignment strategies
- Form CRM settings (`assignToUserId`)
- Manual lead create / upsert intake

## 4. Invariants established by Sprint 1

1. One live owner field for UI and filters: `ownerUserId`.
2. Reassignment records previous and next owner in activity metadata.
3. Ineligible owners are rejected (membership + permission checks).
4. No-op when owner unchanged (idempotent assign).
5. Tenant and branch eligibility respected for bulk assign.

## 5. Gaps vs a full Truth Spine (deferred to Sprint 2)

| Gap | Why it matters |
|-----|----------------|
| No first-class ownership **period** table | Hard to query “owner at time T” for revenue |
| Activity trail is not an attribution ledger | Cannot freeze credit at payment safely |
| No attribution **policy** configuration | Credit rules are not explicit |
| No immutable **snapshots** | Callback retries / later reassignment can confuse reports |
| Registration / Payment not joined for credit | Revenue attribution not modeled |

These gaps are specified in [04 — Attribution Engine](./04-sprint-2-attribution-engine.md) and are **not implemented** as of this document.

## 6. Backward compatibility commitment

Sprint 2 and later must:

- Keep `Lead.ownerUserId` as the live owner for existing screens.
- Keep `setLeadOwner` as the write gateway (extend it to append history).
- Avoid breaking lead list/board filter query params.

## 7. Document links

- [README (index)](./README.md)
- Previous: [02 — Technical Specifications](./02-technical-specifications.md)
- Next: [04 — Sprint 2 Attribution Engine](./04-sprint-2-attribution-engine.md)
- Also: [00 — Product Blueprint](./00-product-blueprint.md) · [01 — Foundation Architecture](./01-foundation-architecture.md)
