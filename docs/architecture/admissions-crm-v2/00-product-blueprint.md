# Admissions CRM v2 — Product Blueprint

**Status:** Repository architecture canon (recreated in-repo)  
**Sprint applicability:** Product framing for Sprint 1 (Truth Spine) and Sprint 2 (Attribution Engine)

[Index](./README.md) · Next: [Foundation Architecture](./01-foundation-architecture.md)

---

## 1. Purpose

Admissions CRM v2 makes **who owns a lead** and **who earns credit for converted revenue** auditable, fair, and durable across the school’s admissions lifecycle — without replacing the Registration Engine or Payment Foundation.

## 2. Product goals

1. Establish a single, trusted **current owner** for every lead (Truth Spine).
2. Preserve a complete **ownership history** when owners change.
3. Attribute **registration / payment revenue** to the correct people using explicit policies.
4. Freeze attribution decisions as **immutable snapshots** at revenue events.
5. Keep existing admin CRM workflows usable (**no UI redesign** in Sprint 1–2).

## 3. Personas

| Persona | Needs |
|---------|--------|
| Admissions / CRM manager | See who owns leads; reassign fairly; trust reports |
| Advisor / agent | Clear ownership of “my” leads; credit for closed revenue |
| Organization admin | Tenant-safe policies; auditability; no double-counting |
| Implementer | Stable contracts; backward-compatible APIs |

## 4. Outcomes

- Managers can answer: “Who owns this lead right now?”
- Finance / ops can answer: “Who gets credit for this paid registration?”
- Reassignment does not erase prior ownership periods.
- Attribution at payment/approval time is reproducible and immutable after snapshot.

## 5. Non-goals (Sprint 1–2)

- Full CRM UI redesign or new board layouts
- A second payment or registration stack
- Replacing Form Builder
- Multi-currency / complex commission payroll (beyond attribution snapshots)
- Public parent/student portal changes

## 6. Relation to other StarOS domains

| Domain | Relationship |
|--------|--------------|
| **CRM Leads** | Primary entity; `Lead.ownerUserId` is current owner |
| **Registration Engine** | Conversion / enrollment events that may carry revenue |
| **Payment Foundation** | `PaymentIntent` success is a primary revenue signal |
| **Form Builder** | Intake source for leads; not an attribution engine |
| **Automations** | May assign owners; must use the ownership service |

## 7. Success criteria

- Ownership changes go through one domain service (no silent field writes).
- Sprint 2 can add history + snapshots without breaking existing list/board filters on `ownerUserId`.
- Reports can later join snapshots without replaying mutable lead state.

## 8. Document links

- [README (index)](./README.md)
- Next: [01 — Foundation Architecture](./01-foundation-architecture.md)
- Also: [02 — Technical Specifications](./02-technical-specifications.md)
- Sprint 1: [03 — Truth Spine](./03-sprint-1-truth-spine.md)
- Sprint 2 (spec only): [04 — Attribution Engine](./04-sprint-2-attribution-engine.md)
