-- StarOS v0.5 — Smart Booking Engine
-- Standalone transactional booking domain (UTC instants; Jalali only at app boundaries).

-- AlterEnum DomainEventType
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_CREATED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_CONFIRMED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_RESCHEDULED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_WAITLISTED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_CHECKED_IN';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_COMPLETED';
ALTER TYPE "DomainEventType" ADD VALUE 'BOOKING_NO_SHOW';

-- AlterEnum AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_CHECKED_IN';
ALTER TYPE "AuditAction" ADD VALUE 'AI_ASSISTED_ACTION';

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'WAITING_LIST',
  'CANCELLED',
  'RESCHEDULED',
  'COMPLETED',
  'NO_SHOW'
);

CREATE TYPE "BookingSlotStatus" AS ENUM (
  'OPEN',
  'FULL',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "BookingMeetingType" AS ENUM (
  'IN_PERSON',
  'ONLINE',
  'PHONE'
);

CREATE TYPE "BookingCheckInMethod" AS ENUM (
  'QR',
  'MANUAL',
  'ADMIN'
);

CREATE TABLE "booking_services" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "formId" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
  "minimumLeadTimeMinutes" INTEGER NOT NULL DEFAULT 60,
  "maximumAdvanceDays" INTEGER NOT NULL DEFAULT 30,
  "meetingTypes" JSONB NOT NULL DEFAULT '["IN_PERSON"]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_advisors" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "userId" TEXT,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "colorKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "booking_advisors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_advisor_services" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "advisorId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "booking_advisor_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_availability_rules" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "advisorId" TEXT NOT NULL,
  "serviceId" TEXT,
  "weekday" INTEGER NOT NULL,
  "startLocalTime" TEXT NOT NULL,
  "endLocalTime" TEXT NOT NULL,
  "slotCapacity" INTEGER NOT NULL DEFAULT 1,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booking_availability_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_availability_exceptions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "advisorId" TEXT NOT NULL,
  "serviceId" TEXT,
  "localDate" DATE NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT true,
  "startLocalTime" TEXT,
  "endLocalTime" TEXT,
  "slotCapacity" INTEGER,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booking_availability_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_slots" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "advisorId" TEXT NOT NULL,
  "branchId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "bookedCount" INTEGER NOT NULL DEFAULT 0,
  "waitingCount" INTEGER NOT NULL DEFAULT 0,
  "status" "BookingSlotStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_reservations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "formSubmissionId" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "meetingType" "BookingMeetingType" NOT NULL DEFAULT 'IN_PERSON',
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "normalizedMobile" TEXT NOT NULL,
  "normalizedEmail" TEXT,
  "normalizedNationalId" TEXT,
  "trackingCode" TEXT NOT NULL,
  "cancelTokenHash" TEXT,
  "checkInTokenHash" TEXT,
  "rescheduledFromId" TEXT,
  "notes" TEXT,
  "checkedInAt" TIMESTAMP(3),
  "riskHint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "booking_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_check_ins" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "checkedInByUserId" TEXT NOT NULL,
  "method" "BookingCheckInMethod" NOT NULL DEFAULT 'QR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "booking_check_ins_pkey" PRIMARY KEY ("id")
);

-- Uniques / indexes
CREATE UNIQUE INDEX "booking_services_organizationId_slug_key" ON "booking_services"("organizationId", "slug");
CREATE UNIQUE INDEX "booking_services_organizationId_id_key" ON "booking_services"("organizationId", "id");
CREATE INDEX "booking_services_organizationId_isActive_idx" ON "booking_services"("organizationId", "isActive");
CREATE INDEX "booking_services_organizationId_deletedAt_idx" ON "booking_services"("organizationId", "deletedAt");
CREATE INDEX "booking_services_organizationId_formId_idx" ON "booking_services"("organizationId", "formId");

CREATE UNIQUE INDEX "booking_advisors_organizationId_id_key" ON "booking_advisors"("organizationId", "id");
CREATE INDEX "booking_advisors_organizationId_isActive_idx" ON "booking_advisors"("organizationId", "isActive");
CREATE INDEX "booking_advisors_organizationId_deletedAt_idx" ON "booking_advisors"("organizationId", "deletedAt");
CREATE INDEX "booking_advisors_organizationId_userId_idx" ON "booking_advisors"("organizationId", "userId");

CREATE UNIQUE INDEX "booking_advisor_services_organizationId_advisorId_serviceId_key" ON "booking_advisor_services"("organizationId", "advisorId", "serviceId");
CREATE INDEX "booking_advisor_services_organizationId_serviceId_idx" ON "booking_advisor_services"("organizationId", "serviceId");

