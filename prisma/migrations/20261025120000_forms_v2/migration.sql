-- Form builder 2.0 (phase 6): additive only, existing forms/submissions keep working (defaults: free, no limits)

-- CreateEnum
CREATE TYPE "FormPayState" AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "adminNotify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "basePriceRials" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "closesAt" TIMESTAMP(3),
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "listed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "opensAt" TIMESTAMP(3),
ADD COLUMN     "payMode" TEXT NOT NULL DEFAULT 'FREE',
ADD COLUMN     "smsConfirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "successRedirect" TEXT,
ADD COLUMN     "successTitle" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'navy',
ADD COLUMN     "uniqueBy" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "SmsLog" ADD COLUMN     "submissionId" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "amountRials" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "discountRials" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "nationalCode" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payState" "FormPayState" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "priceLines" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "token" TEXT;

-- CreateTable
CREATE TABLE "FormDiscount" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percent" INTEGER,
    "amountRials" INTEGER,
    "maxUses" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormPayment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'zibal',
    "amountRials" INTEGER NOT NULL,
    "status" "PayStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "trackId" TEXT,
    "refNumber" TEXT,
    "cardNumber" TEXT,
    "result" INTEGER,
    "message" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDiscount_formId_code_key" ON "FormDiscount"("formId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FormPayment_token_key" ON "FormPayment"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FormPayment_trackId_key" ON "FormPayment"("trackId");

-- CreateIndex
CREATE INDEX "FormPayment_submissionId_idx" ON "FormPayment"("submissionId");

-- CreateIndex
CREATE INDEX "FormPayment_status_createdAt_idx" ON "FormPayment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_token_key" ON "Submission"("token");

-- CreateIndex
CREATE INDEX "Submission_formId_payState_idx" ON "Submission"("formId", "payState");

-- CreateIndex
CREATE INDEX "Submission_formId_mobile_idx" ON "Submission"("formId", "mobile");

-- CreateIndex
CREATE INDEX "Submission_formId_nationalCode_idx" ON "Submission"("formId", "nationalCode");

-- AddForeignKey
ALTER TABLE "FormDiscount" ADD CONSTRAINT "FormDiscount_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormPayment" ADD CONSTRAINT "FormPayment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

