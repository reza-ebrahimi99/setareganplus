-- Institute website team CMS (org-scoped; not staff login accounts)

CREATE TABLE "team_departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "team_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "biography" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "portraitMediaId" TEXT,
    "slug" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredPriority" INTEGER NOT NULL DEFAULT 0,
    "unitKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_departments_organizationId_slug_key" ON "team_departments"("organizationId", "slug");
CREATE UNIQUE INDEX "team_departments_organizationId_id_key" ON "team_departments"("organizationId", "id");
CREATE INDEX "team_departments_organizationId_sortOrder_idx" ON "team_departments"("organizationId", "sortOrder");
CREATE INDEX "team_departments_organizationId_isActive_deletedAt_idx" ON "team_departments"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "team_members_organizationId_slug_key" ON "team_members"("organizationId", "slug");
CREATE UNIQUE INDEX "team_members_organizationId_id_key" ON "team_members"("organizationId", "id");
CREATE INDEX "team_members_organizationId_departmentId_displayOrder_idx" ON "team_members"("organizationId", "departmentId", "displayOrder");
CREATE INDEX "team_members_organizationId_isFeatured_featuredPriority_idx" ON "team_members"("organizationId", "isFeatured", "featuredPriority");
CREATE INDEX "team_members_organizationId_isActive_deletedAt_idx" ON "team_members"("organizationId", "isActive", "deletedAt");
CREATE INDEX "team_members_organizationId_unitKey_idx" ON "team_members"("organizationId", "unitKey");

ALTER TABLE "team_departments" ADD CONSTRAINT "team_departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organizationId_departmentId_fkey" FOREIGN KEY ("organizationId", "departmentId") REFERENCES "team_departments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_portraitMediaId_fkey" FOREIGN KEY ("portraitMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
