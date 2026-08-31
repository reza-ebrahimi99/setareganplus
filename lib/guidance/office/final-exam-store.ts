/**
 * Final-exam scores — JSON snapshot on the existing step-store (no new table).
 */

import {
  loadGuidanceStepData,
  saveGuidanceStepData,
} from "@/lib/guidance/journey/step-store";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import {
  buildFinalExamViews,
  deriveFinalExamSummary,
  normalizeScoreMap,
  subjectsForExamGroup,
  type FinalExamScoreMap,
  type FinalExamSummary,
} from "@/lib/guidance/office/final-exam";

export const FINAL_EXAM_CATEGORY = "guidance-final-exam-scores";
export const FINAL_EXAM_KIND = "guidance-final-exam-scores";

export type FinalExamStored = {
  examGroup: GuidanceExamGroup;
  scores: FinalExamScoreMap;
};

export async function loadFinalExamScores(params: {
  organizationId: string;
  planPublicId: string;
  examGroup: GuidanceExamGroup;
}): Promise<{ scores: FinalExamScoreMap; summary: FinalExamSummary }> {
  const stored = await loadGuidanceStepData<FinalExamStored>({
    organizationId: params.organizationId,
    category: FINAL_EXAM_CATEGORY,
    kind: FINAL_EXAM_KIND,
    planPublicId: params.planPublicId,
    validate: (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const obj = raw as Record<string, unknown>;
      return {
        examGroup: params.examGroup,
        scores: normalizeScoreMap(params.examGroup, obj.scores ?? obj),
      };
    },
  });
  const scores = stored.data?.scores ?? {};
  return {
    scores,
    summary: deriveFinalExamSummary(subjectsForExamGroup(params.examGroup), scores),
  };
}

export async function saveFinalExamScores(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  planPublicId: string;
  examGroup: GuidanceExamGroup;
  scores: FinalExamScoreMap;
}): Promise<{ summary: FinalExamSummary }> {
  const scores = normalizeScoreMap(params.examGroup, params.scores);
  await saveGuidanceStepData<FinalExamStored>({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    category: FINAL_EXAM_CATEGORY,
    kind: FINAL_EXAM_KIND,
    planId: params.planId,
    planPublicId: params.planPublicId,
    data: { examGroup: params.examGroup, scores },
    filenamePrefix: "guidance-final-exam",
  });
  return {
    summary: deriveFinalExamSummary(subjectsForExamGroup(params.examGroup), scores),
  };
}

export function isFinalExamComplete(
  examGroup: GuidanceExamGroup,
  scores: FinalExamScoreMap,
): boolean {
  return buildFinalExamViews(examGroup, scores).summary.complete;
}
