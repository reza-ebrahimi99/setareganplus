-- Promotion Engine: unified timed / coupon / referral / VIP promotions

CREATE TYPE "PromotionType" AS ENUM ('TIMED', 'COUPON', 'REFERRAL', 'VIP');
CREATE TYPE "PromotionValueType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "valueType" "PromotionValueType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscountAmount" INTEGER,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "usagePerNationalCode" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registrationFlowId" TEXT,
    "ownerStaffId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_usages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "nationalCode" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_organizationId_code_key" ON "promotions"("organizationId", "code");
CREATE UNIQUE INDEX "promotions_organizationId_id_key" ON "promotions"("organizationId", "id");
CREATE INDEX "promotions_organizationId_type_isActive_deletedAt_idx" ON "promotions"("organizationId", "type", "isActive", "deletedAt");
CREATE INDEX "promotions_organizationId_registrationFlowId_idx" ON "promotions"("organizationId", "registrationFlowId");
CREATE INDEX "promotions_organizationId_ownerStaffId_idx" ON "promotions"("organizationId", "ownerStaffId");
CREATE INDEX "promotions_organizationId_startsAt_endsAt_idx" ON "promotions"("organizationId", "startsAt", "endsAt");
CREATE INDEX "promotions_ownerStaffId_idx" ON "promotions"("ownerStaffId");

CREATE UNIQUE INDEX "promotion_usages_organizationId_id_key" ON "promotion_usages"("organizationId", "id");
CREATE UNIQUE INDEX "promotion_usages_promotionId_registrationId_key" ON "promotion_usages"("promotionId", "registrationId");
CREATE INDEX "promotion_usages_organizationId_promotionId_usedAt_idx" ON "promotion_usages"("organizationId", "promotionId", "usedAt");
CREATE INDEX "promotion_usages_organizationId_registrationId_idx" ON "promotion_usages"("organizationId", "registrationId");
CREATE INDEX "promotion_usages_organizationId_nationalCode_idx" ON "promotion_usages"("organizationId", "nationalCode");

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organizationId_registrationFlowId_fkey" FOREIGN KEY ("organizationId", "registrationFlowId") REFERENCES "registration_flows"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_organizationId_promotionId_fkey" FOREIGN KEY ("organizationId", "promotionId") REFERENCES "promotions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_organizationId_registrationId_fkey" FOREIGN KEY ("organizationId", "registrationId") REFERENCES "registrations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
