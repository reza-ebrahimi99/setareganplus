-- Institute student majors (org-scoped) + nullable Student.majorId

CREATE TABLE "student_majors" (
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

    CONSTRAINT "student_majors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_majors_organizationId_slug_key" ON "student_majors"("organizationId", "slug");
CREATE UNIQUE INDEX "student_majors_organizationId_id_key" ON "student_majors"("organizationId", "id");
CREATE INDEX "student_majors_organizationId_sortOrder_idx" ON "student_majors"("organizationId", "sortOrder");
CREATE INDEX "student_majors_organizationId_isActive_deletedAt_idx" ON "student_majors"("organizationId", "isActive", "deletedAt");

ALTER TABLE "student_majors" ADD CONSTRAINT "student_majors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students" ADD COLUMN "majorId" TEXT;

CREATE INDEX "students_organizationId_majorId_idx" ON "students"("organizationId", "majorId");

ALTER TABLE "students" ADD CONSTRAINT "students_organizationId_majorId_fkey" FOREIGN KEY ("organizationId", "majorId") REFERENCES "student_majors"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
