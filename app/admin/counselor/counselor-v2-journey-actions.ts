"use server";

import { revalidatePath } from "next/cache";
import {
  assertCounselorCanAccessStudent,
  requireCounselorContext,
} from "@/lib/counselor-os/auth";
import {
  counselorV2EditGenericJson,
  counselorV2EditStep1,
  counselorV2EditStep2,
} from "@/lib/counselor-os/counselor-v2-step-edits";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { loadGuidanceV2Step1 } from "@/lib/guidance/journey-v2/steps/step1-personal-info";
import { loadGuidanceV2Step2 } from "@/lib/guidance/journey-v2/steps/step2-exam-groups";
import {
  validateGuidanceV2Step1Input,
  type GuidanceV2Step1Input,
} from "@/lib/guidance/journey-v2/steps/step1-validation";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { composeStudentFullName } from "@/lib/website/student-slug";
import { prisma } from "@/lib/prisma";
import type { JourneyV2FormState } from "@/app/portal/student/services/guidance/journey/steps/actions/step1";
import {
  ASSESSMENT_QUESTIONS,
} from "@/lib/guidance/journey/assessment/question-bank";
import {
  computeAssessmentResult,
  isAssessmentComplete,
  type AssessmentAnswers,
} from "@/lib/guidance/journey/assessment/scoring";
import { recordCounselorStepEdit } from "@/lib/guidance/journey-v2/step-review/service";
import { loadGuidanceV2Step6 } from "@/lib/guidance/journey-v2/steps/step6-education-preferences";
import { loadGuidanceV2Step7 } from "@/lib/guidance/journey-v2/steps/step7-city-preferences";
import { loadGuidanceV2Step8 } from "@/lib/guidance/journey-v2/steps/step8-major-preferences";
import { loadGuidanceV2Step9 } from "@/lib/guidance/journey-v2/steps/step9-priority-factors";
import type { EducationPreferenceItem } from "@/lib/guidance/journey/steps/step6-education-preferences";
import type { ProvincePreferenceItem } from "@/lib/guidance/journey/steps/step7-city-preferences";
import type { MajorPreferenceItem } from "@/lib/guidance/journey/steps/step8-major-preferences";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function editReason(formData: FormData): string {
  return field(formData, "editReason").trim();
}

function revalidateJourney(studentId: string, step: number) {
  revalidatePath(`/admin/counselor/students/${studentId}`);
  revalidatePath(`/admin/counselor/students/${studentId}/journey/${step}`);
}

async function gate(studentId: string) {
  const ctx = await requireCounselorContext();
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
    isSupervisor: ctx.isSupervisor,
  });
  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan) return { ok: false as const, error: "پرونده V2 یافت نشد." };
  return { ok: true as const, ctx, plan };
}

export async function counselorV2JourneyStep1Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  if (!studentId) return { error: "شناسه دانش‌آموز نامعتبر است." };
  if (!reason) return { error: "دلیل ویرایش الزامی است." };

  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };

  const input: GuidanceV2Step1Input = {
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    nationalId: field(formData, "nationalId"),
    gender: field(formData, "gender"),
    birthDateJalali: field(formData, "birthDateJalali"),
    nativeProvince: field(formData, "nativeProvince"),
    regionQuota: field(formData, "regionQuota"),
    specialQuota: field(formData, "specialQuota"),
    highSchoolAverage: field(formData, "highSchoolAverage"),
    alternateMobile: field(formData, "alternateMobile"),
  };
  const validated = validateGuidanceV2Step1Input(input);
  if (!validated.ok) {
    return { error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const fullName = composeStudentFullName(validated.data.firstName, validated.data.lastName);
  await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        fullName,
      },
    }),
  ]);

  const result = await counselorV2EditStep1({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    data: { ...validated.data, alternateMobile: validated.data.alternateMobile ?? "" },
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(studentId, 1);
  return { ok: true };
}

const PRIMARY = new Set(["MATHEMATICS", "EXPERIMENTAL_SCIENCES", "HUMANITIES"]);
const SECONDARY = new Set(["ARTS", "LANGUAGES"]);

export async function counselorV2JourneyStep2Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  if (!studentId) return { error: "شناسه دانش‌آموز نامعتبر است." };
  if (!reason) return { error: "دلیل ویرایش الزامی است." };
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };

  const primary = field(formData, "primary");
  const secondary = formData.getAll("secondary").map(String).filter((v) => SECONDARY.has(v));
  if (!PRIMARY.has(primary)) return { error: "گروه آزمایشی اصلی نامعتبر است." };

  const result = await counselorV2EditStep2({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    data: { primary: primary as import("@/lib/guidance/journey-v2/steps/step2-exam-groups").GuidanceV2Step2Data["primary"], secondary: secondary as import("@/lib/guidance/journey-v2/steps/step2-exam-groups").GuidanceV2Step2Data["secondary"] },
  });
  if (!result.ok) return { error: result.error };
  await prisma.guidancePlan.update({
    where: { id: g.plan.id },
    data: { examGroup: primary as never },
  });
  revalidateJourney(studentId, 2);
  return { ok: true };
}

function parseHollandAnswers(formData: FormData): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const question of ASSESSMENT_QUESTIONS) {
    const value = Number(formData.get(`q_${question.id}`));
    if (Number.isFinite(value) && value >= 1 && value <= 5) {
      answers[question.id] = value;
    }
  }
  return answers;
}

