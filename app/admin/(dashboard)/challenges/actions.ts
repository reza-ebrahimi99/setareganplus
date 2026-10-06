"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ChallengeCampaignStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { audienceKey, validateChallengeAudience } from "@/lib/challenge/constants";
import { parseTehranDateTimeLocal } from "@/lib/forms/tehran-datetime";
import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";
import {
  generateLibraryStorageKey,
  processLibraryImageUpload,
  publicLibraryUrl,
} from "@/lib/media/library-image";
import { writeMediaFile } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { persianPrismaError } from "@/lib/prisma/user-facing-error";

export type ChallengeAdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const actionError = (message: string): ChallengeAdminActionState => ({
  status: "error",
  message,
});

const actionSuccess = (message: string): ChallengeAdminActionState => ({
  status: "success",
  message,
});

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function boundedInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function boundedFloat(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function optionalDate(value: string): Date | null {
  if (!value) return null;
  return parseTehranDateTimeLocal(value);
}

function optionalPublicImageUrl(value: string): string | null | undefined {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function resolveQuestionImage(
  formData: FormData,
): Promise<{ ok: true; imageUrl: string | null } | { ok: false; error: string }> {
  const directUrl = optionalPublicImageUrl(field(formData, "imageUrl"));
  if (directUrl === undefined) {
    return { ok: false, error: "آدرس تصویر معتبر نیست." };
  }

  const fileValue = formData.get("questionImage");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (!file) return { ok: true, imageUrl: directUrl };

  const processed = await processLibraryImageUpload(file);
  if (!processed.ok) return { ok: false, error: processed.error };

  try {
    const storageKey = generateLibraryStorageKey(processed.extension);
    await writeMediaFile({ storageKey, data: processed.buffer });
    const mediaPath = publicLibraryUrl(storageKey);
    return {
      ok: true,
      imageUrl: mediaPath.startsWith("/") ? `${PUBLIC_SITE_ORIGIN}${mediaPath}` : mediaPath,
    };
  } catch {
    return { ok: false, error: "ذخیره تصویر سؤال انجام نشد. دوباره تلاش کنید." };
  }
}

function normalizeSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || `challenge-${Date.now()}`;
}

function campaignStatus(value: string): ChallengeCampaignStatus {
  return Object.values(ChallengeCampaignStatus).includes(value as ChallengeCampaignStatus)
    ? (value as ChallengeCampaignStatus)
    : ChallengeCampaignStatus.DRAFT;
}

export async function createChallengeCampaignAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const title = field(formData, "title");
  if (title.length < 3) return actionError("عنوان کمپین الزامی است.");
  const slug = normalizeSlug(field(formData, "slug"));
  const duplicate = await prisma.challengeCampaign.findFirst({
    where: {
      organizationId: session.organization.id,
      slug,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (duplicate) {
    return actionError(`شناسه «${slug}» قبلاً استفاده شده است؛ یک شناسه انگلیسی دیگر وارد کنید.`);
  }

  let campaign: { id: string };
  try {
    campaign = await prisma.challengeCampaign.create({
      data: {
        organizationId: session.organization.id,
        title,
        slug,
        eyebrow: field(formData, "eyebrow") || "چالش گروهی ستارگان",
        summary:
          field(formData, "summary") ||
          "چهار دوستت را دعوت کن، آزمون را بدهید و نتیجه تیم را با هم باز کنید.",
        description: field(formData, "description") || title,
        teamSize: 5,
        status: ChallengeCampaignStatus.DRAFT,
      },
      select: { id: true },
    });
  } catch (error) {
    return actionError(
      persianPrismaError(error, "ساخت کمپین انجام نشد. لطفاً دوباره تلاش کنید."),
    );
  }
  revalidatePath("/admin/challenges");
  redirect(`/admin/challenges/${campaign.id}`);
}

export async function updateChallengeCampaignAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const status = campaignStatus(field(formData, "status"));
  const existing = await prisma.challengeCampaign.findFirst({
    where: { id: campaignId, organizationId: session.organization.id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return actionError("کمپین پیدا نشد.");

  const title = field(formData, "title");
  const summary = field(formData, "summary");
  const description = field(formData, "description");
  const inviteSmsTemplate = field(formData, "inviteSmsTemplate");
  const completionSmsTemplate = field(formData, "completionSmsTemplate");
  const certificateTitle = field(formData, "certificateTitle");
  const certificateSubtitle = field(formData, "certificateSubtitle");
  const certificateSignatory = field(formData, "certificateSignatory");
  const certificateRole = field(formData, "certificateRole");
  if (
    title.length < 3 ||
    summary.length < 10 ||
    description.length < 10 ||
    !inviteSmsTemplate.includes("{{inviteUrl}}") ||
    !completionSmsTemplate.includes("{{resultUrl}}") ||
    !certificateTitle ||
    !certificateSubtitle ||
    !certificateSignatory ||
    !certificateRole
  ) {
    return actionError("تنظیمات کمپین کامل یا معتبر نیست.");
  }
  const startsAtRaw = field(formData, "startsAt");
  const endsAtRaw = field(formData, "endsAt");
  const examOpensAtRaw = field(formData, "examOpensAt");
  const examClosesAtRaw = field(formData, "examClosesAt");
  const startsAt = optionalDate(startsAtRaw);
  const endsAt = optionalDate(endsAtRaw);
  const examOpensAt = optionalDate(examOpensAtRaw);
  const examClosesAt = optionalDate(examClosesAtRaw);
  if (
    (startsAtRaw && !startsAt) ||
    (endsAtRaw && !endsAt) ||
    (examOpensAtRaw && !examOpensAt) ||
    (examClosesAtRaw && !examClosesAt)
  ) {
    return actionError("تاریخ یا ساعت واردشده معتبر نیست.");
  }
  if ((startsAt && endsAt && startsAt >= endsAt) || (examOpensAt && examClosesAt && examOpensAt >= examClosesAt)) {
    return actionError("بازه زمانی شروع و پایان معتبر نیست.");
  }

  const data = {
    title,
    eyebrow: field(formData, "eyebrow") || "چالش گروهی ستارگان",
    summary,
    description,
    terms: field(formData, "terms") || null,
    status,
    teamSize: boundedInt(field(formData, "teamSize"), 5, 2, 20),
    startsAt,
    endsAt,
    examOpensAt,
    examClosesAt,
    scoringConfig: {
      correct: boundedFloat(field(formData, "scoreCorrect"), 3, 0.01, 100),
      wrong: boundedFloat(field(formData, "scoreWrong"), -1, -100, 0),
      unanswered: boundedFloat(field(formData, "scoreUnanswered"), 0, -100, 0),
    },
    inviteSmsTemplate,
    completionSmsTemplate,
    certificateTitle,
    certificateSubtitle,
    certificateSignatory,
    certificateRole,
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (status === ChallengeCampaignStatus.ACTIVE) {
        await tx.challengeCampaign.updateMany({
          where: {
            organizationId: session.organization.id,
            status: ChallengeCampaignStatus.ACTIVE,
            id: { not: campaignId },
            deletedAt: null,
          },
          data: { status: ChallengeCampaignStatus.PAUSED },
        });
      }
      await tx.challengeCampaign.update({ where: { id: campaignId }, data });
    });
  } catch (error) {
    return actionError(
      persianPrismaError(error, "ذخیره تنظیمات انجام نشد. لطفاً دوباره تلاش کنید."),
    );
  }
  revalidatePath("/admin/challenges");
  revalidatePath(`/admin/challenges/${campaignId}`);
  revalidatePath("/challenge");
  return actionSuccess("تنظیمات کمپین با موفقیت ذخیره شد.");
}

export async function createChallengeExamAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const campaign = await prisma.challengeCampaign.findFirst({
    where: { id: campaignId, organizationId: session.organization.id, deletedAt: null },
    select: { id: true },
  });
  if (!campaign) return actionError("کمپین پیدا نشد.");
  const audience = validateChallengeAudience(field(formData, "gradeKey"), field(formData, "majorKey"));
  if (!audience.ok) return actionError(audience.error);
  const title = field(formData, "title") || `آزمون ریاضی ${audience.gradeLabel}`;
  if (title.length < 3 || title.length > 160) return actionError("عنوان آزمون معتبر نیست.");
  let exam: { id: string };
  try {
    exam = await prisma.challengeExam.create({
      data: {
        organizationId: session.organization.id,
        campaignId,
        audienceKey: audienceKey(audience.gradeKey, audience.majorKey),
        gradeKey: audience.gradeKey,
        gradeLabel: audience.gradeLabel,
        majorKey: audience.majorKey,
        majorLabel: audience.majorLabel,
        title,
        instructions: field(formData, "instructions") || null,
        durationMinutes: boundedInt(field(formData, "durationMinutes"), 20, 5, 180),
        maxAttempts: boundedInt(field(formData, "maxAttempts"), 1, 1, 5),
        questionLimit: boundedInt(field(formData, "questionLimit"), 10, 1, 200),
        randomizeQuestions: field(formData, "randomizeQuestions") === "on",
        randomizeOptions: field(formData, "randomizeOptions") === "on",
      },
      select: { id: true },
    });
  } catch (error) {
    return actionError(
      persianPrismaError(
        error,
        "ساخت آزمون انجام نشد. احتمالاً برای این پایه و رشته قبلاً آزمون ساخته شده است.",
      ),
    );
  }
  revalidatePath(`/admin/challenges/${campaignId}`);
  redirect(`/admin/challenges/${campaignId}/exams/${exam.id}`);
}

export async function createChallengeQuestionAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const examId = field(formData, "examId");
  const exam = await prisma.challengeExam.findFirst({
    where: {
      id: examId,
      campaignId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true, _count: { select: { questions: true, attempts: true } } },
  });
  if (!exam) return actionError("آزمون پیدا نشد.");
  if (exam._count.attempts > 0) {
    return actionError("بعد از شروع آزمون توسط دانش‌آموزان، افزودن سؤال جدید مجاز نیست.");
  }
  const prompt = field(formData, "prompt");
  const rawChoices = ["choice0", "choice1", "choice2", "choice3"].map((key) =>
    field(formData, key),
  );
  const correctIndex = boundedInt(field(formData, "correctIndex"), 0, 0, 3);
  const image = await resolveQuestionImage(formData);
  if (!image.ok) return actionError(image.error);
  if (
    (!prompt && !image.imageUrl) ||
    !rawChoices[0] ||
    !rawChoices[1] ||
    !rawChoices[correctIndex]
  ) {
    return actionError("متن یا تصویر سؤال، حداقل دو گزینه و پاسخ درست الزامی است.");
  }
  const choices = rawChoices
    .map((label, originalIndex) => ({ label, originalIndex }))
    .filter((choice) => Boolean(choice.label));

  try {
    await prisma.challengeQuestion.create({
      data: {
        organizationId: session.organization.id,
        examId,
        prompt,
        imageUrl: image.imageUrl,
        explanation: field(formData, "explanation") || null,
        sortOrder: exam._count.questions + 1,
        choices: {
          create: choices.map(({ label, originalIndex }, index) => ({
            organizationId: session.organization.id,
            label,
            isCorrect: originalIndex === correctIndex,
            sortOrder: index + 1,
          })),
        },
      },
    });
  } catch (error) {
    return actionError(
      persianPrismaError(error, "ثبت سؤال انجام نشد. لطفاً دوباره تلاش کنید."),
    );
  }
  revalidatePath(`/admin/challenges/${campaignId}/exams/${examId}`);
  return actionSuccess("سؤال با موفقیت ثبت شد.");
}

export async function updateChallengeQuestionAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const examId = field(formData, "examId");
  const questionId = field(formData, "questionId");
  const question = await prisma.challengeQuestion.findFirst({
    where: {
      id: questionId,
      examId,
      organizationId: session.organization.id,
      deletedAt: null,
      exam: { campaignId, deletedAt: null },
    },
    select: {
      id: true,
      exam: { select: { _count: { select: { attempts: true } } } },
    },
  });
  if (!question) return actionError("سؤال پیدا نشد.");
  if (question.exam._count.attempts > 0) {
    return actionError("بعد از شروع آزمون توسط دانش‌آموزان، ویرایش سؤال مجاز نیست.");
  }

  const prompt = field(formData, "prompt");
  const rawChoices = ["choice0", "choice1", "choice2", "choice3"].map((key) =>
    field(formData, key),
  );
  const correctIndex = boundedInt(field(formData, "correctIndex"), 0, 0, 3);
  const image = await resolveQuestionImage(formData);
  if (!image.ok) return actionError(image.error);
  if (
    (!prompt && !image.imageUrl) ||
    !rawChoices[0] ||
    !rawChoices[1] ||
    !rawChoices[correctIndex]
  ) {
    return actionError("متن یا تصویر سؤال، حداقل دو گزینه و پاسخ درست الزامی است.");
  }
  const choices = rawChoices
    .map((label, originalIndex) => ({ label, originalIndex }))
    .filter((choice) => Boolean(choice.label));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.challengeChoice.deleteMany({ where: { questionId } });
      await tx.challengeQuestion.update({
        where: { id: questionId },
        data: {
          prompt,
          imageUrl: image.imageUrl,
          explanation: field(formData, "explanation") || null,
          choices: {
            create: choices.map(({ label, originalIndex }, index) => ({
              organizationId: session.organization.id,
              label,
              isCorrect: originalIndex === correctIndex,
              sortOrder: index + 1,
            })),
          },
        },
      });
    });
  } catch (error) {
    return actionError(
      persianPrismaError(error, "ویرایش سؤال انجام نشد. لطفاً دوباره تلاش کنید."),
    );
  }
  revalidatePath(`/admin/challenges/${campaignId}/exams/${examId}`);
  return actionSuccess("تغییرات سؤال ذخیره شد.");
}

export async function toggleChallengeExamPublicationAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const examId = field(formData, "examId");
  const exam = await prisma.challengeExam.findFirst({
    where: { id: examId, campaignId, organizationId: session.organization.id, deletedAt: null },
    include: {
      campaign: { select: { teamSize: true } },
      questions: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, choices: { select: { isCorrect: true } } },
      },
    },
  });
  if (!exam) return actionError("آزمون پیدا نشد.");
  const publish = field(formData, "publish") === "true";
  const questionsPerMember = exam.questionLimit ?? 10;
  const requiredBankSize = questionsPerMember * exam.campaign.teamSize;
  if (
    publish &&
    (exam.questions.length === 0 ||
      exam.questions.some(
        (question) =>
          question.choices.length < 2 ||
          question.choices.filter((choice) => choice.isCorrect).length !== 1,
      ))
  ) {
    return actionError("برای انتشار، همه سؤال‌ها باید حداقل دو گزینه و دقیقاً یک پاسخ درست داشته باشند.");
  }
  if (publish && exam.questions.length < requiredBankSize) {
    return actionError(
      `برای ${exam.campaign.teamSize.toLocaleString("fa-IR")} عضو و ${questionsPerMember.toLocaleString("fa-IR")} سؤال متفاوت، بانک باید حداقل ${requiredBankSize.toLocaleString("fa-IR")} سؤال معتبر داشته باشد.`,
    );
  }
  try {
    await prisma.challengeExam.update({
      where: { id: examId },
      data: {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
    });
  } catch (error) {
    return actionError(
      persianPrismaError(error, "تغییر وضعیت انتشار آزمون انجام نشد."),
    );
  }
  revalidatePath(`/admin/challenges/${campaignId}`);
  revalidatePath(`/admin/challenges/${campaignId}/exams/${examId}`);
  return actionSuccess(publish ? "آزمون منتشر شد." : "انتشار آزمون متوقف شد.");
}

