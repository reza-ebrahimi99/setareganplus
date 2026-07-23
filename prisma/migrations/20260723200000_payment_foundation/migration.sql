-- Additive: Payment Foundation (Sprint 4A)
-- PaymentStatus + PaymentIntent / PaymentSession / PaymentEventLog
-- CRM activity types for payment timeline

ALTER TYPE "CrmActivityType" ADD VALUE IF NOT EXISTS 'PAYMENT_STARTED';
ALTER TYPE "CrmActivityType" ADD VALUE IF NOT EXISTS 'PAYMENT_SUCCEEDED';
ALTER TYPE "CrmActivityType" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "CrmActivityType" ADD VALUE IF NOT EXISTS 'PAYMENT_CANCELLED';

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED'
);

CREATE TABLE "payment_intents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "amountRials" INTEGER NOT NULL,
  "discountRials" INTEGER NOT NULL DEFAULT 0,
  "finalAmountRials" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IRR',
  "description" TEXT,
  "trackingCode" TEXT,
  "receiptNumber" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_sessions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSessionId" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PROCESSING',
  "checkoutUrl" TEXT,
  "callbackToken" TEXT NOT NULL,
  "rawRequestJson" JSONB,
  "rawCallbackJson" JSONB,
  "expiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_event_logs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "fromStatus" "PaymentStatus",
  "toStatus" "PaymentStatus" NOT NULL,
  "event" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_intents_organizationId_idempotencyKey_key" ON "payment_intents"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "payment_intents_organizationId_id_key" ON "payment_intents"("organizationId", "id");
CREATE INDEX "payment_intents_organizationId_registrationId_status_idx" ON "payment_intents"("organizationId", "registrationId", "status");
CREATE INDEX "payment_intents_organizationId_status_createdAt_idx" ON "payment_intents"("organizationId", "status", "createdAt");
CREATE INDEX "payment_intents_organizationId_trackingCode_idx" ON "payment_intents"("organizationId", "trackingCode");
CREATE INDEX "payment_intents_organizationId_receiptNumber_idx" ON "payment_intents"("organizationId", "receiptNumber");

CREATE UNIQUE INDEX "payment_sessions_organizationId_callbackToken_key" ON "payment_sessions"("organizationId", "callbackToken");
CREATE UNIQUE INDEX "payment_sessions_organizationId_provider_providerSessionId_key" ON "payment_sessions"("organizationId", "provider", "providerSessionId");
CREATE UNIQUE INDEX "payment_sessions_organizationId_id_key" ON "payment_sessions"("organizationId", "id");
CREATE INDEX "payment_sessions_organizationId_paymentIntentId_createdAt_idx" ON "payment_sessions"("organizationId", "paymentIntentId", "createdAt");
CREATE INDEX "payment_sessions_organizationId_status_idx" ON "payment_sessions"("organizationId", "status");

CREATE INDEX "payment_event_logs_organizationId_paymentIntentId_createdAt_idx" ON "payment_event_logs"("organizationId", "paymentIntentId", "createdAt");

ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_organizationId_registrationId_fkey" FOREIGN KEY ("organizationId", "registrationId") REFERENCES "registrations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_organizationId_paymentIntentId_fkey" FOREIGN KEY ("organizationId", "paymentIntentId") REFERENCES "payment_intents"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_event_logs" ADD CONSTRAINT "payment_event_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_event_logs" ADD CONSTRAINT "payment_event_logs_organizationId_paymentIntentId_fkey" FOREIGN KEY ("organizationId", "paymentIntentId") REFERENCES "payment_intents"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
