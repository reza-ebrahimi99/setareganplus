-- Sprint 2.6 — Production Hardening
-- 1) At most one open ownership period per lead
-- 2) Attribution snapshot pending status + nullable leadId

-- Collapse duplicate open periods (keep earliest; close extras).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "leadId"
      ORDER BY "effectiveFrom" ASC, "createdAt" ASC, id ASC
    ) AS rn
  FROM "lead_ownership_histories"
  WHERE "effectiveTo" IS NULL
)
UPDATE "lead_ownership_histories" AS h
SET "effectiveTo" = CURRENT_TIMESTAMP
FROM ranked AS r
WHERE h.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX "lead_ownership_histories_one_open_per_lead_idx"
  ON "lead_ownership_histories" ("organizationId", "leadId")
  WHERE "effectiveTo" IS NULL;

CREATE TYPE "AttributionSnapshotStatus" AS ENUM (
  'PENDING_ATTRIBUTION',
  'ATTRIBUTED'
);

ALTER TABLE "attribution_snapshots"
  ADD COLUMN "status" "AttributionSnapshotStatus" NOT NULL DEFAULT 'ATTRIBUTED';

ALTER TABLE "attribution_snapshots"
  ALTER COLUMN "leadId" DROP NOT NULL;

CREATE INDEX "attribution_snapshots_organizationId_status_createdAt_idx"
  ON "attribution_snapshots" ("organizationId", "status", "createdAt");
