/**
 * Smart filter presets for the booklet operations center.
 * Saved custom presets live in localStorage (client only).
 */

export const COMMERCE_OPS_PRESET_STORAGE_KEY = "staros.commerce-ops.presets.v1";

export type CommerceOpsPresetId =
  | "today"
  | "readyToday"
  | "delayed"
  | "mine"
  | "girls"
  | "boys"
  | "elementary"
  | "production"
  | "deliveredToday"
  | "priority";

export type CommerceOpsPreset = {
  id: CommerceOpsPresetId | string;
  label: string;
  query: Record<string, string>;
};

export const COMMERCE_OPS_BUILTIN_PRESETS: readonly CommerceOpsPreset[] = [
  { id: "today", label: "سفارش امروز", query: { today: "1" } },
  { id: "readyToday", label: "آماده امروز", query: { ready: "1" } },
  { id: "delayed", label: "معوق", query: { delayed: "1" } },
  { id: "mine", label: "سفارش‌های من", query: { mine: "1" } },
  { id: "production", label: "تولید", query: { opsStage: "IN_PRODUCTION" } },
  { id: "deliveredToday", label: "تحویل امروز", query: { deliveredToday: "1" } },
  { id: "priority", label: "بر اساس اولویت", query: { sort: "priority" } },
];

export function commerceOpsPresetHref(
  query: Record<string, string>,
  extras?: Record<string, string>,
): string {
  const params = new URLSearchParams({ ...query, ...extras });
  const qs = params.toString();
  return qs ? `/admin/commerce/orders?${qs}` : "/admin/commerce/orders";
}
