-- StarOS v0.5.2B: admin-managed site placements for forms and booking embeds.

CREATE TYPE "SitePlacementKey" AS ENUM ('PRE_REGISTRATION_FORM', 'CONSULTATION_FORM', 'CONSULTATION_BOOKING');
CREATE TYPE "SitePlacementContentType" AS ENUM ('FORM', 'BOOKING', 'NONE');
CREATE TYPE "SitePlacementDisplayMode" AS ENUM ('FULL', 'EMBEDDED', 'COMPACT', 'CARD');

ALTER TYPE "AuditAction" ADD VALUE 'SITE_PLACEMENT_UPDATED';

CREATE TABLE "site_placements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "placementKey" "SitePlacementKey" NOT NULL,
    "contentType" "SitePlacementContentType" NOT NULL DEFAULT 'NONE',
    "formId" TEXT,
    "bookingServiceId" TEXT,
    "displayMode" "SitePlacementDisplayMode" NOT NULL DEFAULT 'EMBEDDED',
    "showPoster" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "heading" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "site_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_placements_organizationId_placementKey_key" ON "site_placements"("organizationId", "placementKey");
CREATE UNIQUE INDEX "site_placements_organizationId_id_key" ON "site_placements"("organizationId", "id");
CREATE INDEX "site_placements_organizationId_deletedAt_idx" ON "site_placements"("organizationId", "deletedAt");
CREATE INDEX "site_placements_organizationId_isEnabled_idx" ON "site_placements"("organizationId", "isEnabled");
CREATE INDEX "site_placements_organizationId_formId_idx" ON "site_placements"("organizationId", "formId");
CREATE INDEX "site_placements_organizationId_bookingServiceId_idx" ON "site_placements"("organizationId", "bookingServiceId");

ALTER TABLE "site_placements" ADD CONSTRAINT "site_placements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_placements" ADD CONSTRAINT "site_placements_organizationId_formId_fkey" FOREIGN KEY ("organizationId", "formId") REFERENCES "forms"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_placements" ADD CONSTRAINT "site_placements_organizationId_bookingServiceId_fkey" FOREIGN KEY ("organizationId", "bookingServiceId") REFERENCES "booking_services"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
