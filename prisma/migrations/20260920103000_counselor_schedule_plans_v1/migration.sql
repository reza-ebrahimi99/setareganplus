-- CreateEnum
CREATE TYPE "CounselorSchedulePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "CounselorScheduleSessionKind" AS ENUM ('FIRST_SESSION', 'SECOND_SESSION');

-- CreateTable
CREATE TABLE "counselor_schedule_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "sessionKind" "CounselorScheduleSessionKind" NOT NULL,
    "status" "CounselorSchedulePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "sessionMinutes" INTEGER NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT,
    "legacySourceKey" TEXT,
    "legacyMeta" JSONB,
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counselor_schedule_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counselor_schedule_days" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "weekdayLabel" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counselor_schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counselor_schedule_windows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "startLocalTime" TEXT NOT NULL,
    "endLocalTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counselor_schedule_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "counselor_schedule_plans_organizationId_id_key" ON "counselor_schedule_plans"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "counselor_schedule_plans_organizationId_idempotencyKey_key" ON "counselor_schedule_plans"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "counselor_schedule_plans_organizationId_advisorId_sessionKind_idx" ON "counselor_schedule_plans"("organizationId", "advisorId", "sessionKind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "counselor_schedule_days_organizationId_id_key" ON "counselor_schedule_days"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "counselor_schedule_days_organizationId_planId_localDate_key" ON "counselor_schedule_days"("organizationId", "planId", "localDate");

-- CreateIndex
CREATE INDEX "counselor_schedule_days_organizationId_localDate_idx" ON "counselor_schedule_days"("organizationId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "counselor_schedule_windows_organizationId_id_key" ON "counselor_schedule_windows"("organizationId", "id");

-- CreateIndex
CREATE INDEX "counselor_schedule_windows_organizationId_dayId_idx" ON "counselor_schedule_windows"("organizationId", "dayId");

-- AlterTable
ALTER TABLE "booking_slots" ADD COLUMN "schedulePlanId" TEXT,
ADD COLUMN "scheduleDayId" TEXT,
ADD COLUMN "scheduleWindowId" TEXT;

-- CreateIndex
CREATE INDEX "booking_slots_organizationId_schedulePlanId_startsAt_idx" ON "booking_slots"("organizationId", "schedulePlanId", "startsAt");

-- AddForeignKey
ALTER TABLE "counselor_schedule_plans" ADD CONSTRAINT "counselor_schedule_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_schedule_plans" ADD CONSTRAINT "counselor_schedule_plans_organizationId_advisorId_fkey" FOREIGN KEY ("organizationId", "advisorId") REFERENCES "booking_advisors"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_schedule_days" ADD CONSTRAINT "counselor_schedule_days_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_schedule_days" ADD CONSTRAINT "counselor_schedule_days_organizationId_planId_fkey" FOREIGN KEY ("organizationId", "planId") REFERENCES "counselor_schedule_plans"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_schedule_windows" ADD CONSTRAINT "counselor_schedule_windows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_schedule_windows" ADD CONSTRAINT "counselor_schedule_windows_organizationId_dayId_fkey" FOREIGN KEY ("organizationId", "dayId") REFERENCES "counselor_schedule_days"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_schedulePlanId_fkey" FOREIGN KEY ("organizationId", "schedulePlanId") REFERENCES "counselor_schedule_plans"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_scheduleDayId_fkey" FOREIGN KEY ("organizationId", "scheduleDayId") REFERENCES "counselor_schedule_days"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_organizationId_scheduleWindowId_fkey" FOREIGN KEY ("organizationId", "scheduleWindowId") REFERENCES "counselor_schedule_windows"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
