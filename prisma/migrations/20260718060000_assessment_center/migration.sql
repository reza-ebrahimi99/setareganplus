-- Assessment Center (آزمون) — multi-provider exam results

CREATE TYPE "AssessmentType" AS ENUM ('QALAMCHI', 'SCHOOL_EXAM', 'MIDTERM', 'FINAL', 'OLYMPIAD', 'ENTRANCE', 'OTHER');

CREATE TABLE "assessment_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "assessment_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "assessmentType" "AssessmentType" NOT NULL DEFAULT 'OTHER',
    "assessmentDate" TIMESTAMP(3),
    "schoolYear" TEXT,
    "participants" INTEGER,
    "maxScore" DOUBLE PRECISION,
    "description" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "scaledScore" DOUBLE PRECISION,
    "rankSchool" INTEGER,
    "rankCity" INTEGER,
    "rankProvince" INTEGER,
    "rankCountry" INTEGER,
    "percentile" DOUBLE PRECISION,
    "growth" DOUBLE PRECISION,
    "averageClass" DOUBLE PRECISION,
    "averageGrade" DOUBLE PRECISION,
    "notes" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_subject_results" (
    "id" TEXT NOT NULL,
    "assessmentResultId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION,
    "correctAnswers" INTEGER,
    "wrongAnswers" INTEGER,
    "blankAnswers" INTEGER,
    "timeSpent" INTEGER,
    CONSTRAINT "assessment_subject_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_providers_organizationId_slug_key" ON "assessment_providers"("organizationId", "slug");
CREATE UNIQUE INDEX "assessment_providers_organizationId_id_key" ON "assessment_providers"("organizationId", "id");
CREATE INDEX "assessment_providers_organizationId_displayOrder_idx" ON "assessment_providers"("organizationId", "displayOrder");
CREATE INDEX "assessment_providers_organizationId_isActive_deletedAt_idx" ON "assessment_providers"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "subjects_organizationId_slug_key" ON "subjects"("organizationId", "slug");
CREATE UNIQUE INDEX "subjects_organizationId_id_key" ON "subjects"("organizationId", "id");
CREATE INDEX "subjects_organizationId_displayOrder_idx" ON "subjects"("organizationId", "displayOrder");
CREATE INDEX "subjects_organizationId_isActive_deletedAt_idx" ON "subjects"("organizationId", "isActive", "deletedAt");

CREATE UNIQUE INDEX "assessments_organizationId_slug_key" ON "assessments"("organizationId", "slug");
CREATE UNIQUE INDEX "assessments_organizationId_id_key" ON "assessments"("organizationId", "id");
CREATE INDEX "assessments_organizationId_providerId_assessmentDate_idx" ON "assessments"("organizationId", "providerId", "assessmentDate");
CREATE INDEX "assessments_organizationId_gradeId_assessmentDate_idx" ON "assessments"("organizationId", "gradeId", "assessmentDate");
CREATE INDEX "assessments_organizationId_assessmentType_idx" ON "assessments"("organizationId", "assessmentType");
CREATE INDEX "assessments_organizationId_schoolYear_idx" ON "assessments"("organizationId", "schoolYear");
CREATE INDEX "assessments_organizationId_isPublished_deletedAt_idx" ON "assessments"("organizationId", "isPublished", "deletedAt");
CREATE INDEX "assessments_organizationId_isPublished_archivedAt_deletedAt_assessmentDate_idx" ON "assessments"("organizationId", "isPublished", "archivedAt", "deletedAt", "assessmentDate");

CREATE UNIQUE INDEX "assessment_results_organizationId_studentId_assessmentId_key" ON "assessment_results"("organizationId", "studentId", "assessmentId");
CREATE UNIQUE INDEX "assessment_results_organizationId_id_key" ON "assessment_results"("organizationId", "id");
CREATE INDEX "assessment_results_organizationId_assessmentId_score_idx" ON "assessment_results"("organizationId", "assessmentId", "score");
CREATE INDEX "assessment_results_organizationId_studentId_createdAt_idx" ON "assessment_results"("organizationId", "studentId", "createdAt");
CREATE INDEX "assessment_results_organizationId_isFeatured_deletedAt_idx" ON "assessment_results"("organizationId", "isFeatured", "deletedAt");

CREATE UNIQUE INDEX "assessment_subject_results_assessmentResultId_subjectId_key" ON "assessment_subject_results"("assessmentResultId", "subjectId");
CREATE INDEX "assessment_subject_results_subjectId_idx" ON "assessment_subject_results"("subjectId");

ALTER TABLE "assessment_providers" ADD CONSTRAINT "assessment_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_providerId_fkey" FOREIGN KEY ("organizationId", "providerId") REFERENCES "assessment_providers"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_gradeId_fkey" FOREIGN KEY ("organizationId", "gradeId") REFERENCES "student_grades"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_organizationId_studentId_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_organizationId_assessmentId_fkey" FOREIGN KEY ("organizationId", "assessmentId") REFERENCES "assessments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_subject_results" ADD CONSTRAINT "assessment_subject_results_assessmentResultId_fkey" FOREIGN KEY ("assessmentResultId") REFERENCES "assessment_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_subject_results" ADD CONSTRAINT "assessment_subject_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
