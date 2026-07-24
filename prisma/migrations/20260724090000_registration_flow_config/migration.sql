-- Additive commercial / SMS UX columns on existing registration_flows (Registration Management foundation).
-- Do NOT recreate the table: earlier migrations already created registration_flows with slug/lifecycle/payment.

ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "saleAmountRials" INTEGER;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "pricingBadge" TEXT;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3);
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "discountEndsAt" TIMESTAMP(3);
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "showDiscountCountdown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "showRemainingCapacity" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "confirmationSmsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "adminNotificationSmsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "smsTemplateCode" TEXT;
ALTER TABLE "registration_flows" ADD COLUMN IF NOT EXISTS "adminSmsRecipients" JSONB NOT NULL DEFAULT '[]';
