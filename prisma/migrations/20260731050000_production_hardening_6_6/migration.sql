-- Sprint 6.6 — Production Hardening
-- At most one OPEN escalation per org + entity

CREATE UNIQUE INDEX IF NOT EXISTS "ops_escalations_one_open_per_entity"
  ON "ops_escalations" ("organizationId", "entityType", "entityId")
  WHERE "status" = 'OPEN';
