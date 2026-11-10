-- Question bank mirror and chapter mapping. Additive. QuizAttempt.lessonId becomes optional so practice attempts can belong to a course.

ALTER TABLE "QuizAttempt" ALTER COLUMN "lessonId" DROP NOT NULL;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "courseId" TEXT;

CREATE TABLE IF NOT EXISTS "BankQuestion" (
    "externalId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "chapters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prompt" TEXT NOT NULL,
    "solution" TEXT,
    "sourceLabel" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT,
    "solutionPaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("externalId")
);

CREATE TABLE IF NOT EXISTS "BankOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BankOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassChapter" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    CONSTRAINT "ClassChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BankSync" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "sinceId" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankSync_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankQuestion_field_difficulty_idx" ON "BankQuestion"("field", "difficulty");
CREATE INDEX IF NOT EXISTS "BankQuestion_active_idx" ON "BankQuestion"("active");
CREATE INDEX IF NOT EXISTS "BankQuestion_chapters_idx" ON "BankQuestion" USING GIN ("chapters");
CREATE INDEX IF NOT EXISTS "BankOption_questionId_sortOrder_idx" ON "BankOption"("questionId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassChapter_courseId_lessonId_code_key" ON "ClassChapter"("courseId", "lessonId", "code");
CREATE INDEX IF NOT EXISTS "ClassChapter_courseId_lessonId_idx" ON "ClassChapter"("courseId", "lessonId");
CREATE INDEX IF NOT EXISTS "QuizAttempt_studentId_courseId_idx" ON "QuizAttempt"("studentId", "courseId");

DO $$ BEGIN
  ALTER TABLE "BankOption" ADD CONSTRAINT "BankOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BankQuestion"("externalId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassChapter" ADD CONSTRAINT "ClassChapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
