-- CreateEnum
CREATE TYPE "FormPurpose" AS ENUM ('FREE_CLASS', 'EDUCATIONAL_EVENT', 'SEMINAR', 'GIFTED_EXAM', 'CONSULTATION', 'ADMISSION', 'SURVEY', 'EMPLOYMENT', 'FESTIVAL', 'PARENT_MEETING');

-- CreateEnum
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'MOBILE', 'EMAIL', 'NUMBER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'DATE', 'GRADE', 'ACADEMIC_TRACK', 'SCHOOL_NAME', 'CONSENT', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FormFieldSemantic" AS ENUM ('NONE', 'FIRST_NAME', 'LAST_NAME', 'FATHER_NAME', 'MOBILE', 'EMAIL', 'SCHOOL', 'GRADE', 'ACADEMIC_TRACK', 'BIRTH_DATE', 'GENDER', 'BRANCH', 'CONSENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DuplicatePolicy" AS ENUM ('FLAG_AND_ACCEPT', 'BLOCK', 'ALLOW_SILENT');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('RECEIVED', 'DUPLICATE', 'WAITING_LIST', 'REJECTED');

-- CreateEnum
CREATE TYPE "FormTemplateScope" AS ENUM ('SYSTEM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "FormTemplateCategory" AS ENUM ('FREE_CLASS', 'EXAM', 'CONSULTATION', 'SEMINAR', 'SURVEY', 'EMPLOYMENT', 'ELEMENTARY_ADMISSION', 'FESTIVAL', 'PARENT_MEETING');

-- CreateEnum
CREATE TYPE "DomainEventType" AS ENUM ('FORM_SUBMISSION_RECEIVED', 'FORM_DUPLICATE_DETECTED', 'FORM_LEAD_CREATED', 'FORM_CAPACITY_REACHED');

-- CreateEnum
CREATE TYPE "DomainEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "FormAnalyticsEventType" AS ENUM ('FORM_VIEW', 'FORM_START', 'FORM_SUBMIT_SUCCESS', 'FORM_SUBMIT_FAILURE');

-- CreateEnum
CREATE TYPE "FormAnalyticsDailyDimension" AS ENUM ('FORM_TOTAL', 'VERSION', 'BRANCH', 'VERSION_BRANCH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'FORM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_VERSION_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_VERSION_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_VERSION_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_SUBMISSION_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'FORM_TEMPLATE_INSTANTIATED';

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "scope" "FormTemplateScope" NOT NULL,
    "organizationId" TEXT,
    "category" "FormTemplateCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purpose" "FormPurpose" NOT NULL,
    "defaultSettings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_template_fields" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "templateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "semantic" "FormFieldSemantic" NOT NULL DEFAULT 'NONE',
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "visibilityConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "slug" TEXT NOT NULL,
    "purpose" "FormPurpose" NOT NULL,
    "isAdmissionForm" BOOLEAN NOT NULL DEFAULT false,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "registrationDeadline" TIMESTAMP(3),
    "capacity" INTEGER,
    "confirmationMessage" TEXT NOT NULL,
    "duplicatePolicy" "DuplicatePolicy" NOT NULL DEFAULT 'FLAG_AND_ACCEPT',
    "createLeadOnSubmit" BOOLEAN NOT NULL DEFAULT false,
    "leadSource" TEXT,
    "showBranchPicker" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "sourceTemplateId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "semantic" "FormFieldSemantic" NOT NULL DEFAULT 'NONE',
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "visibilityConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mobile" TEXT,
    "mobileRaw" TEXT,
    "normalizedMobile" TEXT,
    "email" TEXT,
    "leadId" TEXT,
    "matchedCrmLeadId" TEXT,
    "isDuplicateInForm" BOOLEAN NOT NULL DEFAULT false,
    "existsInCrm" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfSubmissionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_answers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueText" TEXT,
    "valueLongText" TEXT,
    "valueNumber" DECIMAL(18,4),
    "valueDate" DATE,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_tags" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submission_tags" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submission_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT,
    "name" TEXT NOT NULL,
    "trigger" "DomainEventType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "actionConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_event_outbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "eventType" "DomainEventType" NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DomainEventStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_analytics_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formVersionId" TEXT,
    "branchId" TEXT,
    "eventType" "FormAnalyticsEventType" NOT NULL,
    "sessionId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "form_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_analytics_daily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "dimension" "FormAnalyticsDailyDimension" NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "startCount" INTEGER NOT NULL DEFAULT 0,
    "submitSuccessCount" INTEGER NOT NULL DEFAULT 0,
    "submitFailureCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_templates_scope_category_isActive_idx" ON "form_templates"("scope", "category", "isActive");

-- CreateIndex
CREATE INDEX "form_templates_organizationId_category_idx" ON "form_templates"("organizationId", "category");

-- CreateIndex
CREATE INDEX "form_templates_organizationId_deletedAt_idx" ON "form_templates"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "form_template_fields_templateId_sortOrder_idx" ON "form_template_fields"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_fields_templateId_fieldKey_key" ON "form_template_fields"("templateId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_fields_templateId_sortOrder_key" ON "form_template_fields"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "forms_organizationId_purpose_idx" ON "forms"("organizationId", "purpose");

-- CreateIndex
CREATE INDEX "forms_organizationId_isAdmissionForm_idx" ON "forms"("organizationId", "isAdmissionForm");

-- CreateIndex
CREATE INDEX "forms_organizationId_deletedAt_idx" ON "forms"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "forms_organizationId_slug_key" ON "forms"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "forms_organizationId_id_key" ON "forms"("organizationId", "id");

-- CreateIndex
CREATE INDEX "form_versions_organizationId_formId_status_idx" ON "form_versions"("organizationId", "formId", "status");

-- CreateIndex
CREATE INDEX "form_versions_organizationId_status_idx" ON "form_versions"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_organizationId_id_key" ON "form_versions"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_organizationId_formId_versionNumber_key" ON "form_versions"("organizationId", "formId", "versionNumber");

-- CreateIndex
CREATE INDEX "form_fields_organizationId_formVersionId_sortOrder_idx" ON "form_fields"("organizationId", "formVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_organizationId_formVersionId_fieldKey_key" ON "form_fields"("organizationId", "formVersionId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_organizationId_formVersionId_sortOrder_key" ON "form_fields"("organizationId", "formVersionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_organizationId_id_key" ON "form_fields"("organizationId", "id");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_formId_submittedAt_idx" ON "form_submissions"("organizationId", "formId", "submittedAt");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_formVersionId_submittedAt_idx" ON "form_submissions"("organizationId", "formVersionId", "submittedAt");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_formId_normalizedMobile_idx" ON "form_submissions"("organizationId", "formId", "normalizedMobile");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_normalizedMobile_idx" ON "form_submissions"("organizationId", "normalizedMobile");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_status_idx" ON "form_submissions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_existsInCrm_idx" ON "form_submissions"("organizationId", "existsInCrm");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_isDuplicateInForm_idx" ON "form_submissions"("organizationId", "isDuplicateInForm");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_leadId_idx" ON "form_submissions"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "form_submissions_organizationId_deletedAt_idx" ON "form_submissions"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_organizationId_branchId_id_key" ON "form_submissions"("organizationId", "branchId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_organizationId_id_key" ON "form_submissions"("organizationId", "id");

-- CreateIndex
CREATE INDEX "form_answers_organizationId_fieldId_idx" ON "form_answers"("organizationId", "fieldId");

-- CreateIndex
CREATE INDEX "form_answers_organizationId_fieldKey_idx" ON "form_answers"("organizationId", "fieldKey");

-- CreateIndex
CREATE INDEX "form_answers_organizationId_submissionId_idx" ON "form_answers"("organizationId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "form_answers_organizationId_submissionId_fieldId_key" ON "form_answers"("organizationId", "submissionId", "fieldId");

-- CreateIndex
CREATE INDEX "tags_organizationId_deletedAt_idx" ON "tags"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organizationId_slug_key" ON "tags"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organizationId_id_key" ON "tags"("organizationId", "id");

-- CreateIndex
CREATE INDEX "form_tags_organizationId_tagId_idx" ON "form_tags"("organizationId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "form_tags_organizationId_formId_tagId_key" ON "form_tags"("organizationId", "formId", "tagId");

-- CreateIndex
CREATE INDEX "form_submission_tags_organizationId_tagId_idx" ON "form_submission_tags"("organizationId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "form_submission_tags_organizationId_submissionId_tagId_key" ON "form_submission_tags"("organizationId", "submissionId", "tagId");

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_trigger_isEnabled_idx" ON "automation_rules"("organizationId", "trigger", "isEnabled");

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_formId_idx" ON "automation_rules"("organizationId", "formId");

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_deletedAt_idx" ON "automation_rules"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "domain_event_outbox_status_availableAt_idx" ON "domain_event_outbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "domain_event_outbox_organizationId_eventType_createdAt_idx" ON "domain_event_outbox"("organizationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "domain_event_outbox_organizationId_aggregateType_aggregateI_idx" ON "domain_event_outbox"("organizationId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "form_analytics_events_organizationId_formId_occurredAt_idx" ON "form_analytics_events"("organizationId", "formId", "occurredAt");

-- CreateIndex
CREATE INDEX "form_analytics_events_organizationId_formVersionId_occurred_idx" ON "form_analytics_events"("organizationId", "formVersionId", "occurredAt");

-- CreateIndex
CREATE INDEX "form_analytics_events_organizationId_branchId_occurredAt_idx" ON "form_analytics_events"("organizationId", "branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "form_analytics_events_organizationId_eventType_occurredAt_idx" ON "form_analytics_events"("organizationId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "form_analytics_daily_organizationId_date_idx" ON "form_analytics_daily"("organizationId", "date");

-- CreateIndex
CREATE INDEX "form_analytics_daily_organizationId_formId_date_idx" ON "form_analytics_daily"("organizationId", "formId", "date");

-- CreateIndex
CREATE INDEX "form_analytics_daily_organizationId_formId_dimension_date_idx" ON "form_analytics_daily"("organizationId", "formId", "dimension", "date");

-- CreateIndex
CREATE UNIQUE INDEX "form_analytics_daily_organizationId_formId_dimension_dimens_key" ON "form_analytics_daily"("organizationId", "formId", "dimension", "dimensionKey", "date");

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_template_fields" ADD CONSTRAINT "form_template_fields_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_template_fields" ADD CONSTRAINT "form_template_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_organizationId_publishedVersionId_fkey" FOREIGN KEY ("organizationId", "publishedVersionId") REFERENCES "form_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_organizationId_formVersionId_fkey" FOREIGN KEY ("organizationId", "formVersionId") REFERENCES "form_versions"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organizationId_formVersionId_fkey" FOREIGN KEY ("organizationId", "formVersionId") REFERENCES "form_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_organizationId_branchId_leadId_fkey" FOREIGN KEY ("organizationId", "branchId", "leadId") REFERENCES "leads"("organizationId", "branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_duplicateOfSubmissionId_fkey" FOREIGN KEY ("duplicateOfSubmissionId") REFERENCES "form_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_organizationId_submissionId_fkey" FOREIGN KEY ("organizationId", "submissionId") REFERENCES "form_submissions"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_organizationId_fieldId_fkey" FOREIGN KEY ("organizationId", "fieldId") REFERENCES "form_fields"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_tags" ADD CONSTRAINT "form_tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_tags" ADD CONSTRAINT "form_tags_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_tags" ADD CONSTRAINT "form_tags_organizationId_tagId_fkey" FOREIGN KEY ("organizationId", "tagId") REFERENCES "tags"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submission_tags" ADD CONSTRAINT "form_submission_tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submission_tags" ADD CONSTRAINT "form_submission_tags_organizationId_submissionId_fkey" FOREIGN KEY ("organizationId", "submissionId") REFERENCES "form_submissions"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submission_tags" ADD CONSTRAINT "form_submission_tags_organizationId_tagId_fkey" FOREIGN KEY ("organizationId", "tagId") REFERENCES "tags"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_event_outbox" ADD CONSTRAINT "domain_event_outbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_event_outbox" ADD CONSTRAINT "domain_event_outbox_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_events" ADD CONSTRAINT "form_analytics_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_events" ADD CONSTRAINT "form_analytics_events_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_events" ADD CONSTRAINT "form_analytics_events_organizationId_formVersionId_fkey" FOREIGN KEY ("organizationId", "formVersionId") REFERENCES "form_versions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_events" ADD CONSTRAINT "form_analytics_events_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_daily" ADD CONSTRAINT "form_analytics_daily_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_analytics_daily" ADD CONSTRAINT "form_analytics_daily_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