export async function archiveChallengeQuestionAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const examId = field(formData, "examId");
  const questionId = field(formData, "questionId");
  const question = await prisma.challengeQuestion.findFirst({
    where: {
      id: questionId,
      examId,
      organizationId: session.organization.id,
      deletedAt: null,
      exam: { campaignId, deletedAt: null },
    },
    select: { id: true, exam: { select: { _count: { select: { attempts: true } } } } },
  });
  if (!question) return actionError("سؤال پیدا نشد.");
  if (question.exam._count.attempts > 0) {
    return actionError("بعد از شروع آزمون توسط دانش‌آموزان، حذف سؤال مجاز نیست.");
  }
  try {
    const result = await prisma.challengeQuestion.updateMany({
      where: {
        id: questionId,
        examId,
        organizationId: session.organization.id,
        exam: { campaignId },
      },
      data: { isActive: false, deletedAt: new Date() },
    });
    if (result.count !== 1) return actionError("سؤال پیدا نشد.");
  } catch (error) {
    return actionError(persianPrismaError(error, "حذف سؤال انجام نشد."));
  }
  revalidatePath(`/admin/challenges/${campaignId}/exams/${examId}`);
  return actionSuccess("سؤال حذف شد.");
}

export async function createChallengeTierAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const campaign = await prisma.challengeCampaign.findFirst({
    where: { id: campaignId, organizationId: session.organization.id, deletedAt: null },
    select: { id: true },
  });
  if (!campaign) return actionError("کمپین پیدا نشد.");
  const title = field(formData, "title");
  const prizeLabel = field(formData, "prizeLabel");
  const minPercentage = boundedFloat(field(formData, "minPercentage"), 0, 0, 100);
  const maxPercentage = field(formData, "maxPercentage")
    ? boundedFloat(field(formData, "maxPercentage"), 100, 0, 100)
    : null;
  if (title.length < 2 || prizeLabel.length < 2 || (maxPercentage !== null && maxPercentage < minPercentage)) {
    return actionError("بازه و عنوان سطح بورسیه معتبر نیست.");
  }
  try {
    await prisma.challengeScholarshipTier.create({
      data: {
        organizationId: session.organization.id,
        campaignId,
        title,
        prizeLabel,
        description: field(formData, "description") || null,
        minPercentage,
        maxPercentage,
        sortOrder: boundedInt(field(formData, "sortOrder"), 0, 0, 999),
      },
    });
  } catch (error) {
    return actionError(persianPrismaError(error, "افزودن سطح جایزه انجام نشد."));
  }
  revalidatePath(`/admin/challenges/${campaignId}`);
  return actionSuccess("سطح جایزه اضافه شد.");
}

