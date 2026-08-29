-- Student / Parent Portal foundation

CREATE TYPE "GuardianRelationshipType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');
CREATE TYPE "PortalAccountType" AS ENUM ('STUDENT', 'GUARDIAN');

CREATE TABLE "student_guardians" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "mobile" TEXT NOT NULL,
    "normalizedMobile" TEXT NOT NULL,
    "relationshipType" "GuardianRelationshipType" NOT NULL DEFAULT 'GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_guardian_relations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationshipType" "GuardianRelationshipType" NOT NULL DEFAULT 'GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canViewAcademicData" BOOLEAN NOT NULL DEFAULT true,
    "canViewAchievements" BOOLEAN NOT NULL DEFAULT true,
    "canViewCertificates" BOOLEAN NOT NULL DEFAULT true,
    "canReceiveNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "student_guardian_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portal_account_links" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "guardianId" TEXT,
    "accountType" "PortalAccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "portal_account_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_guardians_organizationId_id_key" ON "student_guardians"("organizationId", "id");
CREATE UNIQUE INDEX "student_guardians_organizationId_normalizedMobile_key" ON "student_guardians"("organizationId", "normalizedMobile");
CREATE INDEX "student_guardians_organizationId_fullName_idx" ON "student_guardians"("organizationId", "fullName");
CREATE INDEX "student_guardians_organizationId_isActive_deletedAt_idx" ON "student_guardians"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "student_guardian_relations_organizationId_studentId_guardianId_key" ON "student_guardian_relations"("organizationId", "studentId", "guardianId");
CREATE UNIQUE INDEX "student_guardian_relations_organizationId_id_key" ON "student_guardian_relations"("organizationId", "id");
CREATE INDEX "student_guardian_relations_organizationId_guardianId_deletedAt_idx" ON "student_guardian_relations"("organizationId", "guardianId", "deletedAt");
CREATE INDEX "student_guardian_relations_organizationId_studentId_deletedAt_idx" ON "student_guardian_relations"("organizationId", "studentId", "deletedAt");

CREATE UNIQUE INDEX "portal_account_links_organizationId_id_key" ON "portal_account_links"("organizationId", "id");
CREATE INDEX "portal_account_links_organizationId_userId_deletedAt_isActive_idx" ON "portal_account_links"("organizationId", "userId", "deletedAt", "isActive");
CREATE INDEX "portal_account_links_userId_deletedAt_isActive_idx" ON "portal_account_links"("userId", "deletedAt", "isActive");
CREATE INDEX "portal_account_links_studentId_idx" ON "portal_account_links"("studentId");
CREATE INDEX "portal_account_links_guardianId_idx" ON "portal_account_links"("guardianId");

-- XOR: exactly one of studentId / guardianId, matching accountType
ALTER TABLE "portal_account_links"
ADD CONSTRAINT "portal_account_links_xor_target_check"
CHECK (
  ("accountType" = 'STUDENT' AND "studentId" IS NOT NULL AND "guardianId" IS NULL)
  OR
  ("accountType" = 'GUARDIAN' AND "guardianId" IS NOT NULL AND "studentId" IS NULL)
);

-- One live student link per user+student; one live guardian link per user+guardian
CREATE UNIQUE INDEX "portal_account_links_live_student_key"
ON "portal_account_links" ("organizationId", "userId", "studentId")
WHERE "deletedAt" IS NULL AND "studentId" IS NOT NULL;

CREATE UNIQUE INDEX "portal_account_links_live_guardian_key"
ON "portal_account_links" ("organizationId", "userId", "guardianId")
WHERE "deletedAt" IS NULL AND "guardianId" IS NOT NULL;

ALTER TABLE "student_guardians"
ADD CONSTRAINT "student_guardians_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_guardian_relations"
ADD CONSTRAINT "student_guardian_relations_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_guardian_relations"
ADD CONSTRAINT "student_guardian_relations_organizationId_studentId_fkey"
FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_guardian_relations"
ADD CONSTRAINT "student_guardian_relations_organizationId_guardianId_fkey"
FOREIGN KEY ("organizationId", "guardianId") REFERENCES "student_guardians"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portal_account_links"
ADD CONSTRAINT "portal_account_links_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portal_account_links"
ADD CONSTRAINT "portal_account_links_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portal_account_links"
ADD CONSTRAINT "portal_account_links_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "portal_account_links"
ADD CONSTRAINT "portal_account_links_guardianId_fkey"
FOREIGN KEY ("guardianId") REFERENCES "student_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
