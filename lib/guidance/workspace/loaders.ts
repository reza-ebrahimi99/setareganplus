/**
 * Professional Counselor Workspace — org-scoped staff loaders (Phase 1).
 * Composes Journey Engine, Counselor Review, documents, booking, and AuditLog.
 * Does not mutate student data and does not rewrite existing modules.
 */

import {
  GuidanceDocumentType,
  GuidanceDocumentVerificationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { loadCounselorCase } from "@/lib/guidance/counselor/case-session";
import {
  GUIDANCE_JOURNEY_STEPS,
  parseGuidanceJourneyStepParam,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import {
  loadGuidanceJourneyPlanByPublicId,
  mapGuidanceJourneyPlan,
} from "@/lib/guidance/journey/plan";
import { guidanceJourneyStepStatus } from "@/lib/guidance/journey/state";
import { ASSESSMENT_QUESTIONS } from "@/lib/guidance/journey/assessment/question-bank";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import {
  loadGuidanceStep2ResultForCounselor,
  loadGuidanceStep2Session,
} from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { loadStep5Prefill } from "@/lib/guidance/journey/steps/step5-exam-results";
import { loadStep6Data } from "@/lib/guidance/journey/steps/step6-education-preferences";
import { loadStep7Data } from "@/lib/guidance/journey/steps/step7-city-preferences";
import { loadStep8Data } from "@/lib/guidance/journey/steps/step8-major-preferences";
import { loadStep9Data } from "@/lib/guidance/journey/steps/step9-priority-weights";
import { loadGuidanceStep10Data } from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import { loadGuidanceCounselingSessionState } from "@/lib/guidance/journey/booking";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import {
  emptyStepReview,
  loadStepReview,
  loadStepReviewHistory,
  loadStepReviewsForPlan,
} from "@/lib/guidance/workspace/review";
import {
  matchesWorkspaceQueueFilter,
  summarizeSessionFields,
  summarizeStep1Fields,
  summarizeStep2Fields,
  summarizeStep3Fields,
  summarizeStep5Fields,
  summarizeStep6Fields,
  summarizeStep7Fields,
  summarizeStep8Fields,
  summarizeStep9Fields,
  summarizeStep10Fields,
  summarizeStep12Fields,
  workspaceAuditActionLabel,
  workspaceDocumentTypeLabel,
  workspaceExamGroupLabel,
  workspacePackageTitle,
  workspaceQuotaLabel,
  workspaceReviewStatusLabel,
  workspaceStepEmptyMessage,
  workspaceStepStatusLabel,
  workspaceStepReviewLabel,
  workspaceStepTitle,
  workspaceTranscriptLabel,
  workspaceVerificationLabel,
} from "@/lib/guidance/workspace/presentation";
import type {
  WorkspaceAuditItem,
  WorkspaceDocumentItem,
  WorkspaceDossier,
  WorkspaceFieldRow,
  WorkspaceQueueFilter,
  WorkspaceQueueItem,
  WorkspaceStepInspector,
  WorkspaceStepRailItem,
  WorkspaceStepReviewStatus,
  WorkspaceTranscriptStatus,
} from "@/lib/guidance/workspace/types";

function mapTranscriptStatus(
  status: GuidanceDocumentVerificationStatus | undefined,
): WorkspaceTranscriptStatus {
  if (status === "PENDING") return "pending";
  if (status === "VERIFIED") return "verified";
  if (status === "REJECTED") return "rejected";
  return "none";
}

function buildStepRail(
  plan: {
    publicId: string;
    currentStep: GuidanceJourneyStepId;
    completedSteps: readonly GuidanceJourneyStepId[];
  },
  reviews: ReadonlyMap<number, WorkspaceStepReviewStatus>,
): WorkspaceStepRailItem[] {
  return GUIDANCE_JOURNEY_STEPS.map((step) => {
    const status = guidanceJourneyStepStatus(step.id, plan);
    const reviewStatus = reviews.get(step.id) ?? "PENDING";
    return {
      id: step.id,
      title: step.title,
      shortTitle: step.shortTitle,
      description: step.description,
      status,
      statusLabel: workspaceStepStatusLabel(status),
      reviewStatus,
      reviewStatusLabel: workspaceStepReviewLabel(reviewStatus),
      href: `/admin/guidance/${plan.publicId}/steps/${step.id}`,
    };
  });
}

function mapDocuments(
  publicId: string,
  rows: Array<{
    id: string;
    documentType: string;
    originalFilename: string;
    versionNumber: number;
    verificationStatus: string;
    isLatest: boolean;
    createdAt: Date;
  }>,
): WorkspaceDocumentItem[] {
  return rows.map((doc) => ({
    id: doc.id,
    documentType: doc.documentType,
    documentTypeLabel: workspaceDocumentTypeLabel(doc.documentType),
    filename: doc.originalFilename,
    versionNumber: doc.versionNumber,
    verificationStatus: doc.verificationStatus,
    verificationLabel: workspaceVerificationLabel(doc.verificationStatus),
    isLatest: doc.isLatest,
    createdAtIso: doc.createdAt.toISOString(),
    downloadHref: `/admin/guidance/${publicId}/documents/${doc.id}/download`,
  }));
}

function auditSummary(metadata: unknown, action: string): string {
  if (!metadata || typeof metadata !== "object") {
    return workspaceAuditActionLabel(action);
  }
  const meta = metadata as Record<string, unknown>;
  if (typeof meta.stepCompleted === "number") {
    return `مرحله ${meta.stepCompleted} تکمیل شد`;
  }
  if (typeof meta.step === "number") {
    return `مرحله ${meta.step}`;
  }
  return workspaceAuditActionLabel(action);
}

export async function listWorkspaceQueue(params: {
  organizationId: string;
  filter?: WorkspaceQueueFilter;
  query?: string;
  step?: number;
  payment?: "paid" | "unpaid";
  packageCode?: string;
  booking?: "booked" | "none";
}): Promise<WorkspaceQueueItem[]> {
  const query = params.query?.trim() || "";
  const latin = toLatinDigits(query).replace(/\s+/g, "");
  const mobile = latin ? normalizeIranianMobile(latin) : { ok: false as const };
  const looksLikeNationalId = /^\d{10}$/.test(latin);

  let nationalIdPlanPublicIds: string[] = [];
  if (looksLikeNationalId) {
    const assets = await prisma.mediaAsset.findMany({
      where: {
        organizationId: params.organizationId,
        category: "guidance-journey-step1",
        deletedAt: null,
      },
      take: 200,
      select: { metadata: true },
    });
    for (const asset of assets) {
      const meta = asset.metadata as Record<string, unknown> | null;
      const data = meta?.data as Record<string, unknown> | undefined;
      if (data && String(data.nationalId) === latin && typeof meta?.planPublicId === "string") {
        nationalIdPlanPublicIds.push(meta.planPublicId);
      }
    }
  }

  const plans = await prisma.guidancePlan.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.packageCode ? { guidancePackageCode: params.packageCode } : {}),
      ...(params.step ? { currentStep: params.step } : {}),
      ...(params.payment === "paid" ? { packagePaidAt: { not: null } } : {}),
      ...(params.payment === "unpaid" ? { packagePaidAt: null } : {}),
      ...(query
        ? {
            OR: [
              { publicId: { contains: query, mode: "insensitive" } },
              { student: { fullName: { contains: query, mode: "insensitive" } } },
              { student: { kanoonStudentId: latin || query } },
              ...(mobile.ok
                ? [{ user: { normalizedMobile: mobile.normalized } }]
                : []),
              ...(nationalIdPlanPublicIds.length > 0
                ? [{ publicId: { in: nationalIdPlanPublicIds } }]
                : []),
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      publicId: true,
      status: true,
      examGroup: true,
      currentStep: true,
      completedSteps: true,
      completionPercentage: true,
      guidancePackageCode: true,
      packagePaidAt: true,
      choicesApprovedAt: true,
      finalApprovedAt: true,
      updatedAt: true,
      student: {
        select: {
          fullName: true,
          firstName: true,
          lastName: true,
          kanoonStudentId: true,
          grade: { select: { name: true } },
        },
      },
      user: { select: { mobile: true, normalizedMobile: true } },
      documents: {
        where: {
          deletedAt: null,
          documentType: GuidanceDocumentType.FINAL_GRADES,
          isLatest: true,
        },
        take: 1,
        select: { verificationStatus: true },
      },
    },
  });

  const items: WorkspaceQueueItem[] = [];

  for (const plan of plans) {
    const caseRecord = await loadCounselorCase({
      organizationId: params.organizationId,
      planId: plan.id,
      planPublicId: plan.publicId,
    });
    const mapped = mapGuidanceJourneyPlan({
      id: plan.id,
      publicId: plan.publicId,
      organizationId: params.organizationId,
      userId: "",
      studentId: "",
      examGroup: plan.examGroup,
      status: plan.status,
      currentStep: plan.currentStep,
      completedSteps: plan.completedSteps,
      completionPercentage: plan.completionPercentage,
      quota: null,
      highSchoolAverage: null,
      personalInfoConfirmedAt: null,
      guidancePackageCode: plan.guidancePackageCode,
      packagePaidAt: plan.packagePaidAt,
      choicesApprovedAt: plan.choicesApprovedAt,
      finalApprovedAt: plan.finalApprovedAt,
    });

    const transcriptStatus = mapTranscriptStatus(plan.documents[0]?.verificationStatus);
    const item: WorkspaceQueueItem = {
      publicId: plan.publicId,
      planId: plan.id,
      studentName:
        plan.student.fullName.trim() ||
        `${plan.student.firstName} ${plan.student.lastName}`.trim() ||
        "—",
      gradeName: plan.student.grade?.name ?? null,
      examGroupLabel: workspaceExamGroupLabel(plan.examGroup),
      currentStep: mapped.currentStep,
      currentStepTitle: workspaceStepTitle(mapped.currentStep),
      completionPercentage: mapped.completionPercentage,
      planStatus: plan.status,
      reviewStatus: caseRecord.reviewStatus,
      reviewStatusLabel: workspaceReviewStatusLabel(caseRecord.reviewStatus),
      transcriptStatus,
      transcriptStatusLabel: workspaceTranscriptLabel(transcriptStatus),
      packageTitle: workspacePackageTitle(plan.guidancePackageCode),
      paid: Boolean(plan.packagePaidAt),
      choicesApproved: Boolean(plan.choicesApprovedAt),
      finalApproved: Boolean(plan.finalApprovedAt),
      updatedAtIso: (
        caseRecord.updatedAtIso
          ? new Date(caseRecord.updatedAtIso)
          : plan.updatedAt
      ).toISOString(),
      href: `/admin/guidance/${plan.publicId}`,
    };

    if (params.booking) {
      const session = await loadGuidanceCounselingSessionState({
        organizationId: params.organizationId,
        planPublicId: plan.publicId,
        sessionNumber: 1,
      });
      if (params.booking === "booked" && !session.isActive) continue;
      if (params.booking === "none" && session.isActive) continue;
    }

    if (matchesWorkspaceQueueFilter(item, params.filter ?? "all")) {
      items.push(item);
    }
  }

  return items;
}

async function loadPlanDocuments(params: {
  organizationId: string;
  planId: string;
  publicId: string;
}): Promise<WorkspaceDocumentItem[]> {
  const rows = await prisma.guidanceDocument.findMany({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      deletedAt: null,
    },
    orderBy: [{ documentType: "asc" }, { versionNumber: "desc" }],
    take: 24,
    select: {
      id: true,
      documentType: true,
      originalFilename: true,
      versionNumber: true,
      verificationStatus: true,
      isLatest: true,
      createdAt: true,
    },
  });
  return mapDocuments(params.publicId, rows);
}

