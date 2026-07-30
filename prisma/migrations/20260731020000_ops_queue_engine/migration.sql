-- Sprint 4 — Operational Queue Engine (additive).

CREATE TYPE "OpsDispatchStrategy" AS ENUM (
  'MANUAL',
  'ROUND_ROBIN',
  'LEAST_LOAD',
  'WEIGHTED',
  'SKILL_BASED',
  'AI'
);

CREATE TYPE "OpsEscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TYPE "OpsQueueId" AS ENUM (
  'ASSIGNMENT',
  'FOLLOW_UP',
  'CALL',
  'SLA',
  'ESCALATION'
);

CREATE TYPE "OpsEntityType" AS ENUM ('LEAD', 'CRM_TASK', 'REGISTRATION');

CREATE TABLE "ops_sla_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstContactHours" INTEGER NOT NULL DEFAULT 24,
    "followUpGraceHours" INTEGER NOT NULL DEFAULT 0,
    "registrationNeedsCallHours" INTEGER NOT NULL DEFAULT 48,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_sla_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ops_capacity_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dispatchStrategy" "OpsDispatchStrategy" NOT NULL DEFAULT 'MANUAL',
    "softLimitOwnedLeads" INTEGER,
    "hardLimitOwnedLeads" INTEGER,
    "roundRobinCursorUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_capacity_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ops_escalations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "OpsEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "leadId" TEXT,
    "queueId" "OpsQueueId" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "OpsEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ops_escalations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ops_queue_claims" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queueId" "OpsQueueId" NOT NULL,
    "entityType" "OpsEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "claimedByUserId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_queue_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_sla_policies_organizationId_key" ON "ops_sla_policies"("organizationId");
CREATE UNIQUE INDEX "ops_capacity_policies_organizationId_key" ON "ops_capacity_policies"("organizationId");
CREATE INDEX "ops_escalations_organizationId_status_openedAt_idx" ON "ops_escalations"("organizationId", "status", "openedAt");
CREATE INDEX "ops_escalations_organizationId_leadId_status_idx" ON "ops_escalations"("organizationId", "leadId", "status");
CREATE INDEX "ops_escalations_organizationId_entityType_entityId_idx" ON "ops_escalations"("organizationId", "entityType", "entityId");
CREATE UNIQUE INDEX "ops_queue_claims_organizationId_queueId_entityType_entityId_key"
  ON "ops_queue_claims"("organizationId", "queueId", "entityType", "entityId");
CREATE INDEX "ops_queue_claims_organizationId_expiresAt_idx" ON "ops_queue_claims"("organizationId", "expiresAt");
CREATE INDEX "ops_queue_claims_organizationId_claimedByUserId_releasedAt_idx"
  ON "ops_queue_claims"("organizationId", "claimedByUserId", "releasedAt");

ALTER TABLE "ops_sla_policies"
  ADD CONSTRAINT "ops_sla_policies_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops_capacity_policies"
  ADD CONSTRAINT "ops_capacity_policies_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops_escalations"
  ADD CONSTRAINT "ops_escalations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ops_queue_claims"
  ADD CONSTRAINT "ops_queue_claims_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default policies for existing orgs.
INSERT INTO "ops_sla_policies" ("id", "organizationId", "firstContactHours", "followUpGraceHours", "registrationNeedsCallHours", "isActive", "createdAt", "updatedAt")
SELECT 'osla_' || o."id", o."id", 24, 0, 48, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE o."deletedAt" IS NULL;

INSERT INTO "ops_capacity_policies" ("id", "organizationId", "dispatchStrategy", "isActive", "createdAt", "updatedAt")
SELECT 'ocap_' || o."id", o."id", 'MANUAL'::"OpsDispatchStrategy", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
WHERE o."deletedAt" IS NULL;
