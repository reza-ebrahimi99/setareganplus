-- Phase 1: Kanoon/Qalamchi external student identifier (org-scoped, nullable).
-- PostgreSQL UNIQUE allows multiple NULLs, so empty identifiers do not collide.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "kanoonStudentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "students_organizationId_kanoonStudentId_key"
  ON "students"("organizationId", "kanoonStudentId");
