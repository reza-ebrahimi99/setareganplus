-- Guidance ERP Phase 0 — consent attestation on GuidancePlan (additive).
-- ConsentRecord remains Lead-scoped in CRM; Guidance does not create Leads in P0.

ALTER TABLE "guidance_plans" ADD COLUMN "consentGrantedAt" TIMESTAMP(3);
ALTER TABLE "guidance_plans" ADD COLUMN "consentVersion" TEXT;
ALTER TABLE "guidance_plans" ADD COLUMN "consentText" TEXT;
