# Admissions CRM v2 — Sprint 2: Attribution Engine (TSD)

**Status:** Implemented (Sprint 2) + hardened (Sprint 2.6)  
**Depends on:** [Sprint 1 — Truth Spine](./03-sprint-1-truth-spine.md), [Technical Specifications](./02-technical-specifications.md)

[Index](./README.md) · Previous: [Sprint 1 — Truth Spine](./03-sprint-1-truth-spine.md) · Next: [Revenue Attribution Contract](./05-revenue-attribution-contract.md)

---

## 1. Purpose

Attribution Engine on top of the Truth Spine:

1. Ownership history  
2. Revenue attribution  
3. Attribution policies  
4. Immutable attribution snapshots (ATTRIBUTED)  
5. Backward compatibility  
6. No UI redesign  

## 2. Goals

| # | Goal | Outcome |
|---|------|---------|
| 1 | Ownership history | Append-only periods; ≤1 open period per lead (DB) |
| 2 | Revenue attribution | Credit linked to paid / free revenue events |
| 3 | Attribution policies | Explicit, versionable rules |
| 4 | Immutable snapshots | Frozen credit at event time |
| 5 | Backward compatibility | `ownerUserId` + existing APIs |
| 6 | No UI redesign | Data layer first |

## 3. Production hardening (Sprint 2.6)

- Partial unique index: one open `LeadOwnershipHistory` per lead  
- Pending attribution when `leadId` missing (never silent skip)  
- Canonical revenue contract: [05 — Revenue Attribution Contract](./05-revenue-attribution-contract.md)  
- Atomic lead create + open ownership period  
- Attribution unit tests + structured observability  

## 4. Implementation map

| Concern | Location |
|---------|----------|
| Ownership write | `lib/crm/lead-ownership.ts` |
| History periods | `lib/crm/ownership-history.ts` |
| Policy | `lib/crm/attribution-policy.ts` |
| Snapshots | `lib/crm/attribution-snapshot.ts` |
| Revenue contract | `lib/crm/attribution-revenue-contract.ts` |
| Observability | `lib/crm/attribution-observability.ts` |
| Payment hook | `lib/payment/service.ts` |
| FREE waived hook | `lib/registration/service.ts` |

## 5. Document links

- [README (index)](./README.md)
- [05 — Revenue Attribution Contract](./05-revenue-attribution-contract.md)
- [02 — Technical Specifications](./02-technical-specifications.md)
