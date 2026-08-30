/**
 * Counselor field edits — same validators and stores as the Journey Engine,
 * without advancing the student step and without mutating the counselor User.
 */

import { prisma } from "@/lib/prisma";
import { composeStudentFullName } from "@/lib/website/student-slug";
import {
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import {
  STEP1_CATEGORY,
  STEP1_KIND,
  loadStep1Prefill,
  validateStep1Input,
  type Step1IdentityData,
  type Step1Input,
} from "@/lib/guidance/journey/steps/step1-personal-info";
import {
  STEP2_CATEGORY,
  STEP2_KIND,
  loadGuidanceStep2Session,
  type Step2StoredData,
} from "@/lib/guidance/journey/steps/step2-interest-assessment";
import {
  ASSESSMENT_QUESTIONS,
} from "@/lib/guidance/journey/assessment/question-bank";
import {
  computeAssessmentResult,
  isAssessmentComplete,
  type AssessmentAnswers,
} from "@/lib/guidance/journey/assessment/scoring";
import {
  STEP5_CATEGORY,
  STEP5_KIND,
  loadStep5Prefill,
  validateStep5Input,
  type Step5ExamResultData,
  type Step5Input,
} from "@/lib/guidance/journey/steps/step5-exam-results";
import {
  STEP6_CATEGORY,
  STEP6_KIND,
  loadStep6Data,
  type EducationPreferenceItem,
  type Step6Data,
} from "@/lib/guidance/journey/steps/step6-education-preferences";
import {
  STEP7_CATEGORY,
  STEP7_KIND,
  loadStep7Data,
  type ProvincePreferenceItem,
  type Step7Data,
} from "@/lib/guidance/journey/steps/step7-city-preferences";
import {
  STEP8_CATEGORY,
  STEP8_KIND,
  loadStep8Data,
  type MajorPreferenceItem,
  type Step8Data,
} from "@/lib/guidance/journey/steps/step8-major-preferences";
import {
  STEP9_CATEGORY,
  STEP9_KIND,
  loadStep9Data,
  type Step9Data,
} from "@/lib/guidance/journey/steps/step9-priority-weights";
import { GUIDANCE_PRIORITY_FACTORS } from "@/lib/guidance/journey/reference-data/priority-factors";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import { loadGuidanceJourneyPlanByPublicId } from "@/lib/guidance/journey/plan";
import { replaceGuidanceDocumentAsCounselor } from "@/lib/guidance/workspace/documents";
import {
  diffFields,
  logCounselorFieldEdits,
} from "@/lib/guidance/workspace/audit-fields";

export type CounselorEditResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type PlanGate = {
  organizationId: string;
  actorUserId: string;
  publicId: string;
  reason: string;
};

async function requirePlan(params: PlanGate) {
  const plan = await loadGuidanceJourneyPlanByPublicId({
    organizationId: params.organizationId,
    publicId: params.publicId,
  });
  if (!plan) return { ok: false as const, error: "پرونده یافت نشد." };
  if (!params.reason.trim()) {
    return { ok: false as const, error: "دلیل ویرایش الزامی است." };
  }
  return { ok: true as const, plan };
}

export async function counselorEditStep1(params: PlanGate & {
  input: Step1Input;
  file: File | null;
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const { plan } = gate;

  const validated = validateStep1Input(params.input);
  if (!validated.ok) {
    return { ok: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const before = await loadStep1Prefill({
    organizationId: params.organizationId,
    planPublicId: plan.publicId,
  });

  if (params.file) {
    const uploaded = await replaceGuidanceDocumentAsCounselor({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      planId: plan.id,
      publicId: plan.publicId,
      documentType: "FINAL_GRADES",
      file: params.file,
      reason: params.reason,
    });
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error, fieldErrors: { file: uploaded.error } };
    }
  }

  const composedFullName = composeStudentFullName(
    validated.data.firstName,
    validated.data.lastName || validated.data.firstName,
  );

  await prisma.student.update({
    where: { id: plan.studentId },
    data: {
      firstName: validated.data.firstName.slice(0, 80),
      lastName: (validated.data.lastName || validated.data.firstName).slice(0, 80),
      fullName: composedFullName.slice(0, 160),
    },
  });
  await prisma.user.update({
    where: { id: plan.userId },
    data: {
      firstName: validated.data.firstName.slice(0, 80),
      lastName: (validated.data.lastName || validated.data.firstName).slice(0, 80),
    },
  });
  await prisma.guidancePlan.update({
    where: { id: plan.id },
    data: {
      quota: validated.data.quota as never,
      highSchoolAverage: validated.data.highSchoolAverage,
    },
  });
  await saveGuidanceStepData<Step1IdentityData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP1_CATEGORY,
    kind: STEP1_KIND,
    planId: plan.id,
    planPublicId: plan.publicId,
    data: validated.data.identity,
    filenamePrefix: "guidance-step1",
  });

  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: plan.id,
    publicId: plan.publicId,
    stepNumber: 1,
    reason: params.reason,
    changes: diffFields(
      {
        nationalId: before.nationalId ?? "",
        gender: before.gender ?? "",
        birthDate: before.birthDate ?? "",
        province: before.province ?? "",
        quota: plan.quota ?? "",
        highSchoolAverage: plan.highSchoolAverage != null ? String(plan.highSchoolAverage) : "",
      },
      {
        nationalId: validated.data.identity.nationalId,
        gender: validated.data.identity.gender,
        birthDate: validated.data.identity.birthDate,
        province: validated.data.identity.province,
        quota: validated.data.quota,
        highSchoolAverage: String(validated.data.highSchoolAverage),
      },
    ),
  });

  return { ok: true };
}

