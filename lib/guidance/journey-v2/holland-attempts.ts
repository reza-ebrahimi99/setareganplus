/**
 * Holland attempt SoR — load, compare, active basis.
 */

import { prisma } from "@/lib/prisma";
import {
  computeAssessmentResult,
  type AssessmentAnswers,
  type AssessmentResult,
} from "@/lib/guidance/journey/assessment/scoring";
import { loadGuidanceStepDataFromAsset } from "@/lib/guidance/journey/step-store";

const CATEGORY = "guidance-v2-interest-assessment";
const KIND = "guidance-v2-interest-assessment";

function validateAnswers(raw: unknown): AssessmentAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const answers: AssessmentAnswers = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number" && value >= 1 && value <= 5) {
      answers[key] = value;
    }
  }
  return Object.keys(answers).length > 0 ? answers : null;
}

export type HollandAttemptView = {
  id: string;
  attemptNumber: number;
  completedAtIso: string | null;
  isActiveBasis: boolean;
  isPending: boolean;
  result: AssessmentResult | null;
  code: string | null;
  mediaAssetId: string;
};

export async function loadHollandAttemptsForPlan(params: {
  organizationId: string;
  planId: string;
}): Promise<HollandAttemptView[]> {
  const rows = await prisma.guidanceHollandAttempt.findMany({
    where: { organizationId: params.organizationId, planId: params.planId },
    orderBy: { attemptNumber: "asc" },
  });

  const views: HollandAttemptView[] = [];
  for (const row of rows) {
    let result: AssessmentResult | null = null;
    if (row.completedAt) {
      const loaded = await loadGuidanceStepDataFromAsset<AssessmentAnswers>({
        mediaAssetId: row.mediaAssetId,
        kind: KIND,
        validate: validateAnswers,
      });
      if (loaded.data) {
        try {
          result = computeAssessmentResult(loaded.data);
        } catch {
          result = null;
        }
      }
    }
    views.push({
      id: row.id,
      attemptNumber: row.attemptNumber,
      completedAtIso: row.completedAt?.toISOString() ?? null,
      isActiveBasis: row.isActiveBasis,
      isPending: !row.completedAt,
      result,
      code: result?.personality.primaryCategoryId ?? null,
      mediaAssetId: row.mediaAssetId,
    });
  }
  return views;
}

export async function loadActiveHollandResult(params: {
  organizationId: string;
  planId: string;
}): Promise<AssessmentResult | null> {
  const basis = await prisma.guidanceHollandAttempt.findFirst({
    where: {
      organizationId: params.organizationId,
      planId: params.planId,
      isActiveBasis: true,
      completedAt: { not: null },
    },
  });
  if (!basis) {
    const latest = await prisma.guidanceHollandAttempt.findFirst({
      where: {
        organizationId: params.organizationId,
        planId: params.planId,
        completedAt: { not: null },
      },
      orderBy: { attemptNumber: "desc" },
    });
    if (!latest) return null;
    const loaded = await loadGuidanceStepDataFromAsset<AssessmentAnswers>({
      mediaAssetId: latest.mediaAssetId,
      kind: KIND,
      validate: validateAnswers,
    });
    return loaded.data ? computeAssessmentResult(loaded.data) : null;
  }
  const loaded = await loadGuidanceStepDataFromAsset<AssessmentAnswers>({
    mediaAssetId: basis.mediaAssetId,
    kind: KIND,
    validate: validateAnswers,
  });
  return loaded.data ? computeAssessmentResult(loaded.data) : null;
}
