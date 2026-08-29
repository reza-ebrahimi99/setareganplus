-- Security: Students and parents must never hold active AdminSession rows.
-- Portal OrganizationMembership rows (STUDENT / PARENT) are preserved for portal access.
-- Staff directory already excludes these roles in application queries.

UPDATE "admin_sessions" AS s
SET
  "revokedAt" = COALESCE(s."revokedAt", NOW()),
  "updatedAt" = NOW()
FROM "organization_memberships" AS m
WHERE s."organizationMembershipId" = m."id"
  AND s."revokedAt" IS NULL
  AND m."role" IN ('STUDENT', 'PARENT');
