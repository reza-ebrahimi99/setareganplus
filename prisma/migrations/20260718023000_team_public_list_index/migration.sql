-- Speeds public /team listing filters (active, non-archived) and displayOrder.
CREATE INDEX "team_members_organizationId_isActive_archivedAt_deletedAt_displayOrder_idx"
ON "team_members"("organizationId", "isActive", "archivedAt", "deletedAt", "displayOrder");