export async function updateChallengeTierAction(
  _prev: ChallengeAdminActionState,
  formData: FormData,
): Promise<ChallengeAdminActionState> {
  const session = await requirePermission("challenges.manage");
  const campaignId = field(formData, "campaignId");
  const tierId = field(formData, "tierId");
  const title = field(formData, "title");
  const prizeLabel = field(formData, "prizeLabel");
  const minPercentage = boundedFloat(field(formData, "minPercentage"), 0, 0, 100);
  const maxPercentage = field(formData, "maxPercentage")
    ? boundedFloat(field(formData, "maxPercentage"), 100, 0, 100)
    : null;
  if (
    !tierId ||
    title.length < 2 ||
    prizeLabel.length < 2 ||
    (maxPercentage !== null && maxPercentage < minPercentage)
  ) {
    return actionError("بازه و عنوان سطح جایزه معتبر نیست.");
  }

  try {
    const updated = await prisma.challengeScholarshipTier.updateMany({
      where: {
        id: tierId,
        campaignId,
        organizationId: session.organization.id,
      },
      data: {
        title,
        prizeLabel,
        description: field(formData, "description") || null,
        minPercentage,
        maxPercentage,
        sortOrder: boundedInt(field(formData, "sortOrder"), 0, 0, 999),
        isActive: field(formData, "isActive") === "on",
      },
    });
    if (updated.count !== 1) return actionError("سطح جایزه پیدا نشد.");
  } catch (error) {
    return actionError(persianPrismaError(error, "ذخیره جایزه انجام نشد."));
  }
  revalidatePath(`/admin/challenges/${campaignId}`);
  return actionSuccess("جایزه با موفقیت ذخیره شد.");
}
