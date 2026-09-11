-- Additive only. GUIDANCE_HOLLAND_REPORT is required by the existing
-- Holland standalone report checkout (holland/payment.ts + payment/service.ts).
-- Does not rewrite 20260909090000_guidance_prelaunch_hardening.

ALTER TYPE "PaymentPayableType" ADD VALUE IF NOT EXISTS 'GUIDANCE_HOLLAND_REPORT';
