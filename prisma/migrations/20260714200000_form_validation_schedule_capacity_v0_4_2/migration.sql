-- AlterEnum
ALTER TYPE "FormFieldType" ADD VALUE 'NATIONAL_ID';

-- AlterTable
ALTER TABLE "form_versions" ADD COLUMN "opensAt" TIMESTAMP(3);