export async function counselorEditStep2(params: PlanGate & {
  answers: AssessmentAnswers;
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const { plan } = gate;

  if (!isAssessmentComplete(params.answers)) {
    return {
      ok: false,
      error: `لطفاً به همه ${ASSESSMENT_QUESTIONS.length} سؤال پاسخ بده.`,
    };
  }

  const before = await loadGuidanceStep2Session({
    organizationId: params.organizationId,
    planPublicId: plan.publicId,
  });
  const result = computeAssessmentResult(params.answers);
  await saveGuidanceStepData<Step2StoredData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP2_CATEGORY,
    kind: STEP2_KIND,
    planId: plan.id,
    planPublicId: plan.publicId,
    data: { answers: params.answers, result },
    filenamePrefix: "guidance-step2",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: plan.id,
    publicId: plan.publicId,
    stepNumber: 2,
    reason: params.reason,
    changes: [
      {
        field: "answeredCount",
        oldValue: String(Object.keys(before.answers).length),
        newValue: String(Object.keys(params.answers).length),
      },
      {
        field: "personality",
        oldValue: before.result?.personality.title ?? "",
        newValue: result.personality.title,
      },
    ],
  });
  return { ok: true };
}

export async function counselorEditStep5(params: PlanGate & {
  input: Step5Input;
  file: File | null;
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const { plan } = gate;

  const validated = validateStep5Input(params.input);
  if (!validated.ok) {
    return { ok: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const existingDoc = await prisma.guidanceDocument.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: plan.id,
      documentType: "EXAM_RESULT",
      isLatest: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!existingDoc && !params.file) {
    return {
      ok: false,
      error: "بارگذاری کارنامه رسمی سنجش الزامی است.",
      fieldErrors: { file: "فایل کارنامه سنجش را بارگذاری کنید." },
    };
  }
  if (params.file) {
    const uploaded = await replaceGuidanceDocumentAsCounselor({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      planId: plan.id,
      publicId: plan.publicId,
      documentType: "EXAM_RESULT",
      file: params.file,
      reason: params.reason,
    });
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error, fieldErrors: { file: uploaded.error } };
    }
  }

  const before = await loadStep5Prefill({
    organizationId: params.organizationId,
    planPublicId: plan.publicId,
  });
  const data: Step5ExamResultData = {
    ...validated.data,
    acknowledgedAtIso: new Date().toISOString(),
  };
  await saveGuidanceStepData<Step5ExamResultData>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP5_CATEGORY,
    kind: STEP5_KIND,
    planId: plan.id,
    planPublicId: plan.publicId,
    data,
    filenamePrefix: "guidance-step5",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: plan.id,
    publicId: plan.publicId,
    stepNumber: 5,
    reason: params.reason,
    changes: diffFields(
      {
        nationalRank: before ? String(before.nationalRank) : "",
        regionalRank: before ? String(before.regionalRank) : "",
        quotaRank: before?.quotaRank != null ? String(before.quotaRank) : "",
        score: before ? String(before.score) : "",
      },
      {
        nationalRank: String(data.nationalRank),
        regionalRank: String(data.regionalRank),
        quotaRank: data.quotaRank != null ? String(data.quotaRank) : "",
        score: String(data.score),
      },
    ),
  });
  return { ok: true };
}

