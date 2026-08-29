-- Sprint 3 — KPI Computation Engine cache (additive).

CREATE TABLE "kpi_computation_caches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_computation_caches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kpi_computation_caches_organizationId_cacheKey_key"
  ON "kpi_computation_caches"("organizationId", "cacheKey");

CREATE INDEX "kpi_computation_caches_organizationId_expiresAt_idx"
  ON "kpi_computation_caches"("organizationId", "expiresAt");

ALTER TABLE "kpi_computation_caches"
  ADD CONSTRAINT "kpi_computation_caches_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
