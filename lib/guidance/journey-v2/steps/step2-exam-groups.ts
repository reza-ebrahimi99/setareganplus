import { loadGuidanceStepData } from "@/lib/guidance/journey/step-store";

export type GuidanceV2ExamGroup =
  | "MATHEMATICS"
  | "EXPERIMENTAL_SCIENCES"
  | "HUMANITIES"
  | "ARTS"
  | "LANGUAGES";

export type GuidanceV2Step2Data = {
  primary: GuidanceV2ExamGroup;
  secondary: GuidanceV2ExamGroup[];
};

const GROUPS = new Set<GuidanceV2ExamGroup>([
  "MATHEMATICS",
  "EXPERIMENTAL_SCIENCES",
  "HUMANITIES",
  "ARTS",
  "LANGUAGES",
]);

function isGroup(value: unknown): value is GuidanceV2ExamGroup {
  return typeof value === "string" &&
    GROUPS.has(value as GuidanceV2ExamGroup);
}

function validate(raw: unknown): GuidanceV2Step2Data | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  if (!isGroup(obj.primary)) return null;

  const secondary = Array.isArray(obj.secondary)
    ? obj.secondary.filter(isGroup)
    : [];

  return {
    primary: obj.primary,
    secondary,
  };
}

export async function loadGuidanceV2Step2(params: {
  organizationId: string;
  planPublicId: string;
  fallbackPrimary?: string | null;
}) {
  const stored = await loadGuidanceStepData<GuidanceV2Step2Data>({
    organizationId: params.organizationId,
    category: "guidance-journey-v2-step2",
    kind: "guidance-journey-v2-step2",
    planPublicId: params.planPublicId,
    validate,
  });

  if (stored.data) return stored;

  const fallback = isGroup(params.fallbackPrimary)
    ? {
        primary: params.fallbackPrimary,
        secondary: [],
      }
    : null;

  return {
    ...stored,
    data: fallback,
  };
}
