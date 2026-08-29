-- Sprint 5 — Automation Engine (additive)

-- DomainEventType catalog extensions
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'LEAD_CREATED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'LEAD_ASSIGNED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'LEAD_REASSIGNED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'FOLLOWUP_DUE';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'CALL_LOGGED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'REGISTRATION_CREATED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_SUCCESS';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'SLA_BREACHED';
ALTER TYPE "DomainEventType" ADD VALUE IF NOT EXISTS 'QUEUE_ITEM_ESCALATED';

-- AutomationRule additive columns
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "stopOnMatch" BOOLEAN NOT NULL DEFAULT false;

-- DomainEventOutbox dedupe
ALTER TABLE "domain_event_outbox" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "domain_event_outbox_organizationId_dedupeKey_key"
  ON "domain_event_outbox" ("organizationId", "dedupeKey");

-- AutomationActionLog
CREATE TABLE IF NOT EXISTS "automation_action_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationExecutionId" TEXT NOT NULL,
    "actionIndex" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL,
    "inputSummary" JSONB,
    "outputSummary" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "automation_action_logs_organizationId_automationExecutionId_idx"
  ON "automation_action_logs"("organizationId", "automationExecutionId");
CREATE INDEX IF NOT EXISTS "automation_action_logs_organizationId_createdAt_idx"
  ON "automation_action_logs"("organizationId", "createdAt");

ALTER TABLE "automation_action_logs"
  DROP CONSTRAINT IF EXISTS "automation_action_logs_organizationId_fkey";
ALTER TABLE "automation_action_logs"
  ADD CONSTRAINT "automation_action_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "automation_action_logs"
  DROP CONSTRAINT IF EXISTS "automation_action_logs_automationExecutionId_fkey";
ALTER TABLE "automation_action_logs"
  ADD CONSTRAINT "automation_action_logs_automationExecutionId_fkey"
  FOREIGN KEY ("automationExecutionId") REFERENCES "automation_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StaffNotification
CREATE TABLE IF NOT EXISTS "staff_notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "automationExecutionId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "staff_notifications_organizationId_userId_readAt_idx"
  ON "staff_notifications"("organizationId", "userId", "readAt");
CREATE INDEX IF NOT EXISTS "staff_notifications_organizationId_createdAt_idx"
  ON "staff_notifications"("organizationId", "createdAt");

ALTER TABLE "staff_notifications"
  DROP CONSTRAINT IF EXISTS "staff_notifications_organizationId_fkey";
ALTER TABLE "staff_notifications"
  ADD CONSTRAINT "staff_notifications_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_notifications"
  DROP CONSTRAINT IF EXISTS "staff_notifications_userId_fkey";
ALTER TABLE "staff_notifications"
  ADD CONSTRAINT "staff_notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
