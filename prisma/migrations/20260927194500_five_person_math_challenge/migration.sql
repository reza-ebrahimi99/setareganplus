-- CreateEnum
CREATE TYPE "ChallengeCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChallengeInvitationStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChallengeAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ChallengeCertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'CHALLENGE_LOGIN';

-- CreateTable
CREATE TABLE "challenge_campaigns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT 'چالش گروهی ستارگان',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "terms" TEXT,
    "status" "ChallengeCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "teamSize" INTEGER NOT NULL DEFAULT 5,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "examOpensAt" TIMESTAMP(3),
    "examClosesAt" TIMESTAMP(3),
    "scoringConfig" JSONB NOT NULL DEFAULT '{"correct":3,"wrong":-1,"unanswered":0}',
    "inviteSmsTemplate" TEXT NOT NULL DEFAULT '{{inviterName}} شما را به {{campaignTitle}} دعوت کرده است: {{inviteUrl}}',
    "completionSmsTemplate" TEXT NOT NULL DEFAULT 'نتیجه تیم شما در {{campaignTitle}} آماده شد: {{resultUrl}}',
    "certificateTitle" TEXT NOT NULL DEFAULT 'گواهی حضور در چالش ۵ نفره ریاضی',
    "certificateSubtitle" TEXT NOT NULL DEFAULT 'با افتخار به پاس تلاش و همراهی در این چالش اهدا می‌شود.',
    "certificateSignatory" TEXT NOT NULL DEFAULT 'مجموعه آموزشی ستارگان پلاس',
    "certificateRole" TEXT NOT NULL DEFAULT 'مدیریت آموزش',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "challenge_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 5,
    "lockedAt" TIMESTAMP(3),
    "resultUnlockedAt" TIMESTAMP(3),
    "teamScore" DOUBLE PRECISION,
    "averagePercentage" DOUBLE PRECISION,
    "totalCorrect" INTEGER,
    "totalWrong" INTEGER,
    "totalUnanswered" INTEGER,
    "scholarshipTierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "teamId" TEXT,
    "fullName" TEXT NOT NULL,
    "normalizedMobile" TEXT NOT NULL,
    "gradeKey" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "majorKey" TEXT,
    "majorLabel" TEXT,
    "school" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_invitations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "inviterParticipantId" TEXT NOT NULL,
    "acceptedParticipantId" TEXT,
    "inviteeName" TEXT NOT NULL,
    "normalizedMobile" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "ChallengeInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_exams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "audienceKey" TEXT NOT NULL,
    "gradeKey" TEXT NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "majorKey" TEXT,
    "majorLabel" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 20,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "questionLimit" INTEGER,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT true,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "challenge_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_questions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "explanation" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "negativePoints" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "challenge_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_choices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_attempts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "ChallengeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "questionOrder" JSONB NOT NULL DEFAULT '[]',
    "optionOrder" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "rawScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "correctCount" INTEGER,
    "wrongCount" INTEGER,
    "unansweredCount" INTEGER,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_answers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceId" TEXT,
    "isCorrect" BOOLEAN,
    "pointsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_scholarship_tiers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prizeLabel" TEXT NOT NULL,
    "minPercentage" DOUBLE PRECISION NOT NULL,
    "maxPercentage" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_scholarship_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "ChallengeCertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ch_campaign_org_status" ON "challenge_campaigns"("organizationId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "ch_campaign_org_deleted" ON "challenge_campaigns"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ch_campaign_org_slug" ON "challenge_campaigns"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ch_campaign_org_id" ON "challenge_campaigns"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_teams_inviteCode_key" ON "challenge_teams"("inviteCode");

-- CreateIndex
CREATE INDEX "ch_team_org_campaign" ON "challenge_teams"("organizationId", "campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ch_team_campaign_result" ON "challenge_teams"("campaignId", "resultUnlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ch_team_campaign_name" ON "challenge_teams"("campaignId", "name");

-- CreateIndex
CREATE INDEX "ch_participant_filters" ON "challenge_participants"("organizationId", "campaignId", "gradeKey", "majorKey");

-- CreateIndex
CREATE INDEX "ch_participant_team" ON "challenge_participants"("campaignId", "teamId");

-- CreateIndex
CREATE INDEX "ch_participant_lead" ON "challenge_participants"("leadId");

-- CreateIndex
CREATE INDEX "ch_participant_created" ON "challenge_participants"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ch_participant_campaign_user" ON "challenge_participants"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ch_participant_campaign_mobile" ON "challenge_participants"("campaignId", "normalizedMobile");

-- CreateIndex
CREATE UNIQUE INDEX "ch_participant_org_id" ON "challenge_participants"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_invitations_acceptedParticipantId_key" ON "challenge_invitations"("acceptedParticipantId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_invitations_tokenHash_key" ON "challenge_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "ch_invite_org_campaign_status" ON "challenge_invitations"("organizationId", "campaignId", "status");

-- CreateIndex
CREATE INDEX "ch_invite_mobile_status" ON "challenge_invitations"("normalizedMobile", "status");

-- CreateIndex
CREATE INDEX "ch_invite_expiry_status" ON "challenge_invitations"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ch_invite_team_mobile" ON "challenge_invitations"("teamId", "normalizedMobile");

-- CreateIndex
CREATE INDEX "ch_exam_org_campaign_pub" ON "challenge_exams"("organizationId", "campaignId", "isPublished");

-- CreateIndex
CREATE INDEX "ch_exam_grade_major" ON "challenge_exams"("campaignId", "gradeKey", "majorKey");

-- CreateIndex
CREATE UNIQUE INDEX "ch_exam_campaign_audience" ON "challenge_exams"("campaignId", "audienceKey");

-- CreateIndex
CREATE INDEX "ch_question_exam_order" ON "challenge_questions"("organizationId", "examId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ch_choice_question_order" ON "challenge_choices"("organizationId", "questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ch_attempt_org_campaign_status" ON "challenge_attempts"("organizationId", "campaignId", "status");

-- CreateIndex
CREATE INDEX "ch_attempt_part_status" ON "challenge_attempts"("participantId", "status");

-- CreateIndex
CREATE INDEX "ch_attempt_expiry_status" ON "challenge_attempts"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ch_attempt_part_exam_no" ON "challenge_attempts"("participantId", "examId", "attemptNumber");

-- CreateIndex
CREATE INDEX "ch_answer_org_attempt" ON "challenge_answers"("organizationId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ch_answer_attempt_question" ON "challenge_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "ch_tier_threshold" ON "challenge_scholarship_tiers"("organizationId", "campaignId", "isActive", "minPercentage");

-- CreateIndex
CREATE UNIQUE INDEX "ch_tier_campaign_title" ON "challenge_scholarship_tiers"("campaignId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_certificates_verificationCode_key" ON "challenge_certificates"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_certificates_serialNumber_key" ON "challenge_certificates"("serialNumber");

-- CreateIndex
CREATE INDEX "ch_cert_org_issued" ON "challenge_certificates"("organizationId", "issuedAt");

-- CreateIndex
CREATE INDEX "ch_cert_team" ON "challenge_certificates"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ch_cert_campaign_participant" ON "challenge_certificates"("campaignId", "participantId");

-- AddForeignKey
ALTER TABLE "challenge_campaigns" ADD CONSTRAINT "challenge_campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_teams" ADD CONSTRAINT "challenge_teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_teams" ADD CONSTRAINT "challenge_teams_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_teams" ADD CONSTRAINT "challenge_teams_scholarshipTierId_fkey" FOREIGN KEY ("scholarshipTierId") REFERENCES "challenge_scholarship_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_invitations" ADD CONSTRAINT "challenge_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_invitations" ADD CONSTRAINT "challenge_invitations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_invitations" ADD CONSTRAINT "challenge_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_invitations" ADD CONSTRAINT "challenge_invitations_inviterParticipantId_fkey" FOREIGN KEY ("inviterParticipantId") REFERENCES "challenge_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_invitations" ADD CONSTRAINT "challenge_invitations_acceptedParticipantId_fkey" FOREIGN KEY ("acceptedParticipantId") REFERENCES "challenge_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_exams" ADD CONSTRAINT "challenge_exams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_exams" ADD CONSTRAINT "challenge_exams_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_questions" ADD CONSTRAINT "challenge_questions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_questions" ADD CONSTRAINT "challenge_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "challenge_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_choices" ADD CONSTRAINT "challenge_choices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_choices" ADD CONSTRAINT "challenge_choices_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "challenge_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "challenge_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "challenge_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "challenge_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "challenge_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "challenge_choices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_scholarship_tiers" ADD CONSTRAINT "challenge_scholarship_tiers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_scholarship_tiers" ADD CONSTRAINT "challenge_scholarship_tiers_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_certificates" ADD CONSTRAINT "challenge_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_certificates" ADD CONSTRAINT "challenge_certificates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "challenge_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_certificates" ADD CONSTRAINT "challenge_certificates_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "challenge_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_certificates" ADD CONSTRAINT "challenge_certificates_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "challenge_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
