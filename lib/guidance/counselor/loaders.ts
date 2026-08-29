/**
 * Counselor Review — org-scoped loaders (staff).
 */

import {
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loadCounselorCase } from "@/lib/guidance/counselor/case-session";
import type {
  CounselorCasePresentation,
  CounselorQueueFilter,
  CounselorQueueItem,
  CounselorReviewStatus,
} from "@/lib/guidance/counselor/types";
import { INTEREST_SESSION_CATEGORY } from "@/lib/guidance/interest/session";
import { INTEREST_QUESTIONS } from "@/lib/guidance/interest/question-bank";
import { PROFILE360_SESSION_CATEGORY } from "@/lib/guidance/profile360/session";
import {
  buildAnalysisPresentationModel,
} from "@/lib/guidance/analysis";
import { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";
import type { GuidancePortalPlanSummary } from "@/lib/guidance/portal";
import { GUIDANCE_EXAM_GROUPS, type GuidanceExamGroup } from "@/lib/guidance/types";

const EXAM_GROUP_LABELS: Record<GuidanceExamGroup, string> = {
  MATHEMATICS: "ریاضی",
  EXPERIMENTAL_SCIENCES: "تجربی",
  HUMANITIES: "انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان",
};

const REVIEW_STATUS_LABELS: Record<CounselorReviewStatus, string> = {
  awaiting_review: "در انتظار بررسی",
  in_review: "در حال بررسی",
  needs_correction: "نیاز به اصلاح",
  ready_for_session: "آماده جلسه",
};

const VERIFY_LABELS: Record<string, string> = {
  PENDING: "در انتظار تأیید",
  VERIFIED: "تأیید شده",
  REJECTED: "رد شده",
};

function examGroupLabel(code: string): string {
  if ((GUIDANCE_EXAM_GROUPS as readonly string[]).includes(code)) {
    return EXAM_GROUP_LABELS[code as GuidanceExamGroup];
  }
  return code;
}

async function loadSessionMeta(params: {
  organizationId: string;
  category: string;
  planPublicId: string;
  studentUserId: string;
}): Promise<Record<string, unknown> | null> {
  const byCreator = await prisma.mediaAsset.findFirst({
    where: {
      organizationId: params.organizationId,
      category: params.category,
      createdByUserId: params.studentUserId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: { metadata: true },
  });
  const meta = byCreator?.metadata as Record<string, unknown> | null;
  if (meta?.planPublicId === params.planPublicId) return meta;

  const candidates = await prisma.mediaAsset.findMany({
    where: {
      organizationId: params.organizationId,
      category: params.category,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: { metadata: true },
  });
  for (const row of candidates) {
    const m = row.metadata as Record<string, unknown> | null;
    if (m?.planPublicId === params.planPublicId) return m;
  }
  return null;
}

function mapPlanSummary(plan: {
  id: string;
  publicId: string;
  status: string;
  examGroup: string;
  documents: Array<{
    id: string;
    versionNumber: number;
    originalFilename: string;
    verificationStatus: GuidanceDocumentVerificationStatus;
    createdAt: Date;
    isLatest: boolean;
  }>;
}): GuidancePortalPlanSummary {
  const history = plan.documents.map((doc) => ({
    id: doc.id,
    versionNumber: doc.versionNumber,
    originalFilename: doc.originalFilename,
    verificationStatus: doc.verificationStatus,
    createdAt: doc.createdAt,
    isLatest: doc.isLatest,
  }));
  const latest = history.find((d) => d.isLatest) ?? history[0] ?? null;
  return {
    id: plan.id,
    publicId: plan.publicId,
    status: plan.status as GuidancePortalPlanSummary["status"],
    examGroup: plan.examGroup,
    latestFinalGrades: latest,
    finalGradesHistory: history,
  };
}

export async function listCounselorQueue(params: {
  organizationId: string;
  filter?: CounselorQueueFilter;
}): Promise<CounselorQueueItem[]> {
  const plans = await prisma.guidancePlan.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      publicId: true,
      status: true,
      examGroup: true,
      userId: true,
      updatedAt: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          grade: { select: { name: true } },
        },
      },
      documents: {
        where: {
          deletedAt: null,
          documentType: GuidanceDocumentType.FINAL_GRADES,
          isLatest: true,
        },
        take: 1,
        select: {
          verificationStatus: true,
        },
      },
    },
  });

  const items: CounselorQueueItem[] = [];

  for (const plan of plans) {
    const caseRecord = await loadCounselorCase({
      organizationId: params.organizationId,
      planId: plan.id,
      planPublicId: plan.publicId,
    });

    const interestMeta = await loadSessionMeta({
      organizationId: params.organizationId,
      category: INTEREST_SESSION_CATEGORY,
      planPublicId: plan.publicId,
      studentUserId: plan.userId,
    });
    const profileMeta = await loadSessionMeta({
      organizationId: params.organizationId,
      category: PROFILE360_SESSION_CATEGORY,
      planPublicId: plan.publicId,
      studentUserId: plan.userId,
    });

    const interestStatus =
      (interestMeta?.status as CounselorQueueItem["interestStatus"]) ??
      "not_started";
    const profileStatus =
      (profileMeta?.status as CounselorQueueItem["profileStatus"]) ??
      "not_started";

    const doc = plan.documents[0];
    let transcriptStatus: CounselorQueueItem["transcriptStatus"] = "none";
    if (doc?.verificationStatus === "PENDING") transcriptStatus = "pending";
    else if (doc?.verificationStatus === "VERIFIED") transcriptStatus = "verified";
    else if (doc?.verificationStatus === "REJECTED") transcriptStatus = "rejected";

    const item: CounselorQueueItem = {
      publicId: plan.publicId,
      planId: plan.id,
      studentName:
        `${plan.student.firstName} ${plan.student.lastName}`.trim() || "—",
      gradeName: plan.student.grade?.name ?? null,
      examGroup: plan.examGroup,
      planStatus: plan.status,
      reviewStatus: caseRecord.reviewStatus,
      reviewStatusLabel: REVIEW_STATUS_LABELS[caseRecord.reviewStatus],
      transcriptStatus,
      transcriptStatusLabel:
        transcriptStatus === "none"
          ? "بدون کارنامه"
          : transcriptStatus === "pending"
            ? "در انتظار تأیید"
            : transcriptStatus === "verified"
              ? "تأیید شده"
              : "رد شده",
      interestStatus,
      profileStatus,
      updatedAtIso: (
        caseRecord.updatedAtIso
          ? new Date(caseRecord.updatedAtIso)
          : plan.updatedAt
      ).toISOString(),
      href: `/admin/guidance/${plan.publicId}`,
    };

    const filter = params.filter ?? "all";
    if (filter === "all") {
      items.push(item);
    } else if (filter === "pending_transcript") {
      if (item.transcriptStatus === "pending") items.push(item);
    } else if (item.reviewStatus === filter) {
      items.push(item);
    }
  }

  return items;
}

