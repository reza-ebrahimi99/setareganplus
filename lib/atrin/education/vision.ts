import type {
  EducationVisionInput,
  EducationVisionResult,
} from "@/lib/atrin/education/types";

/**
 * Vision preparation — OCR/handwriting not implemented yet.
 * Stable interface for future book/homework/exam image inputs.
 */
export function prepareEducationVisionInput(
  input: Omit<EducationVisionInput, "createdAt"> & { createdAt?: number },
): EducationVisionInput {
  return {
    ...input,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export async function analyzeEducationVision(
  input: EducationVisionInput,
): Promise<EducationVisionResult> {
  return {
    ok: false,
    reason: "not_implemented",
    input,
  };
}

export type EducationVisionAdapter = {
  readonly id: string;
  readonly supports: EducationVisionInput["kind"][];
  analyze(input: EducationVisionInput): Promise<EducationVisionResult>;
};

/** Registry placeholder for future OCR adapters. */
export const EDUCATION_VISION_ADAPTERS: EducationVisionAdapter[] = [];
