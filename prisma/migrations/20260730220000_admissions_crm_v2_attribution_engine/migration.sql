-- Admissions CRM v2 Sprint 2 — Attribution Engine (additive only).

CREATE TYPE "LeadOwnershipHistorySource" AS ENUM (
  'MANUAL',
  'BULK',
  'AUTOMATION',
  'IMPORT',
  'SYSTEM'
);

CREATE TYPE "AttributionPolicyMode" AS ENUM (
  'CURRENT_OWNER_AT_EVENT',
  'FIRST_OWNER'
);

CREATE TABLE "lead_ownership_histories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" "LeadOwnershipHistorySource" NOT NULL DEFAULT 'SYSTEM',
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_ownership_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attribution_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mode" "AttributionPolicyMode" NOT NULL DEFAULT 'CURRENT_OWNER_AT_EVENT',
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribution_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attribution_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revenueKey" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "registrationId" TEXT,
    "paymentIntentId" TEXT,
    "amountRials" INTEGER NOT NULL,
    "attributedUserId" TEXT,
    "policyId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "policyMode" "AttributionPolicyMode" NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_ownership_histories_organizationId_leadId_effectiveFrom_idx"
  ON "lead_ownership_histories"("organizationId", "leadId", "effectiveFrom");
CREATE INDEX "lead_ownership_histories_organizationId_leadId_effectiveTo_idx"
  ON "lead_ownership_histories"("organizationId", "leadId", "effectiveTo");
CREATE INDEX "lead_ownership_histories_organizationId_ownerUserId_effectiveFrom_idx"
  ON "lead_ownership_histories"("organizationId", "ownerUserId", "effectiveFrom");

CREATE UNIQUE INDEX "attribution_policies_organizationId_policyKey_version_key"
  ON "attribution_policies"("organizationId", "policyKey", "version");
CREATE UNIQUE INDEX "attribution_policies_organizationId_id_key"
  ON "attribution_policies"("organizationId", "id");
CREATE INDEX "attribution_policies_organizationId_isDefault_isActive_idx"
  ON "attribution_policies"("organizationId", "isDefault", "isActive");
-- At most one default policy per organization.
CREATE UNIQUE INDEX "attribution_policies_one_default_per_org_idx"
  ON "attribution_policies"("organizationId")
  WHERE "isDefault" = true;

CREATE UNIQUE INDEX "attribution_snapshots_organizationId_revenueKey_key"
  ON "attribution_snapshots"("organizationId", "revenueKey");
CREATE UNIQUE INDEX "attribution_snapshots_organizationId_id_key"
  ON "attribution_snapshots"("organizationId", "id");
CREATE INDEX "attribution_snapshots_organizationId_leadId_attributedAt_idx"
  ON "attribution_snapshots"("organizationId", "leadId", "attributedAt");
CREATE INDEX "attribution_snapshots_organizationId_attributedUserId_attributedAt_idx"
  ON "attribution_snapshots"("organizationId", "attributedUserId", "attributedAt");
CREATE INDEX "attribution_snapshots_organizationId_registrationId_idx"
  ON "attribution_snapshots"("organizationId", "registrationId");
CREATE INDEX "attribution_snapshots_organizationId_paymentIntentId_idx"
  ON "attribution_snapshots"("organizationId", "paymentIntentId");

ALTER TABLE "lead_ownership_histories"
  ADD CONSTRAINT "lead_ownership_histories_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_ownership_histories"
  ADD CONSTRAINT "lead_ownership_histories_organizationId_leadId_fkey"
  FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_ownership_histories"
  ADD CONSTRAINT "lead_ownership_histories_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_ownership_histories"
  ADD CONSTRAINT "lead_ownership_histories_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attribution_policies"
  ADD CONSTRAINT "attribution_policies_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_organizationId_leadId_fkey"
  FOREIGN KEY ("organizationId", "leadId") REFERENCES "leads"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_organizationId_registrationId_fkey"
  FOREIGN KEY ("organizationId", "registrationId") REFERENCES "registrations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_organizationId_paymentIntentId_fkey"
  FOREIGN KEY ("organizationId", "paymentIntentId") REFERENCES "payment_intents"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_attributedUserId_fkey"
  FOREIGN KEY ("attributedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attribution_snapshots"
  ADD CONSTRAINT "attribution_snapshots_organizationId_policyId_fkey"
  FOREIGN KEY ("organizationId", "policyId") REFERENCES "attribution_policies"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one open ownership period per existing lead from current ownerUserId.
INSERT INTO "lead_ownership_histories" (
  "id",
  "organizationId",
  "leadId",
  "ownerUserId",
  "effectiveFrom",
  "effectiveTo",
  "source",
  "actorUserId",
  "createdAt"
)
SELECT
  'loh_' || l."id",
  l."organizationId",
  l."id",
  l."ownerUserId",
  l."createdAt",
  NULL,
  'SYSTEM'::"LeadOwnershipHistorySource",
  NULL,
  CURRENT_TIMESTAMP
FROM "leads" l
WHERE l."deletedAt" IS NULL;

-- Seed default attribution policy per organization.
INSERT INTO "attribution_policies" (
  "id",
  "organizationId",
  "policyKey",
  "version",
  "mode",
  "name",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'apol_default_' || o."id",
  o."id",
  'default_current_owner',
  1,
  'CURRENT_OWNER_AT_EVENT'::"AttributionPolicyMode",
  'مالک فعلی در زمان رویداد درآمد',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" o
WHERE o."deletedAt" IS NULL;
