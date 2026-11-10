-- Video courses. Additive only: new tables, no changes to booklet, quiz, consult, or news tables.

CREATE TABLE IF NOT EXISTS "ClassCourse" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "intro" TEXT,
    "cover" TEXT,
    "teacher" TEXT NOT NULL DEFAULT 'مهندس رضا ابراهیمی',
    "grades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kind" TEXT NOT NULL DEFAULT 'TOPIC',
    "priceRials" INTEGER NOT NULL DEFAULT 0,
    "salePriceRials" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "bookletSlug" TEXT NOT NULL DEFAULT '',
    "suggestConsult" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "aparatHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationSec" INTEGER,
    "poster" TEXT,
    "freePreview" BOOLEAN NOT NULL DEFAULT false,
    "grades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassFile" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "mime" TEXT NOT NULL DEFAULT 'application/pdf',
    "courseId" TEXT,
    "lessonId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassStudent" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "field" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassOtp" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "field" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassPayment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountRials" INTEGER NOT NULL,
    "status" "PayStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "trackId" TEXT,
    "refNumber" TEXT,
    "cardNumber" TEXT,
    "result" INTEGER,
    "message" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "lastBeatAt" TIMESTAMP(3),
    "lastOpenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizChoice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuizChoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassPoint" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassPointLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassPointLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassBadge" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "courseId" TEXT NOT NULL DEFAULT '',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassCertificate" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassCertificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassPath" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "field" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ClassPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassPathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "ClassPathStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassThread" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassReply" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassReply_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassCourse_slug_key" ON "ClassCourse"("slug");
CREATE INDEX IF NOT EXISTS "ClassCourse_published_kind_sortOrder_idx" ON "ClassCourse"("published", "kind", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassLesson_aparatHash_key" ON "ClassLesson"("aparatHash");
CREATE INDEX IF NOT EXISTS "ClassLesson_courseId_sortOrder_idx" ON "ClassLesson"("courseId", "sortOrder");

CREATE INDEX IF NOT EXISTS "ClassFile_courseId_idx" ON "ClassFile"("courseId");
CREATE INDEX IF NOT EXISTS "ClassFile_lessonId_idx" ON "ClassFile"("lessonId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassStudent_mobile_key" ON "ClassStudent"("mobile");
CREATE INDEX IF NOT EXISTS "ClassStudent_grade_idx" ON "ClassStudent"("grade");

CREATE INDEX IF NOT EXISTS "ClassOtp_mobile_createdAt_idx" ON "ClassOtp"("mobile", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassOtp_expiresAt_idx" ON "ClassOtp"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassEnrollment_studentId_courseId_key" ON "ClassEnrollment"("studentId", "courseId");
CREATE INDEX IF NOT EXISTS "ClassEnrollment_courseId_idx" ON "ClassEnrollment"("courseId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassPayment_token_key" ON "ClassPayment"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassPayment_trackId_key" ON "ClassPayment"("trackId");
CREATE INDEX IF NOT EXISTS "ClassPayment_studentId_courseId_idx" ON "ClassPayment"("studentId", "courseId");
CREATE INDEX IF NOT EXISTS "ClassPayment_status_createdAt_idx" ON "ClassPayment"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassProgress_studentId_lessonId_key" ON "ClassProgress"("studentId", "lessonId");
CREATE INDEX IF NOT EXISTS "ClassProgress_lessonId_idx" ON "ClassProgress"("lessonId");
CREATE INDEX IF NOT EXISTS "ClassProgress_studentId_updatedAt_idx" ON "ClassProgress"("studentId", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "QuizQuestion_externalId_key" ON "QuizQuestion"("externalId");
CREATE INDEX IF NOT EXISTS "QuizQuestion_lessonId_sortOrder_idx" ON "QuizQuestion"("lessonId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuizChoice_questionId_sortOrder_idx" ON "QuizChoice"("questionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuizAttempt_studentId_lessonId_idx" ON "QuizAttempt"("studentId", "lessonId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassPoint_studentId_key_key" ON "ClassPoint"("studentId", "key");
CREATE INDEX IF NOT EXISTS "ClassPoint_studentId_idx" ON "ClassPoint"("studentId");
CREATE INDEX IF NOT EXISTS "ClassPointLog_createdAt_idx" ON "ClassPointLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ClassPointLog_studentId_createdAt_idx" ON "ClassPointLog"("studentId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassBadge_studentId_kind_courseId_key" ON "ClassBadge"("studentId", "kind", "courseId");
CREATE INDEX IF NOT EXISTS "ClassBadge_studentId_idx" ON "ClassBadge"("studentId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassCertificate_code_key" ON "ClassCertificate"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassCertificate_studentId_courseId_key" ON "ClassCertificate"("studentId", "courseId");

CREATE UNIQUE INDEX IF NOT EXISTS "ClassPath_grade_field_key" ON "ClassPath"("grade", "field");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassPathStep_pathId_courseId_key" ON "ClassPathStep"("pathId", "courseId");
CREATE INDEX IF NOT EXISTS "ClassPathStep_pathId_sortOrder_idx" ON "ClassPathStep"("pathId", "sortOrder");

CREATE INDEX IF NOT EXISTS "ClassThread_lessonId_status_idx" ON "ClassThread"("lessonId", "status");
CREATE INDEX IF NOT EXISTS "ClassThread_status_createdAt_idx" ON "ClassThread"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassReply_threadId_idx" ON "ClassReply"("threadId");

DO $$ BEGIN
  ALTER TABLE "ClassLesson" ADD CONSTRAINT "ClassLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassFile" ADD CONSTRAINT "ClassFile_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassFile" ADD CONSTRAINT "ClassFile_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPayment" ADD CONSTRAINT "ClassPayment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPayment" ADD CONSTRAINT "ClassPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassProgress" ADD CONSTRAINT "ClassProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassProgress" ADD CONSTRAINT "ClassProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizChoice" ADD CONSTRAINT "QuizChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPoint" ADD CONSTRAINT "ClassPoint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPointLog" ADD CONSTRAINT "ClassPointLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassBadge" ADD CONSTRAINT "ClassBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassCertificate" ADD CONSTRAINT "ClassCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassCertificate" ADD CONSTRAINT "ClassCertificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPathStep" ADD CONSTRAINT "ClassPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "ClassPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassPathStep" ADD CONSTRAINT "ClassPathStep_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ClassCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassThread" ADD CONSTRAINT "ClassThread_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassThread" ADD CONSTRAINT "ClassThread_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassReply" ADD CONSTRAINT "ClassReply_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ClassThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassProgress" ADD CONSTRAINT "ClassProgress_seconds_check" CHECK ("secondsWatched" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassCourse" ADD CONSTRAINT "ClassCourse_price_check" CHECK ("priceRials" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassCourse" ADD CONSTRAINT "ClassCourse_kind_check" CHECK ("kind" IN ('TOPIC', 'GRADE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ClassThread" ADD CONSTRAINT "ClassThread_status_check" CHECK ("status" IN ('PENDING', 'PUBLISHED', 'HIDDEN'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
