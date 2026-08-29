# Admissions CRM v2 — Revenue Attribution Contract

**Status:** Canon (Sprint 2.6 Production Hardening)  
**Depends on:** [Sprint 2 — Attribution Engine](./04-sprint-2-attribution-engine.md), [Technical Specifications](./02-technical-specifications.md)

[Index](./README.md)

---

## 1. Purpose

Define the **single canonical revenue-event contract** so KPI / reporting engines never double-count credit between payment and waived registration paths.

Implementation helper: `lib/crm/attribution-revenue-contract.ts`.

---

## 2. Revenue kinds

| Kind | `revenueKey` form | When emitted |
|------|-------------------|--------------|
| **PAYMENT_INTENT** | `PAYMENT_INTENT:{paymentIntentId}` | Payment Foundation verify → `PAID` |
| **REGISTRATION_WAIVED** | `REGISTRATION_WAIVED:{registrationId}` | Terminal free registration only (`FREE` payment mode) |

Idempotency: unique `(organizationId, revenueKey)`.

---

## 3. Emission rules

1. **Paid checkout** → emit **only** `PAYMENT_INTENT`.
2. **`FREE` registration** (no checkout) → emit **only** `REGISTRATION_WAIVED`.
3. **`OPTIONAL` / optional-skip** → emit **nothing** at skip time. If the parent later pays, emit `PAYMENT_INTENT` only.
4. Never emit both kinds for the same successful money event.
5. Missing `leadId` must **not** skip the event: create `PENDING_ATTRIBUTION`, then complete once when lead appears.

---

## 4. KPI selection rule (mandatory)

For each `registrationId`, count **at most one** ATTRIBUTED snapshot:

1. Prefer `PAYMENT_INTENT` if present and `status = ATTRIBUTED`.
2. Else use `REGISTRATION_WAIVED` if present and `status = ATTRIBUTED`.
3. Ignore `PENDING_ATTRIBUTION` rows in KPI totals until recovered.

Use `selectCanonicalSnapshotsForKpi()` — do not `SUM(amountRials)` over raw snapshot tables without this filter.

Snapshots without `registrationId` (should be rare) are counted individually when ATTRIBUTED.

---

## 5. Snapshot status

| Status | Meaning | Mutable? |
|--------|---------|----------|
| `PENDING_ATTRIBUTION` | Revenue recorded; lead not yet linked | May complete **once** → `ATTRIBUTED` |
| `ATTRIBUTED` | Credit frozen (policy, version, attributed user, amount) | **Immutable** |

Corrections after ATTRIBUTED require a new compensating event (future), never silent overwrite.

---

## 6. Correlation

Structured logs use `correlationId`:

- Payment: `payintent:{paymentIntentId}`
- Registration waived: `registration:{registrationId}:{revenueKey}`

Events: `PolicyResolved`, `SnapshotCreated`, `SnapshotAlreadyExists`, `SnapshotPendingAttribution`, `SnapshotPendingRecovered`.

---

## 7. Document links

- [README](./README.md)
- [04 — Attribution Engine](./04-sprint-2-attribution-engine.md)
- [02 — Technical Specifications](./02-technical-specifications.md)
