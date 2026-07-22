-- Registration Engine v1 — reusable enrollment foundation

CREATE TYPE "RegistrationStatus" AS ENUM (
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "RegistrationProductType" AS ENUM (
  'EXAM',
  'CLASS',
  'CAMP',
  'WORKSHOP',
  'EVENT',
  'SCHOOL_ADMISSION'
);

CREATE TYPE "RegistrationParentRelationship" AS ENUM (
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'OTHER'
);

ALTER TYPE "CrmActivityType" ADD VALUE IF NOT EXISTS 'REGISTRATION_CREATED';
ALTER TYPE "LeadSourceType" ADD VALUE IF NOT EXISTS 'REGISTRATION';

CREATE TABLE "registration_number_counters" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "jalaliYear" INTEGER NOT NULL,
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registration_number_counters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registrations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "productType" "RegistrationProductType" NOT NULL,
  "flowKey" TEXT NOT NULL,
  "leadId" TEXT,
  "studentFirstName" TEXT NOT NULL,
  "studentLastName" TEXT NOT NULL,
  "nationalCode" TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  "gender" "Gender" NOT NULL,
  "gradeLabel" TEXT NOT NULL,
  "majorLabel" TEXT,
  "schoolName" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "parentName" TEXT NOT NULL,
  "parentRelationship" "RegistrationParentRelationship" NOT NULL,
  "parentMobile" TEXT NOT NULL,
  "parentMobileNormalized" TEXT NOT NULL,
  "parentSecondaryMobile" TEXT,
  "parentEmail" TEXT,
  "parentAddress" TEXT,
  "productKey" TEXT NOT NULL,
  "productTitle" TEXT NOT NULL,
  "sessionKey" TEXT,
  "sessionTitle" TEXT,
  "packageKey" TEXT,
  "packageTitle" TEXT,
  "venueBranchKey" TEXT,
  "venueBranchTitle" TEXT,
  "discountCode" TEXT,
  "amountRials" INTEGER NOT NULL,
  "discountRials" INTEGER NOT NULL DEFAULT 0,
  "finalAmountRials" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IRR',
  "trackingCode" TEXT,
  "paymentProvider" TEXT,
  "paymentRef" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registration_number_counters_organizationId_jalaliYear_key"
  ON "registration_number_counters"("organizationId", "jalaliYear");

CREATE INDEX "registration_number_counters_organizationId_idx"
  ON "registration_number_counters"("organizationId");

CREATE UNIQUE INDEX "registrations_organizationId_registrationNumber_key"
  ON "registrations"("organizationId", "registrationNumber");

CREATE UNIQUE INDEX "registrations_organizationId_id_key"
  ON "registrations"("organizationId", "id");

CREATE INDEX "registrations_organizationId_status_createdAt_idx"
  ON "registrations"("organizationId", "status", "createdAt");

CREATE INDEX "registrations_organizationId_flowKey_createdAt_idx"
  ON "registrations"("organizationId", "flowKey", "createdAt");

CREATE INDEX "registrations_organizationId_nationalCode_idx"
  ON "registrations"("organizationId", "nationalCode");

CREATE INDEX "registrations_organizationId_parentMobileNormalized_idx"
  ON "registrations"("organizationId", "parentMobileNormalized");

CREATE INDEX "registrations_organizationId_leadId_idx"
  ON "registrations"("organizationId", "leadId");

CREATE INDEX "registrations_organizationId_deletedAt_idx"
  ON "registrations"("organizationId", "deletedAt");

ALTER TABLE "registration_number_counters"
  ADD CONSTRAINT "registration_number_counters_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_organizationId_branchId_fkey"
  FOREIGN KEY ("organizationId", "branchId")
  REFERENCES "branches"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registrations"
  ADD CONSTRAINT "registrations_organizationId_leadId_fkey"
  FOREIGN KEY ("organizationId", "leadId")
  REFERENCES "leads"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
