/**
 * Compile-time KPI catalog (Sprint 3).
 */

import type { KpiDefinition, KpiKey } from "@/lib/kpi/types";

const ALL_GRAINS = ["total", "day", "week", "month"] as const;

export const KPI_REGISTRY: readonly KpiDefinition[] = [
  {
    key: "attributed_revenue_rials",
    titleFa: "درآمد منتسب (ریال)",
    descriptionFa:
      "جمع amountRials از اسنپ‌شات‌های canonical ATTRIBUTED در بازه attributedAt.",
    unit: "rials",
    sources: ["SNAPSHOTS"],
    formulaKey: "sum_canonical_snapshot_amount",
    allowedDimensions: ["none", "attributedUserId", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "attributed_conversion_count",
    titleFa: "تعداد تبدیل منتسب",
    descriptionFa: "تعداد اسنپ‌شات‌های canonical ATTRIBUTED در بازه.",
    unit: "count",
    sources: ["SNAPSHOTS"],
    formulaKey: "count_canonical_snapshots",
    allowedDimensions: ["none", "attributedUserId", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "attributed_revenue_by_owner",
    titleFa: "درآمد منتسب به‌ازای مشاور",
    descriptionFa: "جمع درآمد canonical گروه‌بندی‌شده بر attributedUserId.",
    unit: "rials",
    sources: ["SNAPSHOTS"],
    formulaKey: "sum_canonical_snapshot_amount_by_owner",
    allowedDimensions: ["attributedUserId", "none", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "pending_attribution_count",
    titleFa: "اسنپ‌شات در انتظار انتساب",
    descriptionFa: "تعداد PENDING_ATTRIBUTION در بازه attributedAt.",
    unit: "count",
    sources: ["SNAPSHOTS"],
    formulaKey: "count_pending_snapshots",
    allowedDimensions: ["none", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "leads_created_count",
    titleFa: "لیدهای ایجادشده",
    descriptionFa: "تعداد لید با createdAt در بازه (Truth Spine).",
    unit: "count",
    sources: ["LEADS"],
    formulaKey: "count_leads_created",
    allowedDimensions: ["none", "ownerUserId", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "leads_owned_count",
    titleFa: "لیدهای دارای مالک",
    descriptionFa:
      "تعداد لید فعال با ownerUserId غیرخالی در لحظه پرس‌وجو؛ فیلتر شعبه اعمال می‌شود.",
    unit: "count",
    sources: ["LEADS"],
    formulaKey: "count_leads_owned",
    allowedDimensions: ["none", "ownerUserId", "branchId"],
    allowedGrains: ["total"],
  },
  {
    key: "owner_assignment_events",
    titleFa: "رویدادهای تخصیص مسئول",
    descriptionFa: "تعداد CrmActivity نوع OWNER_ASSIGNED در بازه occurredAt.",
    unit: "count",
    sources: ["CRM_ACTIVITIES"],
    formulaKey: "count_owner_assignment_events",
    allowedDimensions: ["none", "ownerUserId", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
  {
    key: "crm_converted_events",
    titleFa: "رویدادهای تبدیل CRM",
    descriptionFa: "تعداد CrmActivity نوع CONVERTED در بازه occurredAt.",
    unit: "count",
    sources: ["CRM_ACTIVITIES"],
    formulaKey: "count_crm_converted_events",
    allowedDimensions: ["none", "ownerUserId", "branchId"],
    allowedGrains: ALL_GRAINS,
  },
] as const;

const BY_KEY = new Map(KPI_REGISTRY.map((def) => [def.key, def]));

export function getKpiDefinition(key: string): KpiDefinition | undefined {
  return BY_KEY.get(key as KpiKey);
}

export function listKpiCatalog(): readonly KpiDefinition[] {
  return KPI_REGISTRY;
}

export function isKpiKey(value: string): value is KpiKey {
  return BY_KEY.has(value as KpiKey);
}