export async function counselorEditStep6(params: PlanGate & {
  items: EducationPreferenceItem[];
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const enabledCount = params.items.filter((item) => item.enabled).length;
  if (enabledCount === 0) {
    return { ok: false, error: "حداقل یک نوع دوره را انتخاب کن." };
  }
  const before = await loadStep6Data({
    organizationId: params.organizationId,
    planPublicId: gate.plan.publicId,
  });
  await saveGuidanceStepData<Step6Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP6_CATEGORY,
    kind: STEP6_KIND,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    data: { items: params.items },
    filenamePrefix: "guidance-step6",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: gate.plan.id,
    publicId: gate.plan.publicId,
    stepNumber: 6,
    reason: params.reason,
    changes: [
      {
        field: "educationTypes",
        oldValue: before.items.filter((i) => i.enabled).map((i) => i.code).join(","),
        newValue: params.items.filter((i) => i.enabled).map((i) => i.code).join(","),
      },
    ],
  });
  return { ok: true };
}

export async function counselorEditStep7(params: PlanGate & {
  items: ProvincePreferenceItem[];
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const enabled = params.items.filter((item) => item.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "حداقل یک استان را فعال کن." };
  }
  if (enabled.some((item) => item.cities.length === 0)) {
    return { ok: false, error: "برای هر استان فعال، حداقل یک شهر انتخاب کن." };
  }
  const identity = await loadStep1Prefill({
    organizationId: params.organizationId,
    planPublicId: gate.plan.publicId,
  });
  const before = await loadStep7Data({
    organizationId: params.organizationId,
    planPublicId: gate.plan.publicId,
    homeProvince: identity.province ?? null,
  });
  await saveGuidanceStepData<Step7Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP7_CATEGORY,
    kind: STEP7_KIND,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    data: { items: params.items },
    filenamePrefix: "guidance-step7",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: gate.plan.id,
    publicId: gate.plan.publicId,
    stepNumber: 7,
    reason: params.reason,
    changes: [
      {
        field: "provinces",
        oldValue: before.items.filter((i) => i.enabled).map((i) => i.province).join(","),
        newValue: enabled.map((i) => i.province).join(","),
      },
    ],
  });
  return { ok: true };
}

export async function counselorEditStep8(params: PlanGate & {
  items: MajorPreferenceItem[];
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const validCodes = new Set(
    getMajorsForExamGroup(gate.plan.examGroup as GuidanceExamGroup).map((m) => m.code),
  );
  const filtered = params.items.filter((item) => validCodes.has(item.code));
  const enabled = filtered.filter((item) => item.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "حداقل یک رشته را فعال کن." };
  }
  const before = await loadStep8Data({
    organizationId: params.organizationId,
    planPublicId: gate.plan.publicId,
    examGroup: gate.plan.examGroup as GuidanceExamGroup,
  });
  await saveGuidanceStepData<Step8Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP8_CATEGORY,
    kind: STEP8_KIND,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    data: { items: filtered },
    filenamePrefix: "guidance-step8",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: gate.plan.id,
    publicId: gate.plan.publicId,
    stepNumber: 8,
    reason: params.reason,
    changes: [
      {
        field: "majors",
        oldValue: before.items.filter((i) => i.enabled).map((i) => i.code).join(","),
        newValue: enabled.map((i) => i.code).join(","),
      },
    ],
  });
  return { ok: true };
}

export async function counselorEditStep9(params: PlanGate & {
  orderedCodes: string[];
}): Promise<CounselorEditResult> {
  const gate = await requirePlan(params);
  if (!gate.ok) return gate;
  const allCodes: readonly string[] = GUIDANCE_PRIORITY_FACTORS.map((f) => f.code);
  const unique = new Set(params.orderedCodes);
  const isValid =
    params.orderedCodes.length === allCodes.length &&
    unique.size === allCodes.length &&
    params.orderedCodes.every((code) => allCodes.includes(code));
  if (!isValid) {
    return { ok: false, error: "ترتیب اولویت‌ها نامعتبر است." };
  }
  const before = await loadStep9Data({
    organizationId: params.organizationId,
    planPublicId: gate.plan.publicId,
  });
  await saveGuidanceStepData<Step9Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP9_CATEGORY,
    kind: STEP9_KIND,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    data: { orderedCodes: params.orderedCodes },
    filenamePrefix: "guidance-step9",
  });
  await logCounselorFieldEdits({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    planId: gate.plan.id,
    publicId: gate.plan.publicId,
    stepNumber: 9,
    reason: params.reason,
    changes: [
      {
        field: "priorityOrder",
        oldValue: before.orderedCodes.join(","),
        newValue: params.orderedCodes.join(","),
      },
    ],
  });
  return { ok: true };
}
