/**
 * Counselor OS read-model for the V2 18-step student case.
 * Reads existing step-store JSON + GuidancePlan + documents. No V2 writes.
 */

import { GuidanceDocumentVerificationStatus } from "@/generated/prisma/enums";
import { loadCounselorFinance } from "@/lib/counselor-os/finance";
import { emptyHollandView, parseStoredHolland } from "@/lib/counselor-os/holland";
import {
  labelExamGroup,
  labelGender,
  labelPriorityFactor,
} from "@/lib/counselor-os/labels";
import {
  COUNSELOR_V2_STEPS,
  counselorV2StepTitle,
  parseCompletedStepIds,
} from "@/lib/counselor-os/v2-catalog";
import type {
  CounselorDocumentView,
  CounselorJourneyStepView,
  CounselorV2Dossier,
} from "@/lib/counselor-os/view-models";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { guidanceEducationTypeLabel } from "@/lib/guidance/journey/reference-data/education-types";
import { loadGuidanceStepData } from "@/lib/guidance/journey/step-store";
import { subjectsForExamGroup } from "@/lib/guidance/office/final-exam";
import { loadFinalExamScores } from "@/lib/guidance/office/final-exam-store";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import { prisma } from "@/lib/prisma";

export type {
  CounselorDocumentView,
  CounselorJourneyStepView,
  CounselorV2Dossier,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stepStatus(
  id: number,
  current: number | null,
  completed: number[],
): "completed" | "current" | "untouched" {
  if (completed.includes(id)) return "completed";
  if (current === id) return "current";
  return "untouched";
}

async function loadJson(
  organizationId: string,
  planPublicId: string,
  category: string,
  kind: string,
): Promise<{ data: unknown; updatedAtIso: string | null }> {
  const loaded = await loadGuidanceStepData<unknown>({
    organizationId,
    planPublicId,
    category,
    kind,
    validate: (raw) => raw ?? null,
  });
  return { data: loaded.data, updatedAtIso: loaded.updatedAtIso };
}

export async function loadCounselorV2Dossier(params: {
  organizationId: string;
  studentId: string;
}): Promise<CounselorV2Dossier> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      deletedAt: null,
      journeyVersion: 2,
    },
    orderBy: { updatedAt: "desc" },
  });

  const emptyFinance = await loadCounselorFinance({
    organizationId: params.organizationId,
    planId: plan?.id ?? null,
    studentId: params.studentId,
    userId: plan?.userId ?? null,
    packageCode: plan?.guidancePackageCode ?? null,
    packagePaidAt: plan?.packagePaidAt ?? null,
  });

  if (!plan) {
    return {
      planId: null,
      planPublicId: null,
      journeyVersionHint: "none",
      currentStep: null,
      currentStepTitle: null,
      completionPercentage: 0,
      completedStepIds: [],
      examGroupLabel: null,
      personal: {},
      examGroups: null,
      grades: [],
      holland: { ...emptyHollandView(), codes: [], summary: null },
      educationTypes: [],
      provinces: [],
      majors: [],
      priorities: [],
      steps: COUNSELOR_V2_STEPS.map((s) => ({
        id: s.id,
        title: s.title,
        status: "untouched",
        completedAtLabel: null,
        fields: [],
      })),
      documents: [],
      finance: emptyFinance,
    };
  }

  const completed = parseCompletedStepIds(plan.completedSteps);
  const currentStep = plan.currentStep;
  const publicId = plan.publicId;

  const [step1, step2, holland, step6, step7, step8, step9, grades, documents] =
    await Promise.all([
      loadJson(params.organizationId, publicId, "guidance-journey-v2-step1", "guidance-journey-v2-step1"),
      loadJson(params.organizationId, publicId, "guidance-journey-v2-step2", "guidance-journey-v2-step2"),
      loadJson(params.organizationId, publicId, "guidance-journey-v2-holland", "guidance-journey-v2-holland"),
      loadJson(params.organizationId, publicId, "guidance-journey-step6", "guidance-journey-step6"),
      loadJson(params.organizationId, publicId, "guidance-journey-step7", "guidance-journey-step7"),
      loadJson(params.organizationId, publicId, "guidance-journey-step8", "guidance-journey-step8"),
      loadJson(params.organizationId, publicId, "guidance-journey-step9", "guidance-journey-step9"),
      loadFinalExamScores({
        organizationId: params.organizationId,
        planPublicId: publicId,
        examGroup: plan.examGroup as GuidanceExamGroup,
      }).catch(() => ({ scores: {}, summary: { filled: 0, total: 0 } })),
      prisma.guidanceDocument.findMany({
        where: {
          organizationId: params.organizationId,
          planId: plan.id,
          isLatest: true,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          documentType: true,
          originalFilename: true,
          mimeType: true,
          createdAt: true,
          verificationStatus: true,
        },
      }),
    ]);

  const personalRaw = asRecord(step1.data);
  const personal: Record<string, string> = {};
  if (personalRaw) {
    personal["نام"] = String(personalRaw.firstName ?? "");
    personal["نام خانوادگی"] = String(personalRaw.lastName ?? "");
    personal["کد ملی"] = String(personalRaw.nationalId ?? "");
    personal["جنسیت"] = labelGender(String(personalRaw.gender ?? ""));
    personal["تاریخ تولد"] = String(personalRaw.birthDateJalali ?? "");
    personal["استان بومی"] = String(personalRaw.nativeProvince ?? "");
    personal["سهمیه منطقه"] = String(personalRaw.regionQuota ?? "");
    personal["سهمیه خاص"] = String(personalRaw.specialQuota ?? "");
    personal["معدل کتبی"] = personalRaw.highSchoolAverage != null
      ? String(personalRaw.highSchoolAverage)
      : "";
    personal["موبایل دوم"] = String(personalRaw.alternateMobile ?? "");
  }

  const examRaw = asRecord(step2.data);
  const examGroups = examRaw
    ? {
        primary: labelExamGroup(String(examRaw.primary ?? plan.examGroup)),
        secondary: Array.isArray(examRaw.secondary)
          ? examRaw.secondary.map((v) => labelExamGroup(String(v)))
          : [],
      }
    : { primary: labelExamGroup(plan.examGroup), secondary: [] };

  const subjectLabels = new Map(
    subjectsForExamGroup(plan.examGroup as GuidanceExamGroup).map((s) => [s.id, s.label]),
  );
  const gradeRows = Object.entries(grades.scores ?? {}).map(([key, value]) => ({
    label: subjectLabels.get(key) ?? key,
    value: value == null ? "—" : String(value),
  }));

  const hollandView = parseStoredHolland(holland.data);
  const hollandCodes = hollandView.code
    ? hollandView.code.split("").filter(Boolean)
    : hollandView.codeLetters.map((c) => c.type);

  const eduRaw = asRecord(step6.data);
  const educationTypes: string[] = [];
  if (Array.isArray(eduRaw?.items)) {
    educationTypes.push(
      ...eduRaw.items
        .filter((item) => asRecord(item)?.enabled)
        .sort((a, b) => Number(asRecord(a)?.rank ?? 0) - Number(asRecord(b)?.rank ?? 0))
        .map((item) => guidanceEducationTypeLabel(String(asRecord(item)?.code ?? ""))),
    );
  } else if (Array.isArray(eduRaw?.preferredInstitutionTypes)) {
    educationTypes.push(
      ...eduRaw.preferredInstitutionTypes.map((c) => guidanceEducationTypeLabel(String(c))),
    );
  }

  const cityRaw = asRecord(step7.data);
  const provinces: string[] = [];
  if (Array.isArray(cityRaw?.items)) {
    provinces.push(
      ...cityRaw.items
        .filter((item) => asRecord(item)?.enabled || asRecord(item)?.province)
        .sort((a, b) => Number(asRecord(a)?.rank ?? 0) - Number(asRecord(b)?.rank ?? 0))
        .map((item) => String(asRecord(item)?.province ?? asRecord(item)?.title ?? ""))
        .filter(Boolean),
    );
  } else if (Array.isArray(cityRaw?.preferredCities)) {
    provinces.push(...cityRaw.preferredCities.map(String));
  }

  const majorRaw = asRecord(step8.data);
  const majors: string[] = [];
  if (Array.isArray(majorRaw?.items)) {
    majors.push(
      ...majorRaw.items
        .filter((item) => asRecord(item)?.title || asRecord(item)?.name)
        .sort((a, b) => Number(asRecord(a)?.rank ?? 0) - Number(asRecord(b)?.rank ?? 0))
        .map((item) => String(asRecord(item)?.title ?? asRecord(item)?.name ?? "")),
    );
  } else if (Array.isArray(majorRaw?.rankedMajors)) {
    majors.push(
      ...majorRaw.rankedMajors.map((item) => String(asRecord(item)?.title ?? "")).filter(Boolean),
    );
  }

  const prioRaw = asRecord(step9.data);
  const priorities: string[] = [];
  if (Array.isArray(prioRaw?.orderedCodes)) {
    priorities.push(...prioRaw.orderedCodes.map((c) => labelPriorityFactor(String(c))));
  } else if (prioRaw?.weights && typeof prioRaw.weights === "object") {
    priorities.push(
      ...Object.entries(prioRaw.weights as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => labelPriorityFactor(k)),
    );
  }

  const fieldSets: Record<number, Array<{ label: string; value: string }>> = {
    1: Object.entries(personal).map(([label, value]) => ({ label, value: value || "—" })),
    2: [
      { label: "گروه اصلی", value: examGroups.primary },
      {
        label: "گروه‌های تکمیلی",
        value: examGroups.secondary.length ? examGroups.secondary.join("، ") : "—",
      },
    ],
    3: gradeRows.length ? gradeRows : [{ label: "نمرات", value: "ثبت نشده" }],
    4: [
      {
        label: "وضعیت آزمون",
        value: hollandView.completed
          ? hollandView.completedAtLabel
            ? `تکمیل شده · ${hollandView.completedAtLabel}`
            : "تکمیل شده"
          : "آزمون رغبت‌سنجی هنوز تکمیل نشده است.",
      },
    ],
    5: [
      {
        label: "کد رغبت",
        value: hollandCodes.length ? hollandCodes.join(" · ") : "—",
      },
    ],
    6: [{ label: "دوره‌ها", value: educationTypes.join("، ") || "—" }],
    7: [{ label: "استان‌ها", value: provinces.join("، ") || "—" }],
    8: [{ label: "رشته‌ها", value: majors.slice(0, 20).join("، ") || "—" }],
    9: [{ label: "معیارها", value: priorities.join(" > ") || "—" }],
    10: [
      { label: "بسته", value: emptyFinance.packageTitle },
      { label: "وضعیت", value: emptyFinance.packageStateLabel },
    ],
  };

  const updatedByStep: Record<number, string | null> = {
    1: step1.updatedAtIso,
    2: step2.updatedAtIso,
    4: holland.updatedAtIso,
    5: holland.updatedAtIso,
    6: step6.updatedAtIso,
    7: step7.updatedAtIso,
    8: step8.updatedAtIso,
    9: step9.updatedAtIso,
  };

  const steps: CounselorJourneyStepView[] = COUNSELOR_V2_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    status: stepStatus(s.id, currentStep, completed),
    completedAtLabel: updatedByStep[s.id]
      ? formatJalaliDateTimeShort(new Date(updatedByStep[s.id]!))
      : null,
    fields: fieldSets[s.id] ?? [],
  }));

  const hasV2Payload = Boolean(step1.data || step2.data || holland.data);
  const journeyVersionHint: CounselorV2Dossier["journeyVersionHint"] =
    hasV2Payload || currentStep > 12 ? "v2" : "v1-compatible";

  return {
    planId: plan.id,
    planPublicId: plan.publicId,
    journeyVersionHint,
    currentStep,
    currentStepTitle: counselorV2StepTitle(currentStep),
    completionPercentage: plan.completionPercentage,
    completedStepIds: completed,
    examGroupLabel: examGroups.primary,
    personal,
    examGroups,
    grades: gradeRows,
    holland: {
      ...hollandView,
      codes: hollandCodes,
      summary: hollandView.completed
        ? `الگوی رغبت: ${hollandView.code || hollandCodes.join(" · ")}`
        : null,
    },
    educationTypes,
    provinces,
    majors,
    priorities,
    steps,
    documents: documents.map((d) => ({
      id: d.id,
      title:
        d.documentType === "FINAL_GRADES"
          ? "کارنامه نهایی"
          : d.documentType === "EXAM_RESULT"
            ? "کارنامه کنکور"
            : d.documentType,
      filename: d.originalFilename,
      mimeType: d.mimeType,
      uploadedLabel: formatJalaliDateTimeShort(d.createdAt),
      verification:
        d.verificationStatus === GuidanceDocumentVerificationStatus.VERIFIED
          ? "تأیید شده"
          : d.verificationStatus === GuidanceDocumentVerificationStatus.REJECTED
            ? "رد شده"
            : "در انتظار بررسی",
    })),
    finance: emptyFinance,
  };
}
