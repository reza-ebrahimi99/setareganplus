-- Institute website Student CMS (org-scoped; public student profiles)

CREATE TABLE "student_grades" (
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

    CONSTRAINT "student_grades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "biography" TEXT NOT NULL DEFAULT '',
    "parentName" TEXT,
    "schoolYear" TEXT,
    "portraitMediaId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredPriority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_grades_organizationId_slug_key" ON "student_grades"("organizationId", "slug");
CREATE UNIQUE INDEX "student_grades_organizationId_id_key" ON "student_grades"("organizationId", "id");
CREATE INDEX "student_grades_organizationId_sortOrder_idx" ON "student_grades"("organizationId", "sortOrder");
CREATE INDEX "student_grades_organizationId_isActive_deletedAt_idx" ON "student_grades"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "students_organizationId_slug_key" ON "students"("organizationId", "slug");
CREATE UNIQUE INDEX "students_organizationId_id_key" ON "students"("organizationId", "id");
CREATE INDEX "students_organizationId_gradeId_displayOrder_idx" ON "students"("organizationId", "gradeId", "displayOrder");
CREATE INDEX "students_organizationId_isFeatured_featuredPriority_idx" ON "students"("organizationId", "isFeatured", "featuredPriority");
CREATE INDEX "students_organizationId_isActive_deletedAt_idx" ON "students"("organizationId", "isActive", "deletedAt");
CREATE INDEX "students_organizationId_isActive_archivedAt_deletedAt_displayOrder_idx" ON "students"("organizationId", "isActive", "archivedAt", "deletedAt", "displayOrder");

ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students" ADD CONSTRAINT "students_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students" ADD CONSTRAINT "students_organizationId_gradeId_fkey" FOREIGN KEY ("organizationId", "gradeId") REFERENCES "student_grades"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students" ADD CONSTRAINT "students_portraitMediaId_fkey" FOREIGN KEY ("portraitMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
