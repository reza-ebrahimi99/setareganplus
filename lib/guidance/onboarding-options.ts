/**
 * Client-safe Guidance onboarding option lists.
 * No Prisma, no Node APIs, no server-only modules — safe for Client Components
 * and for shared validation on the server.
 */

import {
  GUIDANCE_EXAM_GROUPS,
  type GuidanceExamGroup,
} from "@/lib/guidance/types";

/** Provisional exam group until onboarding maps high-school major (matches external-candidate). */
export const ONBOARDING_PROVISIONAL_EXAM_GROUP =
  "EXPERIMENTAL_SCIENCES" as const satisfies GuidanceExamGroup;

export const HIGH_SCHOOL_MAJOR_OPTIONS = [
  {
    id: "math",
    label: "ریاضی",
    examGroup: "MATHEMATICS" as const satisfies GuidanceExamGroup,
  },
  {
    id: "experimental",
    label: "تجربی",
    examGroup: "EXPERIMENTAL_SCIENCES" as const satisfies GuidanceExamGroup,
  },
  {
    id: "humanities",
    label: "انسانی",
    examGroup: "HUMANITIES" as const satisfies GuidanceExamGroup,
  },
  {
    id: "technical",
    label: "فنی",
    examGroup: "MATHEMATICS" as const satisfies GuidanceExamGroup,
  },
  {
    id: "other",
    label: "سایر",
    examGroup: ONBOARDING_PROVISIONAL_EXAM_GROUP,
  },
] as const;

export type HighSchoolMajorId =
  (typeof HIGH_SCHOOL_MAJOR_OPTIONS)[number]["id"];

export type HighSchoolMajorOption = {
  id: HighSchoolMajorId | string;
  label: string;
};

/** Serializable major rows for Client Component props (no examGroup required in UI). */
export function listHighSchoolMajorOptionsForForm(): readonly HighSchoolMajorOption[] {
  return HIGH_SCHOOL_MAJOR_OPTIONS.map((row) => ({
    id: row.id,
    label: row.label,
  }));
}

export function isGuidanceExamGroup(
  value: string,
): value is GuidanceExamGroup {
  return (GUIDANCE_EXAM_GROUPS as readonly string[]).includes(value);
}
