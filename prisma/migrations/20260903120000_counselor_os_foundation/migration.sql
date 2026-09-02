-- Counselor OS foundation — additive models for assignments, appointments, sessions, notes, follow-ups.

CREATE TYPE "CounselorAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CounselorAppointmentStatus" AS ENUM ('BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED_BY_STUDENT', 'CANCELLED_BY_COUNSELOR', 'NO_SHOW');
CREATE TYPE "CounselingSessionRecordStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "CounselingSessionType" AS ENUM ('IN_PERSON', 'PHONE', 'ONLINE');
CREATE TYPE "CounselorNoteVisibility" AS ENUM ('GENERAL', 'IMPORTANT', 'PRIVATE', 'FOLLOW_UP');
CREATE TYPE "CounselorFollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CounselorFollowUpPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TABLE "counselor_student_assignments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "branchId" TEXT,
    "status" "CounselorAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counselor_student_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "counselor_appointments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "guidancePlanId" TEXT,
    "bookingReservationId" TEXT NOT NULL,
    "status" "CounselorAppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counselor_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "counseling_session_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "guidancePlanId" TEXT,
    "bookingReservationId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "sessionType" "CounselingSessionType" NOT NULL DEFAULT 'IN_PERSON',
    "status" "CounselingSessionRecordStatus" NOT NULL DEFAULT 'SCHEDULED',
    "subject" TEXT,
    "body" TEXT,
    "keyPoints" TEXT,
    "decisions" TEXT,
    "studentActionItems" TEXT,
    "counselorActionItems" TEXT,
    "summary" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counseling_session_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "counselor_notes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "visibility" "CounselorNoteVisibility" NOT NULL DEFAULT 'GENERAL',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "counselor_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "counselor_follow_ups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "sessionRecordId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "CounselorFollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "CounselorFollowUpPriority" NOT NULL DEFAULT 'NORMAL',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counselor_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "counselor_student_assignments_organizationId_counselorUserId_studentId_key" ON "counselor_student_assignments"("organizationId", "counselorUserId", "studentId");
CREATE INDEX "counselor_student_assignments_organizationId_counselorUserId_status_idx" ON "counselor_student_assignments"("organizationId", "counselorUserId", "status");
CREATE INDEX "counselor_student_assignments_organizationId_studentId_status_idx" ON "counselor_student_assignments"("organizationId", "studentId", "status");

CREATE UNIQUE INDEX "counselor_appointments_bookingReservationId_key" ON "counselor_appointments"("bookingReservationId");
CREATE INDEX "counselor_appointments_organizationId_counselorUserId_status_idx" ON "counselor_appointments"("organizationId", "counselorUserId", "status");
CREATE INDEX "counselor_appointments_organizationId_studentId_status_idx" ON "counselor_appointments"("organizationId", "studentId", "status");
CREATE INDEX "counselor_appointments_organizationId_guidancePlanId_idx" ON "counselor_appointments"("organizationId", "guidancePlanId");

CREATE UNIQUE INDEX "counseling_session_records_bookingReservationId_key" ON "counseling_session_records"("bookingReservationId");
CREATE INDEX "counseling_session_records_organizationId_studentId_status_idx" ON "counseling_session_records"("organizationId", "studentId", "status");
CREATE INDEX "counseling_session_records_organizationId_counselorUserId_scheduledAt_idx" ON "counseling_session_records"("organizationId", "counselorUserId", "scheduledAt");
CREATE INDEX "counseling_session_records_organizationId_guidancePlanId_idx" ON "counseling_session_records"("organizationId", "guidancePlanId");

CREATE INDEX "counselor_notes_organizationId_studentId_deletedAt_idx" ON "counselor_notes"("organizationId", "studentId", "deletedAt");
CREATE INDEX "counselor_notes_organizationId_counselorUserId_createdAt_idx" ON "counselor_notes"("organizationId", "counselorUserId", "createdAt");

CREATE INDEX "counselor_follow_ups_organizationId_counselorUserId_status_dueAt_idx" ON "counselor_follow_ups"("organizationId", "counselorUserId", "status", "dueAt");
CREATE INDEX "counselor_follow_ups_organizationId_studentId_status_idx" ON "counselor_follow_ups"("organizationId", "studentId", "status");

ALTER TABLE "counselor_student_assignments" ADD CONSTRAINT "counselor_student_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_student_assignments" ADD CONSTRAINT "counselor_student_assignments_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_student_assignments" ADD CONSTRAINT "counselor_student_assignments_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_student_assignments" ADD CONSTRAINT "counselor_student_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "counselor_appointments" ADD CONSTRAINT "counselor_appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_appointments" ADD CONSTRAINT "counselor_appointments_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_appointments" ADD CONSTRAINT "counselor_appointments_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_appointments" ADD CONSTRAINT "counselor_appointments_organizationId_guidancePlanId_fkey" FOREIGN KEY ("organizationId", "guidancePlanId") REFERENCES "guidance_plans"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "counselor_appointments" ADD CONSTRAINT "counselor_appointments_organizationId_bookingReservationId_fkey" FOREIGN KEY ("organizationId", "bookingReservationId") REFERENCES "booking_reservations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counseling_session_records" ADD CONSTRAINT "counseling_session_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counseling_session_records" ADD CONSTRAINT "counseling_session_records_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counseling_session_records" ADD CONSTRAINT "counseling_session_records_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counseling_session_records" ADD CONSTRAINT "counseling_session_records_organizationId_guidancePlanId_fkey" FOREIGN KEY ("organizationId", "guidancePlanId") REFERENCES "guidance_plans"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "counseling_session_records" ADD CONSTRAINT "counseling_session_records_organizationId_bookingReservationId_fkey" FOREIGN KEY ("organizationId", "bookingReservationId") REFERENCES "booking_reservations"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counselor_follow_ups" ADD CONSTRAINT "counselor_follow_ups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_follow_ups" ADD CONSTRAINT "counselor_follow_ups_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_follow_ups" ADD CONSTRAINT "counselor_follow_ups_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_follow_ups" ADD CONSTRAINT "counselor_follow_ups_sessionRecordId_fkey" FOREIGN KEY ("sessionRecordId") REFERENCES "counseling_session_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
