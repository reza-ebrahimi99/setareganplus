-- StarOS v0.7: CRM Automation Engine
-- Extends Lead, adds pipeline/tasks/activities/automation execution.
-- LeadStatus preserved for compatibility; CrmPipelineStage is operational SoT when set.
--
-- Idempotent / re-runnable: production may have partially applied this migration
-- before failing on composite FKs to automation_rules (missing UNIQUE(organizationId, id)).
-- Unique on automation_rules(organizationId, id) MUST exist before those FKs.

-- ─── Audit enum values ───────────────────────────────────────────────────────
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'CRM_LEAD_CREATED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'CRM_LEAD_UPDATED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'CRM_STAGE_CHANGED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'CRM_TASK_CREATED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "AuditAction" ADD VALUE 'CRM_AUTOMATION_RAN'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── CRM enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "CrmStageType" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONSULTATION', 'ASSESSMENT', 'DECISION', 'WON', 'LOST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeadScoreBand" AS ENUM ('COLD', 'WARM', 'HOT', 'QUALIFIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeadSourceType" AS ENUM ('FORM', 'BOOKING', 'MANUAL', 'IMPORT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CrmTaskType" AS ENUM ('CALL', 'MESSAGE', 'CONSULTATION', 'FOLLOW_UP', 'DOCUMENT', 'ASSESSMENT', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CrmActivityType" AS ENUM ('LEAD_CREATED', 'STAGE_CHANGED', 'OWNER_ASSIGNED', 'TASK_CREATED', 'TASK_COMPLETED', 'FORM_SUBMITTED', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'SMS_QUEUED', 'NOTE_ADDED', 'SCORE_CHANGED', 'CONVERTED', 'LOST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'DEAD_LETTER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "crm_pipelines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "crm_pipelines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_pipeline_stages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "colorKey" TEXT,
    "position" INTEGER NOT NULL,
    "stageType" "CrmStageType" NOT NULL DEFAULT 'NEW',
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "crm_pipeline_stages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "normalizedMobile" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sourceType" "LeadSourceType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sourceFormSubmissionId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sourceBookingReservationId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pipelineId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "scoreBand" "LeadScoreBand" NOT NULL DEFAULT 'COLD';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "scoreBreakdown" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastContactAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS "crm_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "CrmTaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "priority" "CrmTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "automationRuleId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "activityType" "CrmActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "actorUserId" TEXT,
    "relatedTaskId" TEXT,
    "relatedFormSubmissionId" TEXT,
    "relatedBookingReservationId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "automation_executions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "domainEventId" TEXT NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "bookingServiceId" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "pipelineId" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN IF NOT EXISTS "conditions" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "booking_reservations" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- ─── Unique indexes required BEFORE composite FKs ──────────────────────────
-- CRITICAL: automation_rules(organizationId, id) must exist before crm_tasks /
-- automation_executions composite FKs reference it (was the P3018 / 42830 failure).
CREATE UNIQUE INDEX IF NOT EXISTS "automation_rules_organizationId_id_key" ON "automation_rules"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "leads_organizationId_id_key" ON "leads"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipelines_organizationId_code_key" ON "crm_pipelines"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipelines_organizationId_id_key" ON "crm_pipelines"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipeline_stages_organizationId_pipelineId_code_key" ON "crm_pipeline_stages"("organizationId", "pipelineId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipeline_stages_organizationId_pipelineId_position_key" ON "crm_pipeline_stages"("organizationId", "pipelineId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_pipeline_stages_organizationId_id_key" ON "crm_pipeline_stages"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_tasks_organizationId_idempotencyKey_key" ON "crm_tasks"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_tasks_organizationId_id_key" ON "crm_tasks"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_executions_organizationId_automationRuleId_domainEventId_key" ON "automation_executions"("organizationId", "automationRuleId", "domainEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_executions_organizationId_idempotencyKey_key" ON "automation_executions"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "automation_executions_organizationId_id_key" ON "automation_executions"("organizationId", "id");

-- ─── Non-unique indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "leads_organizationId_normalizedMobile_idx" ON "leads"("organizationId", "normalizedMobile");
CREATE INDEX IF NOT EXISTS "leads_organizationId_pipelineId_stageId_idx" ON "leads"("organizationId", "pipelineId", "stageId");
CREATE INDEX IF NOT EXISTS "leads_organizationId_ownerUserId_idx" ON "leads"("organizationId", "ownerUserId");
CREATE INDEX IF NOT EXISTS "leads_organizationId_scoreBand_idx" ON "leads"("organizationId", "scoreBand");
CREATE INDEX IF NOT EXISTS "leads_organizationId_nextFollowUpAt_idx" ON "leads"("organizationId", "nextFollowUpAt");
CREATE INDEX IF NOT EXISTS "leads_organizationId_sourceFormSubmissionId_idx" ON "leads"("organizationId", "sourceFormSubmissionId");
CREATE INDEX IF NOT EXISTS "leads_organizationId_sourceBookingReservationId_idx" ON "leads"("organizationId", "sourceBookingReservationId");
CREATE INDEX IF NOT EXISTS "crm_pipelines_organizationId_isDefault_isActive_idx" ON "crm_pipelines"("organizationId", "isDefault", "isActive");
CREATE INDEX IF NOT EXISTS "crm_pipelines_organizationId_deletedAt_idx" ON "crm_pipelines"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "crm_pipeline_stages_organizationId_pipelineId_position_idx" ON "crm_pipeline_stages"("organizationId", "pipelineId", "position");
CREATE INDEX IF NOT EXISTS "crm_pipeline_stages_organizationId_deletedAt_idx" ON "crm_pipeline_stages"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "crm_tasks_organizationId_leadId_status_idx" ON "crm_tasks"("organizationId", "leadId", "status");
CREATE INDEX IF NOT EXISTS "crm_tasks_organizationId_assignedToUserId_status_idx" ON "crm_tasks"("organizationId", "assignedToUserId", "status");
CREATE INDEX IF NOT EXISTS "crm_tasks_organizationId_dueAt_status_idx" ON "crm_tasks"("organizationId", "dueAt", "status");
CREATE INDEX IF NOT EXISTS "crm_tasks_organizationId_deletedAt_idx" ON "crm_tasks"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "crm_activities_organizationId_leadId_occurredAt_idx" ON "crm_activities"("organizationId", "leadId", "occurredAt");
CREATE INDEX IF NOT EXISTS "crm_activities_organizationId_activityType_occurredAt_idx" ON "crm_activities"("organizationId", "activityType", "occurredAt");
CREATE INDEX IF NOT EXISTS "crm_activities_organizationId_relatedTaskId_idx" ON "crm_activities"("organizationId", "relatedTaskId");
CREATE INDEX IF NOT EXISTS "automation_executions_organizationId_status_createdAt_idx" ON "automation_executions"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "automation_executions_organizationId_domainEventId_idx" ON "automation_executions"("organizationId", "domainEventId");
CREATE INDEX IF NOT EXISTS "automation_rules_organizationId_bookingServiceId_idx" ON "automation_rules"("organizationId", "bookingServiceId");
CREATE INDEX IF NOT EXISTS "booking_reservations_organizationId_leadId_idx" ON "booking_reservations"("organizationId", "leadId");

-- ─── Foreign keys (add only when missing) ──────────────────────────────────
DO $$ BEGIN ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_organizationId_pipelineId_fkey" FOREIGN KEY ("organizationId", "pipelineId") REFERENCES "crm_pipelines"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_pipelineId_fkey" FOREIGN KEY ("organizationId", "pipelineId") REFERENCES "crm_pipelines"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_stageId_fkey" FOREIGN KEY ("organizationId", "stageId") REFERENCES "crm_pipeline_stages"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organizationId_leadId_fkey" FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Requires automation_rules_organizationId_id_key (created above)
DO $$ BEGIN ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organizationId_automationRuleId_fkey" FOREIGN KEY ("organizationId", "automationRuleId") REFERENCES "automation_rules"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organizationId_leadId_fkey" FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organizationId_relatedTaskId_fkey" FOREIGN KEY ("organizationId", "relatedTaskId") REFERENCES "crm_tasks"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Requires automation_rules_organizationId_id_key (created above)
DO $$ BEGIN ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organizationId_automationRuleId_fkey" FOREIGN KEY ("organizationId", "automationRuleId") REFERENCES "automation_rules"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_bookingServiceId_fkey" FOREIGN KEY ("organizationId", "bookingServiceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_pipelineId_fkey" FOREIGN KEY ("organizationId", "pipelineId") REFERENCES "crm_pipelines"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_stageId_fkey" FOREIGN KEY ("organizationId", "stageId") REFERENCES "crm_pipeline_stages"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_organizationId_leadId_fkey" FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