export async function loadCounselorCasePresentation(params: {
  organizationId: string;
  publicId: string;
  canReview: boolean;
}): Promise<CounselorCasePresentation | null> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      publicId: params.publicId,
      deletedAt: null,
    },
    select: {
      id: true,
      publicId: true,
      status: true,
      examGroup: true,
      userId: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          schoolYear: true,
          grade: { select: { name: true } },
        },
      },
      documents: {
        where: {
          deletedAt: null,
          documentType: GuidanceDocumentType.FINAL_GRADES,
        },
        orderBy: { versionNumber: "desc" },
        take: 12,
        select: {
          id: true,
          versionNumber: true,
          originalFilename: true,
          verificationStatus: true,
          createdAt: true,
          isLatest: true,
        },
      },
    },
  });

  if (!plan) return null;

  const summary = mapPlanSummary(plan);
  const caseRecord = await loadCounselorCase({
    organizationId: params.organizationId,
    planId: plan.id,
    planPublicId: plan.publicId,
  });

  const interestMeta = await loadSessionMeta({
    organizationId: params.organizationId,
    category: INTEREST_SESSION_CATEGORY,
    planPublicId: plan.publicId,
    studentUserId: plan.userId,
  });
  const profileMeta = await loadSessionMeta({
    organizationId: params.organizationId,
    category: PROFILE360_SESSION_CATEGORY,
    planPublicId: plan.publicId,
    studentUserId: plan.userId,
  });

  const interestStatus =
    (interestMeta?.status as string) ?? "not_started";
  const answers =
    interestMeta?.answers && typeof interestMeta.answers === "object"
      ? (interestMeta.answers as Record<string, unknown>)
      : {};
  const answeredCount = Object.keys(answers).length;

  const profileStatus = (profileMeta?.status as string) ?? "not_started";
  const profileData =
    profileMeta?.data && typeof profileMeta.data === "object"
      ? profileMeta.data
      : {};

  // Lightweight completion estimate from stored profile data keys
  const profileSections = Object.keys(profileData as object).length;
  const completionPercent = Math.min(100, Math.round((profileSections / 14) * 100));

  const steps = buildGuidancePortalTimeline(summary, {
    interestAssessmentStatus:
      interestStatus === "completed" ||
      interestStatus === "in_progress" ||
      interestStatus === "not_started"
        ? interestStatus
        : "not_started",
    profileCompletionStatus:
      profileStatus === "completed"
        ? "completed"
        : profileStatus === "in_progress"
          ? "in_progress"
          : "not_started",
  });

  const analysis = buildAnalysisPresentationModel({
    plan: summary,
    steps,
    studentName: `${plan.student.firstName} ${plan.student.lastName}`.trim(),
    gradeName: plan.student.grade?.name ?? null,
    schoolYear: plan.student.schoolYear ?? null,
    averageScore: null,
  });

  const latest = summary.latestFinalGrades;

  const timeline = [
    {
      id: "plan",
      label: "تشکیل پرونده",
      state: "complete",
      atIso: null,
    },
    {
      id: "transcript",
      label: "کارنامه",
      state: latest
        ? latest.verificationStatus === "VERIFIED"
          ? "complete"
          : latest.verificationStatus === "REJECTED"
            ? "needs_correction"
            : "pending"
        : "missing",
      atIso: latest?.createdAt.toISOString() ?? null,
    },
    {
      id: "interest",
      label: "آزمون رغبت",
      state: interestStatus,
      atIso: null,
    },
    {
      id: "profile",
      label: "پروفایل ۳۶۰",
      state: profileStatus,
      atIso: null,
    },
    {
      id: "review",
      label: "بررسی مشاور",
      state: caseRecord.reviewStatus,
      atIso: caseRecord.updatedAtIso,
    },
  ];

  return {
    publicId: plan.publicId,
    studentName: `${plan.student.firstName} ${plan.student.lastName}`.trim(),
    gradeName: plan.student.grade?.name ?? null,
    schoolYear: plan.student.schoolYear ?? null,
    examGroup: plan.examGroup,
    examGroupLabel: examGroupLabel(plan.examGroup),
    planStatus: plan.status,
    reviewStatus: caseRecord.reviewStatus,
    reviewStatusLabel: REVIEW_STATUS_LABELS[caseRecord.reviewStatus],
    transcript: {
      documentId: latest?.id ?? null,
      filename: latest?.originalFilename ?? null,
      versionNumber: latest?.versionNumber ?? null,
      verificationStatus: latest?.verificationStatus ?? null,
      verificationLabel: latest
        ? VERIFY_LABELS[latest.verificationStatus] ?? latest.verificationStatus
        : "بارگذاری نشده",
      createdAtIso: latest?.createdAt.toISOString() ?? null,
      downloadHref: latest
        ? `/admin/guidance/${plan.publicId}/documents/${latest.id}/download`
        : null,
    },
    interest: {
      status: interestStatus,
      statusLabel:
        interestStatus === "completed"
          ? "تکمیل‌شده"
          : interestStatus === "in_progress"
            ? "در حال انجام"
            : "شروع نشده",
      answeredCount,
      totalQuestions: INTEREST_QUESTIONS.length,
    },
    profile: {
      status: profileStatus,
      statusLabel:
        profileStatus === "completed"
          ? "تکمیل‌شده"
          : profileStatus === "in_progress"
            ? "در حال تکمیل"
            : "شروع نشده",
      completionPercent,
      healthLabel:
        completionPercent >= 85
          ? "عالی"
          : completionPercent >= 60
            ? "خوب"
            : completionPercent >= 30
              ? "ناقص"
              : "بحرانی",
    },
    analysis: {
      pipelineStatus: analysis.analysisStatus.status,
      pipelineLabel: analysis.analysisStatus.title,
      summary: analysis.analysisStatus.description,
    },
    notes: caseRecord.notes,
    activity: caseRecord.activity,
    timeline,
    canReview: params.canReview,
  };
}

export { REVIEW_STATUS_LABELS };
