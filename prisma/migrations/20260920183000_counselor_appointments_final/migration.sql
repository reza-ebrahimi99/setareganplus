-- Additive: counselor appointment final phase (audit, alt proposals, notifications, session report fields)

ALTER TABLE "counselor_appointments"
ADD COLUMN IF NOT EXISTS "inconsistencyResolvedAt" TIMESTAMP(3);

ALTER TABLE "counseling_session_records"
ADD COLUMN IF NOT EXISTS "counselorInternalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "layoutChangeNotes" TEXT,
ADD COLUMN IF NOT EXISTS "sessionOutcome" TEXT,
ADD COLUMN IF NOT EXISTS "reportLockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reportUnlockedReason" TEXT,
ADD COLUMN IF NOT EXISTS "updatedByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "counselor_appointment_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "counselor_appointment_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "counselor_appointment_alt_proposals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "proposedSlotId" TEXT NOT NULL,
    "holdReservationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_STUDENT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counselor_appointment_alt_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "student_portal_notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_portal_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "counselor_appointment_alt_proposals_holdReservationId_key"
ON "counselor_appointment_alt_proposals"("holdReservationId");

CREATE INDEX IF NOT EXISTS "counselor_appointment_audit_logs_org_appt_idx"
ON "counselor_appointment_audit_logs"("organizationId", "appointmentId", "createdAt");

CREATE INDEX IF NOT EXISTS "counselor_appointment_alt_proposals_org_appt_idx"
ON "counselor_appointment_alt_proposals"("organizationId", "appointmentId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "student_portal_notifications_dedupe_idx"
ON "student_portal_notifications"("organizationId", "studentId", "dedupeKey");

CREATE INDEX IF NOT EXISTS "student_portal_notifications_student_read_idx"
ON "student_portal_notifications"("organizationId", "studentId", "readAt");

ALTER TABLE "counselor_appointment_audit_logs"
ADD CONSTRAINT "counselor_appointment_audit_logs_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counselor_appointment_audit_logs"
ADD CONSTRAINT "counselor_appointment_audit_logs_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "counselor_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counselor_appointment_audit_logs"
ADD CONSTRAINT "counselor_appointment_audit_logs_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counselor_appointment_alt_proposals"
ADD CONSTRAINT "counselor_appointment_alt_proposals_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counselor_appointment_alt_proposals"
ADD CONSTRAINT "counselor_appointment_alt_proposals_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "counselor_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_portal_notifications"
ADD CONSTRAINT "student_portal_notifications_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
