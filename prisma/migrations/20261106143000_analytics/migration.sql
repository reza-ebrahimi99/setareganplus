-- First-party analytics (additive). No IP or personal columns.

CREATE TABLE IF NOT EXISTS "AnalyticsHit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "visitor" TEXT NOT NULL,
    CONSTRAINT "AnalyticsHit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AnalyticsDaily" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "hits" INTEGER NOT NULL,
    "uniques" INTEGER NOT NULL,
    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsHit_day_idx" ON "AnalyticsHit"("day");
CREATE INDEX IF NOT EXISTS "AnalyticsHit_day_kind_idx" ON "AnalyticsHit"("day", "kind");
CREATE INDEX IF NOT EXISTS "AnalyticsHit_createdAt_idx" ON "AnalyticsHit"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsDaily_bucket_key" ON "AnalyticsDaily"("day", "level", "kind", "path", "source", "medium", "campaign");
CREATE INDEX IF NOT EXISTS "AnalyticsDaily_day_kind_level_idx" ON "AnalyticsDaily"("day", "kind", "level");
