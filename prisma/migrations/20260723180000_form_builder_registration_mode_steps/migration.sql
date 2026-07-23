-- Form Builder: Registration Mode + FormStep architecture (Sprint 1 / Task 1)
-- Additive only: existing forms default to STANDARD; formStepId stays null.

CREATE TYPE "FormMode" AS ENUM ('STANDARD', 'REGISTRATION');

ALTER TABLE "forms" ADD COLUMN "mode" "FormMode" NOT NULL DEFAULT 'STANDARD';

CREATE INDEX "forms_organizationId_mode_idx" ON "forms"("organizationId", "mode");

CREATE TABLE "form_steps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "formVersionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_steps_organizationId_id_key" ON "form_steps"("organizationId", "id");

CREATE UNIQUE INDEX "form_steps_organizationId_formVersionId_stepKey_key" ON "form_steps"("organizationId", "formVersionId", "stepKey");

CREATE UNIQUE INDEX "form_steps_organizationId_formVersionId_sortOrder_key" ON "form_steps"("organizationId", "formVersionId", "sortOrder");

CREATE INDEX "form_steps_organizationId_formVersionId_sortOrder_idx" ON "form_steps"("organizationId", "formVersionId", "sortOrder");

ALTER TABLE "form_steps" ADD CONSTRAINT "form_steps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "form_steps" ADD CONSTRAINT "form_steps_organizationId_formVersionId_fkey" FOREIGN KEY ("organizationId", "formVersionId") REFERENCES "form_versions"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_fields" ADD COLUMN "formStepId" TEXT;

CREATE INDEX "form_fields_organizationId_formStepId_sortOrder_idx" ON "form_fields"("organizationId", "formStepId", "sortOrder");

ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_organizationId_formStepId_fkey" FOREIGN KEY ("organizationId", "formStepId") REFERENCES "form_steps"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
