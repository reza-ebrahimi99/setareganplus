# Admissions CRM v2 — Technical Specifications

**Status:** Repository architecture canon (recreated in-repo)  
**Depends on:** [Foundation Architecture](./01-foundation-architecture.md)

[Index](./README.md) · Previous: [Foundation Architecture](./01-foundation-architecture.md) · Next: [Sprint 1 — Truth Spine](./03-sprint-1-truth-spine.md)

---

## 1. Purpose

Non-negotiable technical rules for Admissions CRM v2 implementers. Violating these breaks tenant safety, reporting integrity, or backward compatibility.

## 2. Multi-tenant rules

- Every CRM and attribution row is scoped by `organizationId`.
- Compound FKs that include `organizationId` (where used) must keep child tenant equal to parent tenant.
- Queries for ownership history and snapshots **must** filter by `organizationId` first.
- Cross-tenant owner assignment is forbidden; eligibility checks stay in the ownership service.

## 3. Time and currency

- **Storage:** UTC Gregorian `DateTime` for all ownership periods, snapshot timestamps, and payment times.
- **Display:** Persian / Jalali in admin UI only (existing helpers).
- **Money:** Rials as integers (existing registration / payment convention). No parallel money units in attribution.

## 4. RBAC

Reuse existing permissions where possible:

| Permission | Relevance |
|------------|-----------|
| `crm.view_all` / `crm.view_assigned` | Lead visibility and owner scope |
| `crm.assign` | Manual / bulk reassignment |
| Future attribution report views | Prefer extending reports permissions; do not invent ad-hoc gates without doc update |

Owner eligibility continues to require an active membership that can work assigned CRM (`crm.view_assigned` or stronger), matching `isEligibleLeadOwner` behavior.

## 5. API / contract compatibility

- **No breaking API changes** to existing lead list, board, assign, or payment callback contracts in Sprint 1–2.
- `Lead.ownerUserId` remains the field used by filters and UI.
- New Sprint 2 tables are additive.
- Server actions may gain optional fields later; do not remove or rename existing action payloads without a versioned migration of callers.

## 6. Immutability rules (Sprint 2 snapshots)

When Attribution Snapshots exist:

1. Insert-only after creation (no update of credit lines or amounts).
2. Corrections require a **new** compensating snapshot or documented reversal event — never silent overwrite.
3. Snapshot generation must be **idempotent** for the same revenue event (e.g. same `PaymentIntent` id) to survive callback retries.

## 7. Ownership write discipline

- All post-create ownership mutations: `lib/crm/lead-ownership.ts`.
- Automations, imports, and admin actions call that service (or thin wrappers that do).
- Direct `prisma.lead.update({ ownerUserId })` outside intake create paths is forbidden for feature work.

## 8. Observability

- Prefer structured activity / audit metadata (`previousOwnerUserId`, `ownerUserId`, `source`) already used by the ownership service.
- Sprint 2 history rows should store machine-readable `source` enums aligned with `LeadOwnershipSource`.

## 9. Testing expectations

- Existing CRM ownership and payment tests must keep passing.
- New attribution logic needs unit tests for policy selection and idempotent snapshot creation (when Sprint 2 is implemented).

## 10. Document links

- [README (index)](./README.md)
- Previous: [01 — Foundation Architecture](./01-foundation-architecture.md)
- Next: [03 — Sprint 1 Truth Spine](./03-sprint-1-truth-spine.md)
- Also: [00 — Product Blueprint](./00-product-blueprint.md)
- Sprint 2 (spec only): [04 — Attribution Engine](./04-sprint-2-attribution-engine.md)
