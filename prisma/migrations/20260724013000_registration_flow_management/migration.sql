-- Registration Flow Management — admin-configurable flows linked to Form Builder + Registration Engine.
-- Payment settles only through existing Payment Foundation (PaymentIntent / sessions / callback).
-- Preserves existing registrations; adds optional FK only.

CREATE TYPE "RegistrationFlowLifecycle" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "RegistrationFlowStepKey" AS ENUM (
  'APPLICANT',
  'STUDENT',
  'FORM',
  'DOCUMENTS',
  'PAYMENT',
  'REVIEW'
);

CREATE TYPE "RegistrationFlowPaymentMode" AS ENUM (
  'FREE',
  'FIXED_AMOUNT',
  'OPTIONAL_PAYMENT',
  'DEPOSIT'
);

CREATE TABLE "registration_flows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverMediaId" TEXT,
    "lifecycle" "RegistrationFlowLifecycle" NOT NULL DEFAULT 'DRAFT',
    "productType" "RegistrationProductType" NOT NULL DEFAULT 'EXAM',
    "formId" TEXT,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "academicYear" TEXT,
    "gradeTargets" TEXT,
    "courseTarget" TEXT,
    "capacity" INTEGER,
    "paymentMode" "RegistrationFlowPaymentMode" NOT NULL DEFAULT 'FIXED_AMOUNT',
    "paymentAmountRials" INTEGER NOT NULL DEFAULT 0,
    "paymentTitle" TEXT,
    "paymentDeadlineAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "registration_flows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_flow_steps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "stepKey" "RegistrationFlowStepKey" NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_flow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_flow_document_requirements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "helpText" TEXT NOT NULL DEFAULT '',
    "documentType" "RegistrationDocumentType" NOT NULL DEFAULT 'OTHER',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "acceptedMimeTypes" TEXT NOT NULL DEFAULT 'image/jpeg,image/png,image/webp',
    "maxSizeBytes" INTEGER NOT NULL DEFAULT 5242880,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "registration_flow_document_requirements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "registrations" ADD COLUMN "registrationFlowId" TEXT;

CREATE UNIQUE INDEX "registration_flows_organizationId_slug_key" ON "registration_flows"("organizationId", "slug");
CREATE UNIQUE INDEX "registration_flows_organizationId_id_key" ON "registration_flows"("organizationId", "id");
CREATE INDEX "registration_flows_organizationId_lifecycle_deletedAt_idx" ON "registration_flows"("organizationId", "lifecycle", "deletedAt");
CREATE INDEX "registration_flows_organizationId_formId_idx" ON "registration_flows"("organizationId", "formId");
CREATE INDEX "registration_flows_coverMediaId_idx" ON "registration_flows"("coverMediaId");

CREATE UNIQUE INDEX "registration_flow_steps_flowId_stepKey_key" ON "registration_flow_steps"("flowId", "stepKey");
CREATE UNIQUE INDEX "registration_flow_steps_organizationId_id_key" ON "registration_flow_steps"("organizationId", "id");
CREATE INDEX "registration_flow_steps_organizationId_flowId_sortOrder_idx" ON "registration_flow_steps"("organizationId", "flowId", "sortOrder");

CREATE UNIQUE INDEX "registration_flow_document_requirements_flowId_requirementKey_key" ON "registration_flow_document_requirements"("flowId", "requirementKey");
CREATE UNIQUE INDEX "registration_flow_document_requirements_organizationId_id_key" ON "registration_flow_document_requirements"("organizationId", "id");
CREATE INDEX "registration_flow_document_requirements_organizationId_flowId_sortOrder_idx" ON "registration_flow_document_requirements"("organizationId", "flowId", "sortOrder");
CREATE INDEX "registration_flow_document_requirements_organizationId_deletedAt_idx" ON "registration_flow_document_requirements"("organizationId", "deletedAt");

CREATE INDEX "registrations_organizationId_registrationFlowId_idx" ON "registrations"("organizationId", "registrationFlowId");

ALTER TABLE "registration_flows" ADD CONSTRAINT "registration_flows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_flows" ADD CONSTRAINT "registration_flows_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registration_flows" ADD CONSTRAINT "registration_flows_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_flow_steps" ADD CONSTRAINT "registration_flow_steps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_flow_steps" ADD CONSTRAINT "registration_flow_steps_organizationId_flowId_fkey" FOREIGN KEY ("organizationId", "flowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_flow_document_requirements" ADD CONSTRAINT "registration_flow_document_requirements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_flow_document_requirements" ADD CONSTRAINT "registration_flow_document_requirements_organizationId_flowId_fkey" FOREIGN KEY ("organizationId", "flowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registrations" ADD CONSTRAINT "registrations_organizationId_registrationFlowId_fkey" FOREIGN KEY ("organizationId", "registrationFlowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
