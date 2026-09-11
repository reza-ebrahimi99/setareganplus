import { isSyntheticPlaceholderName } from "@/lib/guidance/journey-v2/steps/step1-validation";

/** Generic role label only — never a fabricated personal name. */
const GENERIC_STUDENT_GREETING = "دانش‌آموز";

export function guidanceDashboardGreetingName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return GENERIC_STUDENT_GREETING;
  if (isSyntheticPlaceholderName(collapsed)) return GENERIC_STUDENT_GREETING;
  const parts = collapsed.split(" ");
  if (parts.some((part) => isSyntheticPlaceholderName(part))) {
    return GENERIC_STUDENT_GREETING;
  }
  return collapsed;
}