CREATE INDEX "booking_availability_rules_organizationId_advisorId_weekday_isActive_idx" ON "booking_availability_rules"("organizationId", "advisorId", "weekday", "isActive");
CREATE INDEX "booking_availability_rules_organizationId_serviceId_idx" ON "booking_availability_rules"("organizationId", "serviceId");

CREATE INDEX "booking_availability_exceptions_organizationId_advisorId_localDate_idx" ON "booking_availability_exceptions"("organizationId", "advisorId", "localDate");
CREATE INDEX "booking_availability_exceptions_organizationId_serviceId_localDate_idx" ON "booking_availability_exceptions"("organizationId", "serviceId", "localDate");

CREATE UNIQUE INDEX "booking_slots_organizationId_serviceId_advisorId_startsAt_key" ON "booking_slots"("organizationId", "serviceId", "advisorId", "startsAt");
CREATE UNIQUE INDEX "booking_slots_organizationId_id_key" ON "booking_slots"("organizationId", "id");
CREATE INDEX "booking_slots_organizationId_serviceId_startsAt_status_idx" ON "booking_slots"("organizationId", "serviceId", "startsAt", "status");
CREATE INDEX "booking_slots_organizationId_advisorId_startsAt_status_idx" ON "booking_slots"("organizationId", "advisorId", "startsAt", "status");
CREATE INDEX "booking_slots_organizationId_branchId_startsAt_idx" ON "booking_slots"("organizationId", "branchId", "startsAt");
CREATE INDEX "booking_slots_organizationId_status_startsAt_idx" ON "booking_slots"("organizationId", "status", "startsAt");

CREATE UNIQUE INDEX "booking_reservations_organizationId_trackingCode_key" ON "booking_reservations"("organizationId", "trackingCode");
CREATE UNIQUE INDEX "booking_reservations_organizationId_id_key" ON "booking_reservations"("organizationId", "id");
CREATE INDEX "booking_reservations_organizationId_slotId_status_idx" ON "booking_reservations"("organizationId", "slotId", "status");
CREATE INDEX "booking_reservations_organizationId_normalizedMobile_status_idx" ON "booking_reservations"("organizationId", "normalizedMobile", "status");
CREATE INDEX "booking_reservations_organizationId_normalizedNationalId_status_idx" ON "booking_reservations"("organizationId", "normalizedNationalId", "status");
CREATE INDEX "booking_reservations_organizationId_status_createdAt_idx" ON "booking_reservations"("organizationId", "status", "createdAt");
CREATE INDEX "booking_reservations_organizationId_formSubmissionId_idx" ON "booking_reservations"("organizationId", "formSubmissionId");
CREATE INDEX "booking_reservations_organizationId_deletedAt_idx" ON "booking_reservations"("organizationId", "deletedAt");

CREATE UNIQUE INDEX "booking_check_ins_organizationId_reservationId_key" ON "booking_check_ins"("organizationId", "reservationId");
CREATE INDEX "booking_check_ins_organizationId_createdAt_idx" ON "booking_check_ins"("organizationId", "createdAt");

-- Foreign keys
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_advisors" ADD CONSTRAINT "booking_advisors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_advisors" ADD CONSTRAINT "booking_advisors_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_advisors" ADD CONSTRAINT "booking_advisors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_advisor_services" ADD CONSTRAINT "booking_advisor_services_organizationId_advisorId_fkey" FOREIGN KEY ("organizationId", "advisorId") REFERENCES "booking_advisors"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_advisor_services" ADD CONSTRAINT "booking_advisor_services_organizationId_serviceId_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_availability_rules" ADD CONSTRAINT "booking_availability_rules_organizationId_advisorId_fkey" FOREIGN KEY ("organizationId", "advisorId") REFERENCES "booking_advisors"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_availability_rules" ADD CONSTRAINT "booking_availability_rules_organizationId_serviceId_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_availability_exceptions" ADD CONSTRAINT "booking_availability_exceptions_organizationId_advisorId_fkey" FOREIGN KEY ("organizationId", "advisorId") REFERENCES "booking_advisors"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_availability_exceptions" ADD CONSTRAINT "booking_availability_exceptions_organizationId_serviceId_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_serviceId_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_advisorId_fkey" FOREIGN KEY ("organizationId", "advisorId") REFERENCES "booking_advisors"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_organizationId_slotId_fkey" FOREIGN KEY ("organizationId", "slotId") REFERENCES "booking_slots"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_organizationId_formSubmissionId_fkey" FOREIGN KEY ("organizationId", "formSubmissionId") REFERENCES "form_submissions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "booking_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_check_ins" ADD CONSTRAINT "booking_check_ins_organizationId_reservationId_fkey" FOREIGN KEY ("organizationId", "reservationId") REFERENCES "booking_reservations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_check_ins" ADD CONSTRAINT "booking_check_ins_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