async function loadPlanAudit(params: {
  organizationId: string;
  planId: string;
}): Promise<WorkspaceAuditItem[]> {
  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId: params.organizationId,
      entityType: "GuidancePlan",
      entityId: params.planId,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
      actor: { select: { firstName: true, lastName: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actionLabel: workspaceAuditActionLabel(row.action),
    actorName:
      `${row.actor?.firstName ?? ""} ${row.actor?.lastName ?? ""}`.trim() || "سامانه",
    atIso: row.createdAt.toISOString(),
    summary: auditSummary(row.metadata, row.action),
  }));
}

export async function loadWorkspaceDossier(params: {
  organizationId: string;
  publicId: string;
  canReview: boolean;
}): Promise<WorkspaceDossier | null> {
  const plan = await loadGuidanceJourneyPlanByPublicId({
    organizationId: params.organizationId,
    publicId: params.publicId,
  });
  if (!plan) return null;

  const [studentRow, userRow, caseRecord, documents, audit, reviews] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: plan.studentId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        fullName: true,
        firstName: true,
        lastName: true,
        schoolYear: true,
        grade: { select: { name: true } },
      },
    }),
    prisma.user.findFirst({
      where: { id: plan.userId },
      select: { mobile: true },
    }),
    loadCounselorCase({
      organizationId: params.organizationId,
      planId: plan.id,
      planPublicId: plan.publicId,
    }),
    loadPlanDocuments({
      organizationId: params.organizationId,
      planId: plan.id,
      publicId: plan.publicId,
    }),
    loadPlanAudit({
      organizationId: params.organizationId,
      planId: plan.id,
    }),
    loadStepReviewsForPlan({
      organizationId: params.organizationId,
      planId: plan.id,
    }),
  ]);

  const reviewMap = new Map<number, WorkspaceStepReviewStatus>(
    reviews.map((row) => [row.stepNumber, row.status]),
  );

  const studentName =
    studentRow?.fullName.trim() ||
    `${studentRow?.firstName ?? ""} ${studentRow?.lastName ?? ""}`.trim() ||
    plan.publicId;

  return {
    publicId: plan.publicId,
    planId: plan.id,
    studentName,
    mobile: userRow?.mobile ?? null,
    gradeName: studentRow?.grade?.name ?? null,
    schoolYear: studentRow?.schoolYear ?? null,
    examGroup: plan.examGroup,
    examGroupLabel: workspaceExamGroupLabel(plan.examGroup),
    quota: plan.quota,
    quotaLabel: workspaceQuotaLabel(plan.quota),
    highSchoolAverage: plan.highSchoolAverage,
    personalInfoConfirmedAtIso: plan.personalInfoConfirmedAtIso,
    currentStep: plan.currentStep,
    currentStepTitle: workspaceStepTitle(plan.currentStep),
    completionPercentage: plan.completionPercentage,
    packageTitle: workspacePackageTitle(plan.guidancePackageCode),
    packageCode: plan.guidancePackageCode,
    paidAtIso: plan.packagePaidAtIso,
    choicesApprovedAtIso: plan.choicesApprovedAtIso,
    finalApprovedAtIso: plan.finalApprovedAtIso,
    reviewStatus: caseRecord.reviewStatus,
    reviewStatusLabel: workspaceReviewStatusLabel(caseRecord.reviewStatus),
    steps: buildStepRail(plan, reviewMap),
    documents,
    audit,
    canReview: params.canReview,
  };
}

