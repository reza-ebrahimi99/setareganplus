/**
 * Guidance Journey Engine — Step 10: AI Arrangement (Phase 1).
 *
 * Flow: system builds a structured export from every prior step → admin
 * downloads it and runs it through Entekhabium (external, manual, outside
 * this system) → admin/counselor pastes the resulting ~150 choices back in →
 * counselor reviews/edits → counselor approves → student sees the
 * proposed list and continues. Approval never auto-advances the student's
 * step — the student always explicitly continues from their own view.
 */

import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { advanceGuidanceJourneyStep } from "@/lib/guidance/journey/advance";
import {
  loadGuidanceJourneyPlanByPublicId,
} from "@/lib/guidance/journey/plan";
import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import { loadStep1Prefill } from "@/lib/guidance/journey/steps/step1-personal-info";
import { loadGuidanceStep2Session } from "@/lib/guidance/journey/steps/step2-interest-assessment";
import { loadStep5Prefill } from "@/lib/guidance/journey/steps/step5-exam-results";
import { loadStep6Data } from "@/lib/guidance/journey/steps/step6-education-preferences";
import { loadStep7Data } from "@/lib/guidance/journey/steps/step7-city-preferences";
import { loadStep8Data } from "@/lib/guidance/journey/steps/step8-major-preferences";
import { loadStep9Data } from "@/lib/guidance/journey/steps/step9-priority-weights";
import { getMajorsForExamGroup } from "@/lib/guidance/journey/reference-data/majors";
import { guidanceEducationTypeLabel } from "@/lib/guidance/journey/reference-data/education-types";
import { GUIDANCE_PRIORITY_FACTORS } from "@/lib/guidance/journey/reference-data/priority-factors";

export const STEP10_CATEGORY = "guidance-journey-step10";
export const STEP10_KIND = "guidance-journey-step10";

export type GuidanceMajorChoiceRow = {
  id: string;
  rank: number;
  university: string;
  major: string;
  city: string;
  educationType: string;
  source: "AI" | "COUNSELOR";
  notes: string;
};

export type Step10Data = {
  choices: GuidanceMajorChoiceRow[];
  exportedAtIso: string | null;
  importedAtIso: string | null;
};

function emptyStep10Data(): Step10Data {
  return { choices: [], exportedAtIso: null, importedAtIso: null };
}

function validateStoredData(raw: unknown): Step10Data | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.choices)) return null;
  const choices: GuidanceMajorChoiceRow[] = [];
  for (const entry of obj.choices) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") continue;
    choices.push({
      id: e.id,
      rank: typeof e.rank === "number" ? e.rank : choices.length + 1,
      university: typeof e.university === "string" ? e.university : "",
      major: typeof e.major === "string" ? e.major : "",
      city: typeof e.city === "string" ? e.city : "",
      educationType: typeof e.educationType === "string" ? e.educationType : "",
      source: e.source === "COUNSELOR" ? "COUNSELOR" : "AI",
      notes: typeof e.notes === "string" ? e.notes : "",
    });
  }
  return {
    choices,
    exportedAtIso: typeof obj.exportedAtIso === "string" ? obj.exportedAtIso : null,
    importedAtIso: typeof obj.importedAtIso === "string" ? obj.importedAtIso : null,
  };
}

export async function loadGuidanceStep10Data(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Step10Data> {
  const stored = await loadGuidanceStepData<Step10Data>({
    organizationId: params.organizationId,
    category: STEP10_CATEGORY,
    kind: STEP10_KIND,
    planPublicId: params.planPublicId,
    validate: validateStoredData,
  });
  return stored.data ?? emptyStep10Data();
}

/**
 * Builds the structured JSON package an admin exports and feeds into
 * Entekhabium manually. Pure aggregation of prior-step data — no AI call.
 */
export async function buildGuidanceAiExportPayload(params: {
  organizationId: string;
  planPublicId: string;
}): Promise<Record<string, unknown> | null> {
  const plan = await loadGuidanceJourneyPlanByPublicId({
    organizationId: params.organizationId,
    publicId: params.planPublicId,
  });
  if (!plan) return null;

  const [personalInfo, interest, examResult, education, cities, majors, priorities] =
    await Promise.all([
      loadStep1Prefill({ organizationId: params.organizationId, planPublicId: params.planPublicId }),
      loadGuidanceStep2Session({ organizationId: params.organizationId, planPublicId: params.planPublicId }),
      loadStep5Prefill({ organizationId: params.organizationId, planPublicId: params.planPublicId }),
      loadStep6Data({ organizationId: params.organizationId, planPublicId: params.planPublicId }),
      loadStep7Data({
        organizationId: params.organizationId,
        planPublicId: params.planPublicId,
        homeProvince: null,
      }),
      loadStep8Data({
        organizationId: params.organizationId,
        planPublicId: params.planPublicId,
        examGroup: plan.examGroup,
      }),
      loadStep9Data({ organizationId: params.organizationId, planPublicId: params.planPublicId }),
    ]);

  const majorLabelByCode = new Map(
    getMajorsForExamGroup(plan.examGroup).map((m) => [m.code, m.label]),
  );
  const priorityLabelByCode = new Map<string, string>(
    GUIDANCE_PRIORITY_FACTORS.map((f) => [f.code, f.label]),
  );

  return {
    generatedAtIso: new Date().toISOString(),
    plan: {
      publicId: plan.publicId,
      examGroup: plan.examGroup,
      quota: plan.quota,
      highSchoolAverage: plan.highSchoolAverage,
    },
    identity: {
      nationalId: personalInfo.nationalId ?? null,
      gender: personalInfo.gender ?? null,
      province: personalInfo.province ?? null,
    },
    interestProfile: interest.result
      ? {
          personalityTitle: interest.result.personality.title,
          categoryScores: interest.result.categoryScores,
          suitableMajors: interest.result.suitableMajors,
        }
      : null,
    examResult: examResult
      ? {
          nationalRank: examResult.nationalRank,
          regionalRank: examResult.regionalRank,
          quotaRank: examResult.quotaRank,
          score: examResult.score,
        }
      : null,
    educationTypePreferences: education.items
      .filter((item) => item.enabled)
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({ code: item.code, label: guidanceEducationTypeLabel(item.code) })),
    cityPreferences: cities.items
      .filter((item) => item.enabled)
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({ province: item.province, cities: item.cities })),
    majorPreferences: majors.items
      .filter((item) => item.enabled)
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({
        code: item.code,
        label: majorLabelByCode.get(item.code) ?? item.code,
        favorite: item.favorite,
      })),
    priorityWeights: priorities.orderedCodes.map((code, index) => ({
      code,
      label: priorityLabelByCode.get(code) ?? code,
      weightRank: index + 1,
    })),
  };
}

