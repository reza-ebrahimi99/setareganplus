-- StarOS v0.8: staff portal, membership-bound sessions, RBAC and CRM calls.

ALTER TYPE "SystemRole" ADD VALUE 'ADMISSIONS_MANAGER';
ALTER TYPE "SystemRole" ADD VALUE 'ADMISSIONS_AGENT';
ALTER TYPE "SystemRole" ADD VALUE 'CALL_OPERATOR';
ALTER TYPE "SystemRole" ADD VALUE 'REPORT_VIEWER';

ALTER TYPE "AuditAction" ADD VALUE 'STAFF_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_BRANCH_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_LEAD_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_TASK_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_BRANCH_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_CALL_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_TASK_COMPLETED';

ALTER TYPE "OtpPurpose" ADD VALUE 'STAFF_LOGIN';
ALTER TYPE "CrmActivityType" ADD VALUE 'CALL_LOGGED';

-- Enforce one active challenge per tenant/mobile/purpose at the database layer.
WITH ranked_pending AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "organizationId", "normalizedMobile", "purpose"
           ORDER BY "createdAt" DESC
         ) AS row_number
  FROM "otp_challenges"
  WHERE "status" = 'PENDING'
)
UPDATE "otp_challenges"
SET "status" = 'EXPIRED'
WHERE "id" IN (
  SELECT "id" FROM ranked_pending WHERE row_number > 1
);

CREATE UNIQUE INDEX "otp_challenges_one_pending_per_mobile_purpose_key"
  ON "otp_challenges"("organizationId", "normalizedMobile", "purpose")
  WHERE "status" = 'PENDING';

CREATE TYPE "CrmCallOutcome" AS ENUM (
  'ANSWERED',
  'NO_ANSWER',
  'BUSY',
  'OFF',
  'WRONG_NUMBER',
  'FOLLOW_UP_REQUIRED',
  'CONSULTATION_BOOKED',
  'NOT_INTERESTED',
  'REGISTERED',
  'OTHER'
);

ALTER TABLE "admin_sessions"
  ADD COLUMN "organizationMembershipId" TEXT;

CREATE INDEX "admin_sessions_organizationMembershipId_expiresAt_idx"
  ON "admin_sessions"("organizationMembershipId", "expiresAt");

ALTER TABLE "admin_sessions"
  ADD CONSTRAINT "admin_sessions_organizationMembershipId_fkey"
  FOREIGN KEY ("organizationMembershipId")
  REFERENCES "organization_memberships"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "crm_call_logs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "outcome" "CrmCallOutcome" NOT NULL,
  "note" TEXT,
  "durationSeconds" INTEGER,
  "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextFollowUpAt" TIMESTAMP(3),
  "createdTaskId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_call_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_call_logs_organizationId_idempotencyKey_key"
  ON "crm_call_logs"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "crm_call_logs_organizationId_id_key"
  ON "crm_call_logs"("organizationId", "id");
CREATE INDEX "crm_call_logs_organizationId_membershipId_calledAt_idx"
  ON "crm_call_logs"("organizationId", "membershipId", "calledAt");
CREATE INDEX "crm_call_logs_organizationId_leadId_calledAt_idx"
  ON "crm_call_logs"("organizationId", "leadId", "calledAt");
CREATE INDEX "crm_call_logs_organizationId_outcome_calledAt_idx"
  ON "crm_call_logs"("organizationId", "outcome", "calledAt");

ALTER TABLE "crm_call_logs"
  ADD CONSTRAINT "crm_call_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_call_logs"
  ADD CONSTRAINT "crm_call_logs_organizationId_leadId_fkey"
  FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_call_logs"
  ADD CONSTRAINT "crm_call_logs_organizationId_membershipId_fkey"
  FOREIGN KEY ("organizationId", "membershipId") REFERENCES "organization_memberships"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_call_logs"
  ADD CONSTRAINT "crm_call_logs_organizationId_createdTaskId_fkey"
  FOREIGN KEY ("organizationId", "createdTaskId") REFERENCES "crm_tasks"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
