-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "form_versions" ADD COLUMN "posterMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");

-- CreateIndex
CREATE INDEX "media_assets_organizationId_deletedAt_idx" ON "media_assets"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "media_assets_organizationId_createdAt_idx" ON "media_assets"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "media_assets_createdByUserId_idx" ON "media_assets"("createdByUserId");

-- CreateIndex
CREATE INDEX "form_versions_posterMediaId_idx" ON "form_versions"("posterMediaId");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_posterMediaId_fkey" FOREIGN KEY ("posterMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
