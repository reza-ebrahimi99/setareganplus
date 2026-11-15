-- Math journey (سفر ستاره‌ها). Additive only.

CREATE TABLE IF NOT EXISTS "JourneySkill" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taughtGrade" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "prereqSlug" TEXT,
    "courseSlug" TEXT,
    "fields" TEXT NOT NULL DEFAULT 'all',
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "JourneySkill_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE IF NOT EXISTS "JourneyQuestion" (
    "id" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "explain" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "JourneyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JourneyOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "misconception" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "JourneyOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JourneyRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "parentMobile" TEXT NOT NULL DEFAULT '',
    "grade" INTEGER NOT NULL,
    "field" TEXT NOT NULL DEFAULT '',
    "school" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "followUp" TEXT NOT NULL DEFAULT 'NEW',
    "state" JSONB NOT NULL,
    "fresh" BOOLEAN NOT NULL DEFAULT true,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "JourneyRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JourneyAnswer" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "optionId" TEXT NOT NULL DEFAULT '',
    "correct" BOOLEAN NOT NULL,
    "unknown" BOOLEAN NOT NULL DEFAULT false,
    "misconception" TEXT NOT NULL DEFAULT '',
    "drill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JourneyAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JourneyQuestion_skillSlug_sortOrder_idx" ON "JourneyQuestion"("skillSlug", "sortOrder");
CREATE INDEX IF NOT EXISTS "JourneyOption_questionId_sortOrder_idx" ON "JourneyOption"("questionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "JourneyRun_mobile_status_idx" ON "JourneyRun"("mobile", "status");
CREATE INDEX IF NOT EXISTS "JourneyRun_status_followUp_fresh_idx" ON "JourneyRun"("status", "followUp", "fresh");
CREATE INDEX IF NOT EXISTS "JourneyRun_finishedAt_idx" ON "JourneyRun"("finishedAt");
CREATE INDEX IF NOT EXISTS "JourneyAnswer_runId_idx" ON "JourneyAnswer"("runId");
CREATE INDEX IF NOT EXISTS "JourneyAnswer_skillSlug_correct_idx" ON "JourneyAnswer"("skillSlug", "correct");

DO $$ BEGIN
  ALTER TABLE "JourneyQuestion" ADD CONSTRAINT "JourneyQuestion_skillSlug_fkey" FOREIGN KEY ("skillSlug") REFERENCES "JourneySkill"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JourneyOption" ADD CONSTRAINT "JourneyOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "JourneyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JourneyAnswer" ADD CONSTRAINT "JourneyAnswer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "JourneyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
