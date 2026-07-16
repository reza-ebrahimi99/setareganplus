-- StarOS v0.6A: SMS provider abstraction, outbound queue, and OTP challenges.
-- Never store plaintext OTP. Secrets remain in environment variables.

ALTER TYPE "AuditAction" ADD VALUE 'SMS_ENQUEUED';
ALTER TYPE "AuditAction" ADD VALUE 'SMS_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'SMS_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'OTP_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'OTP_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'OTP_FAILED';

CREATE TYPE "SmsMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER', 'CANCELLED');
CREATE TYPE "SmsTemplatePurpose" AS ENUM ('BOOKING_CONFIRMATION', 'FORM_CONFIRMATION', 'OTP', 'CUSTOM');
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'VERIFY_MOBILE', 'BOOKING', 'FORM', 'GENERIC');
CREATE TYPE "OtpChallengeStatus" AS ENUM ('PENDING', 'VERIFIED', 'CONSUMED', 'EXPIRED', 'LOCKED');

CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" "SmsTemplatePurpose" NOT NULL DEFAULT 'CUSTOM',
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT,
    "toMobile" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SmsMessageStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'null',
    "providerMessageId" TEXT,
    "purpose" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "normalizedMobile" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'GENERIC',
    "codeHash" TEXT NOT NULL,
    "status" "OtpChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "resendAvailableAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_templates_organizationId_code_key" ON "sms_templates"("organizationId", "code");
CREATE UNIQUE INDEX "sms_templates_organizationId_id_key" ON "sms_templates"("organizationId", "id");
CREATE INDEX "sms_templates_organizationId_purpose_isActive_idx" ON "sms_templates"("organizationId", "purpose", "isActive");
CREATE INDEX "sms_templates_organizationId_deletedAt_idx" ON "sms_templates"("organizationId", "deletedAt");

CREATE UNIQUE INDEX "sms_messages_organizationId_idempotencyKey_key" ON "sms_messages"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "sms_messages_organizationId_id_key" ON "sms_messages"("organizationId", "id");
CREATE INDEX "sms_messages_status_availableAt_idx" ON "sms_messages"("status", "availableAt");
CREATE INDEX "sms_messages_organizationId_status_createdAt_idx" ON "sms_messages"("organizationId", "status", "createdAt");
CREATE INDEX "sms_messages_organizationId_purpose_createdAt_idx" ON "sms_messages"("organizationId", "purpose", "createdAt");
CREATE INDEX "sms_messages_organizationId_relatedType_relatedId_idx" ON "sms_messages"("organizationId", "relatedType", "relatedId");
CREATE INDEX "sms_messages_organizationId_toMobile_createdAt_idx" ON "sms_messages"("organizationId", "toMobile", "createdAt");

CREATE UNIQUE INDEX "otp_challenges_organizationId_id_key" ON "otp_challenges"("organizationId", "id");
CREATE INDEX "otp_challenges_organizationId_normalizedMobile_purpose_status_idx" ON "otp_challenges"("organizationId", "normalizedMobile", "purpose", "status");
CREATE INDEX "otp_challenges_organizationId_status_expiresAt_idx" ON "otp_challenges"("organizationId", "status", "expiresAt");
CREATE INDEX "otp_challenges_organizationId_idempotencyKey_idx" ON "otp_challenges"("organizationId", "idempotencyKey");

ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_organizationId_templateId_fkey" FOREIGN KEY ("organizationId", "templateId") REFERENCES "sms_templates"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
