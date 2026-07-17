-- CRM Sprint 1: optimize tenant/branch lead-owner filters and recent lists.
-- The nullable ownerUserId relation was introduced by CRM v0.7 and remains
-- the canonical lead assignment field.
CREATE INDEX IF NOT EXISTS "leads_organizationId_branchId_ownerUserId_updatedAt_idx"
ON "leads"("organizationId", "branchId", "ownerUserId", "updatedAt");
