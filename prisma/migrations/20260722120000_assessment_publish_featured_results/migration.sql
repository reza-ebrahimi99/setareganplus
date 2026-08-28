-- Assessment Center Phase 1: public featured-results publishing controls

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "publishFeaturedResults" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "featuredResultsLimit" INTEGER NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS "assessments_organizationId_isPublished_publishFeaturedResults_archivedAt_deletedAt_idx"
  ON "assessments" (
    "organizationId",
    "isPublished",
    "publishFeaturedResults",
    "archivedAt",
    "deletedAt"
  );
