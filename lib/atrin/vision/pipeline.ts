/**
 * Vision pipeline — OCR → detections → curriculum match → education.
 * Interfaces / stubs only.
 */

import type {
  VisionAdapter,
  VisionAnalysisResult,
  VisionInput,
  VisionPipelineStage,
} from "@/lib/atrin/vision/types";

export const VISION_PIPELINE_STAGES: VisionPipelineStage[] = [
  "ocr",
  "page_detection",
  "formula_detection",
  "diagram_detection",
  "handwriting",
  "object_detection",
  "curriculum_matching",
  "education_engine",
];

export function prepareVisionInput(
  input: Omit<VisionInput, "createdAt"> & { createdAt?: number },
): VisionInput {
  return {
    ...input,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function emptyVisionAnalysis(
  input: VisionInput,
  reason: VisionAnalysisResult["reason"] = "not_implemented",
): VisionAnalysisResult {
  return {
    ok: false,
    reason,
    input,
    detectedPage: null,
    detectedSubject: null,
    detectedGrade: null,
    detectedFormulas: [],
    detectedFigures: [],
    detectedTables: [],
    detectedHandwriting: [],
    detectedChapterId: null,
    detectedLessonId: null,
    detectedExercise: null,
    curriculumItemIds: [],
    confidence: { overall: 0 },
  };
}

export async function analyzeVision(
  input: VisionInput,
): Promise<VisionAnalysisResult> {
  return emptyVisionAnalysis(input, "not_implemented");
}

/** Registry for future OCR / CV adapters. */
export const VISION_ADAPTERS: VisionAdapter[] = [];

export async function matchVisionToCurriculum(
  _analysis: VisionAnalysisResult,
): Promise<{ itemIds: string[]; confidence: number }> {
  return { itemIds: [], confidence: 0 };
}
