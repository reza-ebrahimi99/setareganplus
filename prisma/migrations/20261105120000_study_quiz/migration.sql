-- Study-style quiz campaign (additive only; safe on live DB)

CREATE TABLE IF NOT EXISTS "StudyQuizOtp" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "field" TEXT,
    "referral" TEXT,
    "ip" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyQuizOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyQuizLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "field" TEXT,
    "mobile" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "rewardCode" TEXT NOT NULL,
    "referral" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyQuizLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudyQuizOtp_mobile_createdAt_idx" ON "StudyQuizOtp"("mobile", "createdAt");
CREATE INDEX IF NOT EXISTS "StudyQuizOtp_expiresAt_idx" ON "StudyQuizOtp"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyQuizLead_mobile_key" ON "StudyQuizLead"("mobile");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyQuizLead_rewardCode_key" ON "StudyQuizLead"("rewardCode");
CREATE INDEX IF NOT EXISTS "StudyQuizLead_archetype_idx" ON "StudyQuizLead"("archetype");
CREATE INDEX IF NOT EXISTS "StudyQuizLead_grade_idx" ON "StudyQuizLead"("grade");
CREATE INDEX IF NOT EXISTS "StudyQuizLead_createdAt_idx" ON "StudyQuizLead"("createdAt");
CREATE INDEX IF NOT EXISTS "StudyQuizLead_contacted_idx" ON "StudyQuizLead"("contacted");
CREATE INDEX IF NOT EXISTS "StudyQuizLead_referral_idx" ON "StudyQuizLead"("referral");