export async function counselorV2JourneyStep4Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  if (!studentId || !reason) return { error: "دلیل ویرایش و شناسه دانش‌آموز الزامی است." };
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };

  const answers = parseHollandAnswers(formData);
  if (!isAssessmentComplete(answers)) {
    return { error: "پاسخ به همه سؤالات الزامی است." };
  }

  const beforeAnswers = await loadGuidanceStepData<AssessmentAnswers>({
    organizationId: g.ctx.organizationId,
    category: "guidance-v2-interest-assessment",
    kind: "guidance-v2-interest-assessment",
    planPublicId: g.plan.publicId,
    validate: (raw) => (raw && typeof raw === "object" ? (raw as AssessmentAnswers) : null),
  });

  const saved = await saveGuidanceStepData({
    organizationId: g.ctx.organizationId,
    actorUserId: g.ctx.userId,
    category: "guidance-v2-interest-assessment",
    kind: "guidance-v2-interest-assessment",
    planId: g.plan.id,
    planPublicId: g.plan.publicId,
    data: answers,
    filenamePrefix: "guidance-v2-interest-counselor",
  });

  const basis = await prisma.guidanceHollandAttempt.findFirst({
    where: {
      organizationId: g.ctx.organizationId,
      planId: g.plan.id,
      isActiveBasis: true,
      completedAt: { not: null },
    },
  });
  if (basis) {
    await prisma.guidanceHollandAttempt.update({
      where: { id: basis.id },
      data: { mediaAssetId: saved.mediaAssetId },
    });
  }

  const beforeResult = beforeAnswers.data ? computeAssessmentResult(beforeAnswers.data) : null;
  const afterResult = computeAssessmentResult(answers);

  const edit = await recordCounselorStepEdit({
    organizationId: g.ctx.organizationId,
    studentId,
    stepNumber: 4,
    counselorUserId: g.ctx.userId,
    reason,
    beforeSnapshot: beforeResult
      ? { code: beforeResult.personality.primaryCategoryId, title: beforeResult.personality.title }
      : {},
    afterSnapshot: { code: afterResult.personality.primaryCategoryId, title: afterResult.personality.title },
  });
  if (!edit.ok) return { error: edit.error };
  revalidateJourney(studentId, 4);
  return { ok: true };
}

export async function counselorV2JourneyStep6Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  const raw = formData.get("payload");
  if (!studentId || !reason || typeof raw !== "string") {
    return { error: "داده یا دلیل ویرایش نامعتبر است." };
  }
  const items = JSON.parse(raw) as EducationPreferenceItem[];
  if (!Array.isArray(items)) return { error: "فرمت دوره‌های تحصیلی نامعتبر است." };
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };
  const before = await loadGuidanceV2Step6({
    organizationId: g.ctx.organizationId,
    planPublicId: g.plan.publicId,
  });
  const result = await counselorV2EditGenericJson({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    stepNumber: 6,
    category: "guidance-journey-step6",
    kind: "guidance-journey-step6",
    filenamePrefix: "guidance-v2-step6",
    before: before,
    after: { items },
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(studentId, 6);
  return { ok: true };
}

export async function counselorV2JourneyStep7Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  const raw = formData.get("payload");
  if (!studentId || !reason || typeof raw !== "string") {
    return { error: "داده یا دلیل ویرایش نامعتبر است." };
  }
  const items = JSON.parse(raw) as ProvincePreferenceItem[];
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };
  const before = await loadGuidanceV2Step7({
    organizationId: g.ctx.organizationId,
    planPublicId: g.plan.publicId,
    homeProvince: null,
  });
  const result = await counselorV2EditGenericJson({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    stepNumber: 7,
    category: "guidance-journey-step7",
    kind: "guidance-journey-step7",
    filenamePrefix: "guidance-v2-step7",
    before: before,
    after: { items },
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(studentId, 7);
  return { ok: true };
}

export async function counselorV2JourneyStep8Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  const raw = formData.get("payload");
  if (!studentId || !reason || typeof raw !== "string") {
    return { error: "داده یا دلیل ویرایش نامعتبر است." };
  }
  const items = JSON.parse(raw) as MajorPreferenceItem[];
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };
  const before = await loadGuidanceV2Step8({
    organizationId: g.ctx.organizationId,
    planPublicId: g.plan.publicId,
    examGroups: [g.plan.examGroup],
  });
  const result = await counselorV2EditGenericJson({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    stepNumber: 8,
    category: "guidance-journey-step8",
    kind: "guidance-journey-step8",
    filenamePrefix: "guidance-v2-step8",
    before: before,
    after: { items },
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(studentId, 8);
  return { ok: true };
}

export async function counselorV2JourneyStep9Action(
  _prev: JourneyV2FormState,
  formData: FormData,
): Promise<JourneyV2FormState> {
  const studentId = field(formData, "studentId");
  const reason = editReason(formData);
  const raw = formData.get("payload");
  if (!studentId || !reason || typeof raw !== "string") {
    return { error: "داده یا دلیل ویرایش نامعتبر است." };
  }
  const orderedCodes = JSON.parse(raw) as string[];
  const g = await gate(studentId);
  if (!g.ok) return { error: g.error };
  const before = await loadGuidanceV2Step9({
    organizationId: g.ctx.organizationId,
    planPublicId: g.plan.publicId,
  });
  const result = await counselorV2EditGenericJson({
    organizationId: g.ctx.organizationId,
    studentId,
    counselorUserId: g.ctx.userId,
    reason,
    stepNumber: 9,
    category: "guidance-journey-step9",
    kind: "guidance-journey-step9",
    filenamePrefix: "guidance-v2-step9",
    before: before,
    after: { orderedCodes },
  });
  if (!result.ok) return { error: result.error };
  revalidateJourney(studentId, 9);
  return { ok: true };
}
