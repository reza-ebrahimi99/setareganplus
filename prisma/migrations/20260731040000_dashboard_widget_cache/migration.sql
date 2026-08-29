-- Sprint 6 — Dashboard Platform widget TTL cache

CREATE TABLE IF NOT EXISTS "dashboard_widget_caches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dashboard_widget_caches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_widget_caches_organizationId_cacheKey_key"
  ON "dashboard_widget_caches"("organizationId", "cacheKey");
CREATE INDEX IF NOT EXISTS "dashboard_widget_caches_organizationId_expiresAt_idx"
  ON "dashboard_widget_caches"("organizationId", "expiresAt");
CREATE INDEX IF NOT EXISTS "dashboard_widget_caches_organizationId_widgetId_idx"
  ON "dashboard_widget_caches"("organizationId", "widgetId");

ALTER TABLE "dashboard_widget_caches"
  DROP CONSTRAINT IF EXISTS "dashboard_widget_caches_organizationId_fkey";
ALTER TABLE "dashboard_widget_caches"
  ADD CONSTRAINT "dashboard_widget_caches_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
