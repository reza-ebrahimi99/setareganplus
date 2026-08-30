/**
 * Guidance Journey Engine Step 1 — Sanjesh admission quota categories.
 * Static reference data (same convention as onboarding-options.ts) — no DB table.
 */

export const GUIDANCE_QUOTA_OPTIONS = [
  { id: "NORMAL", label: "بدون سهمیه (آزاد)" },
  { id: "VETERAN_5", label: "سهمیه رزمنده / ایثارگر ۵٪" },
  { id: "VETERAN_25", label: "سهمیه ایثارگر ۲۵٪" },
  { id: "VETERAN_FAMILY", label: "فرزند و همسر شهدا" },
  { id: "COMBATANT_FAMILY", label: "فرزند و همسر جانباز و آزاده" },
  { id: "DISABLED", label: "سهمیه معلولین" },
  { id: "REMOTE_REGION", label: "سهمیه مناطق محروم" },
  { id: "OTHER", label: "سایر موارد" },
] as const;

export type GuidanceQuotaId = (typeof GUIDANCE_QUOTA_OPTIONS)[number]["id"];

export function isGuidanceQuotaId(value: string): value is GuidanceQuotaId {
  return GUIDANCE_QUOTA_OPTIONS.some((option) => option.id === value);
}

export function guidanceQuotaLabel(value: string): string {
  return (
    GUIDANCE_QUOTA_OPTIONS.find((option) => option.id === value)?.label ??
    value
  );
}