async function loadStepFields(params: {
  organizationId: string;
  publicId: string;
  stepId: GuidanceJourneyStepId;
  examGroup: string;
  packageCode: string | null;
  paidAtIso: string | null;
  choicesApprovedAtIso: string | null;
  finalApprovedAtIso: string | null;
  studentName: string;
  quota: string | null;
  highSchoolAverage: number | null;
  personalInfoConfirmedAtIso: string | null;
}): Promise<{ fields: WorkspaceFieldRow[]; relatedHref: string | null; relatedLabel: string | null }> {
  const base = {
    organizationId: params.organizationId,
    planPublicId: params.publicId,
  };

  switch (params.stepId) {
    case 1: {
      const identity = await loadStep1Prefill(base);
      return {
        fields: summarizeStep1Fields({
          fullName: params.studentName,
          nationalId: identity.nationalId,
          gender: identity.gender,
          birthDate: identity.birthDate,
          province: identity.province,
          quota: params.quota,
          highSchoolAverage: params.highSchoolAverage,
          confirmedAtIso: params.personalInfoConfirmedAtIso,
        }),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 2: {
      const [session, result] = await Promise.all([
        loadGuidanceStep2Session(base),
        loadGuidanceStep2ResultForCounselor(base),
      ]);
      return {
        fields: summarizeStep2Fields({
          answeredCount: Object.keys(session.answers).length,
          totalQuestions: ASSESSMENT_QUESTIONS.length,
          result,
        }),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 3:
      return {
        fields: summarizeStep3Fields({
          packageCode: params.packageCode,
          paidAtIso: params.paidAtIso,
        }),
        relatedHref: null,
        relatedLabel: null,
      };
    case 4: {
      const session = await loadGuidanceCounselingSessionState({
        ...base,
        sessionNumber: 1,
      });
      return {
        fields: summarizeSessionFields({
          trackingCode: session.session?.trackingCode ?? null,
          startsAtIso: session.session?.startsAtIso ?? null,
          isActive: session.isActive,
        }),
        relatedHref: session.session
          ? `/admin/bookings/reservations/${session.session.reservationId}`
          : "/admin/bookings",
        relatedLabel: "رزرو نوبت",
      };
    }
    case 5: {
      const exam = await loadStep5Prefill(base);
      return {
        fields: summarizeStep5Fields({
          nationalRank: exam?.nationalRank ?? null,
          regionalRank: exam?.regionalRank ?? null,
          quotaRank: exam?.quotaRank ?? null,
          score: exam?.score ?? null,
        }),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 6: {
      const data = await loadStep6Data(base);
      return {
        fields: summarizeStep6Fields(data.items),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 7: {
      const identity = await loadStep1Prefill(base);
      const data = await loadStep7Data({
        ...base,
        homeProvince: identity.province ?? null,
      });
      return {
        fields: summarizeStep7Fields(data.items),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 8: {
      const data = await loadStep8Data({
        ...base,
        examGroup: params.examGroup as GuidanceExamGroup,
      });
      return {
        fields: summarizeStep8Fields(data.items, params.examGroup),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 9: {
      const data = await loadStep9Data(base);
      return {
        fields: summarizeStep9Fields(data.orderedCodes),
        relatedHref: null,
        relatedLabel: null,
      };
    }
    case 10: {
      const data = await loadGuidanceStep10Data(base);
      return {
        fields: summarizeStep10Fields({
          choiceCount: data.choices.length,
          approved: Boolean(params.choicesApprovedAtIso),
          importedAtIso: data.importedAtIso,
        }),
        relatedHref: `/admin/guidance/${params.publicId}/choices`,
        relatedLabel: "بازبینی ۱۵۰ گزینه",
      };
    }
    case 11: {
      const session = await loadGuidanceCounselingSessionState({
        ...base,
        sessionNumber: 2,
      });
      return {
        fields: summarizeSessionFields({
          trackingCode: session.session?.trackingCode ?? null,
          startsAtIso: session.session?.startsAtIso ?? null,
          isActive: session.isActive,
        }),
        relatedHref: session.session
          ? `/admin/bookings/reservations/${session.session.reservationId}`
          : "/admin/bookings",
        relatedLabel: "رزرو نوبت",
      };
    }
    case 12:
      return {
        fields: summarizeStep12Fields({
          finalApprovedAtIso: params.finalApprovedAtIso,
        }),
        relatedHref: null,
        relatedLabel: null,
      };
  }
}

export async function loadWorkspaceStepInspector(params: {
  organizationId: string;
  publicId: string;
  stepParam: string;
  canReview: boolean;
}): Promise<WorkspaceStepInspector | null> {
  const stepId = parseGuidanceJourneyStepParam(params.stepParam);
  if (!stepId) return null;

  const dossier = await loadWorkspaceDossier({
    organizationId: params.organizationId,
    publicId: params.publicId,
    canReview: params.canReview,
  });
  if (!dossier) return null;

  const definition = GUIDANCE_JOURNEY_STEPS.find((step) => step.id === stepId);
  const rail = dossier.steps.find((step) => step.id === stepId);
  if (!definition || !rail) return null;

  const [loaded, review, history] = await Promise.all([
    loadStepFields({
      organizationId: params.organizationId,
      publicId: params.publicId,
      stepId,
      examGroup: dossier.examGroup,
      packageCode: dossier.packageCode,
      paidAtIso: dossier.paidAtIso,
      choicesApprovedAtIso: dossier.choicesApprovedAtIso,
      finalApprovedAtIso: dossier.finalApprovedAtIso,
      studentName: dossier.studentName,
      quota: dossier.quota,
      highSchoolAverage: dossier.highSchoolAverage,
      personalInfoConfirmedAtIso: dossier.personalInfoConfirmedAtIso,
    }),
    loadStepReview({
      organizationId: params.organizationId,
      planId: dossier.planId,
      stepNumber: stepId,
    }),
    loadStepReviewHistory({
      organizationId: params.organizationId,
      planId: dossier.planId,
      stepNumber: stepId,
    }),
  ]);
  const reviewRecord = review ?? emptyStepReview(stepId);

  const documents = dossier.documents.filter((doc) => {
    if (stepId === 1) return doc.documentType === "FINAL_GRADES";
    if (stepId === 5) return doc.documentType === "EXAM_RESULT";
    return false;
  });

  return {
    dossier,
    stepId,
    title: definition.title,
    description: definition.description,
    status: rail.status,
    statusLabel: rail.statusLabel,
    fields: loaded.fields,
    documents,
    relatedHref: loaded.relatedHref,
    relatedLabel: loaded.relatedLabel,
    emptyMessage: workspaceStepEmptyMessage(rail.status),
    review: {
      status: reviewRecord.status,
      statusLabel: workspaceStepReviewLabel(reviewRecord.status),
      privateNote: reviewRecord.privateNote,
      studentMessage: reviewRecord.studentMessage,
      rejectReason: reviewRecord.rejectReason,
      approvedAtIso: reviewRecord.approvedAtIso,
      approvedByName: reviewRecord.approvedByName,
      rejectedAtIso: reviewRecord.rejectedAtIso,
      revisionRequestedAtIso: reviewRecord.revisionRequestedAtIso,
    },
    history: history.map((item) => ({
      id: item.id,
      summary: item.summary,
      actorName: item.actorName,
      atIso: item.atIso,
      kind: item.kind,
    })),
    studentName: dossier.studentName,
    examGroup: dossier.examGroup,
    canReview: params.canReview,
  };
}
