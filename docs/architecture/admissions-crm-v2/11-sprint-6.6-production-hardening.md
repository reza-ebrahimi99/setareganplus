# Admissions CRM v2 — Sprint 6.6: Production Hardening

**Status:** Implemented (required audit fixes only)  
**Depends on:** Sprints 1–6

## Fixes

1. **Outbox reclaim** — stale `PROCESSING` (lease via `availableAt`) → `PENDING`
2. **Claim engine** — CAS reclaim, TTL clamp (30s–15m), entity/branch/owner authz
3. **Automation pipeline** — action failures retry / DEAD_LETTER; never silent `PROCESSED`
4. **Clock cutover Phase C** — default emit-only; no-contact unified to `FOLLOWUP_DUE`
5. **Loop guard** — echo detect + rate limit (3/10m) + circuit breaker (8/30m)
6. **Escalation uniqueness** — partial unique index one OPEN per entity

## Key modules

| Concern | Module |
|---------|--------|
| Reclaim / fail / DLQ | `lib/automation/pipeline.ts` |
| Loop / circuit | `lib/automation/loop-guard.ts` |
| Cutover flag | `lib/automation/cutover.ts` |
| Claims | `lib/ops/claims.ts`, `lib/ops/claim-authz.ts` |
| Escalations | `lib/ops/escalation.ts` |

## Migration

`prisma/migrations/20260731050000_production_hardening_6_6/`

## Tests

`npm run test:hardening` — cutover default, TTL clamp, loop echo, lease constants  
`npm run test:automation` — cutover Phase C default ON