export type ImportChoicesResult = { ok: true; count: number } | { ok: false; error: string };

/** Admin/counselor pastes the ~150 choices received back from Entekhabium. */
export async function importGuidanceMajorChoices(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  rawJson: string;
}): Promise<ImportChoicesResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(params.rawJson);
  } catch {
    return { ok: false, error: "متن ورودی JSON معتبر نیست." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, error: "باید یک آرایه غیرخالی از گزینه‌ها باشد." };
  }

  const choices: GuidanceMajorChoiceRow[] = parsed.map((entry, index) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return {
      id: `choice-${index + 1}`,
      rank: typeof e.rank === "number" ? e.rank : index + 1,
      university: typeof e.university === "string" ? e.university : "",
      major: typeof e.major === "string" ? e.major : "",
      city: typeof e.city === "string" ? e.city : "",
      educationType: typeof e.educationType === "string" ? e.educationType : "",
      source: "AI",
      notes: typeof e.notes === "string" ? e.notes : "",
    };
  });

  await saveGuidanceStepData<Step10Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP10_CATEGORY,
    kind: STEP10_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { choices, exportedAtIso: new Date().toISOString(), importedAtIso: new Date().toISOString() },
    filenamePrefix: "guidance-step10",
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_MAJOR_CHOICES_IMPORTED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, count: choices.length },
    },
  });

  return { ok: true, count: choices.length };
}

export type UpdateChoiceResult = { ok: true } | { ok: false; error: string };

export async function updateGuidanceMajorChoiceRow(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  choiceId: string;
  patch: Partial<Pick<GuidanceMajorChoiceRow, "university" | "major" | "city" | "educationType" | "rank" | "notes">>;
}): Promise<UpdateChoiceResult> {
  const current = await loadGuidanceStep10Data({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
  });

  const index = current.choices.findIndex((c) => c.id === params.choiceId);
  if (index === -1) {
    return { ok: false, error: "این گزینه یافت نشد." };
  }

  current.choices[index] = {
    ...current.choices[index]!,
    ...params.patch,
    source: "COUNSELOR",
  };

  await saveGuidanceStepData<Step10Data>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: STEP10_CATEGORY,
    kind: STEP10_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: current,
    filenamePrefix: "guidance-step10",
  });

  return { ok: true };
}

export type ApproveChoicesResult = { ok: true } | { ok: false; error: string };

export async function approveGuidanceMajorChoices(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
}): Promise<ApproveChoicesResult> {
  const data = await loadGuidanceStep10Data({
    organizationId: params.organizationId,
    planPublicId: params.planPublicId,
  });
  if (data.choices.length === 0) {
    return { ok: false, error: "قبل از تأیید، ابتدا گزینه‌ها را وارد کن." };
  }

  await prisma.guidancePlan.update({
    where: { id: params.planId },
    data: {
      choicesApprovedAt: new Date(),
      choicesApprovedByUserId: params.actorUserId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: AuditAction.GUIDANCE_MAJOR_CHOICES_APPROVED,
      entityType: "GuidancePlan",
      entityId: params.planId,
      metadata: { publicId: params.planPublicId, count: data.choices.length },
    },
  });

  return { ok: true };
}

export type CompleteStep10Result = { ok: true } | { ok: false; error: string };

/** Student side — only allowed once the counselor has approved the list. */
export async function completeGuidanceStep10(params: {
  organizationId: string;
  actorUserId: string;
  studentId: string;
  planId: string;
  planPublicId: string;
  choicesApprovedAtIso: string | null;
}): Promise<CompleteStep10Result> {
  if (!params.choicesApprovedAtIso) {
    return { ok: false, error: "چیدمان هنوز توسط مشاور تأیید نشده است." };
  }

  const advanced = await advanceGuidanceJourneyStep({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    studentId: params.studentId,
    stepId: 10,
  });
  if (!advanced.ok) return { ok: false, error: advanced.error };

  return { ok: true };
}
