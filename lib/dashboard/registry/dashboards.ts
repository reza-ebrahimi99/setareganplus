import type { DashboardDefinition } from "@/lib/dashboard/contracts/widget";

export const DASHBOARD_REGISTRY: readonly DashboardDefinition[] = [
  {
    id: "manager",
    title: "نمای کلی مدیریت",
    description: "داشبورد مدیر پذیرش / CRM",
    permissions: ["reports.view", "crm.view_all"],
    widgetIds: [
      "manager_ops_metrics",
      "leads_today",
      "conversion",
      "revenue",
      "queue_assignment",
      "queue_follow_up",
      "queue_sla_breaches",
      "staff_performance_strip",
      "notifications",
      "automation_activity",
      "static_quick_actions",
      "static_readiness",
    ],
    defaultRefreshSeconds: 120,
    cacheTtlSeconds: 90,
  },
  {
    id: "advisor",
    title: "میز کار من",
    description: "داشبورد مشاور",
    permissions: ["crm.view_assigned"],
    widgetIds: [
      "workspace_board",
      "queue_follow_up",
      "queue_assignment",
      "notifications",
    ],
    defaultRefreshSeconds: 60,
    cacheTtlSeconds: 60,
  },
  {
    id: "executive",
    title: "نمای اجرایی",
    description: "درآمد و تبدیل سطح بالا",
    permissions: ["reports.view"],
    widgetIds: ["revenue", "conversion", "leads_today", "pipeline"],
    defaultRefreshSeconds: 180,
    cacheTtlSeconds: 120,
  },
  {
    id: "admissions",
    title: "پذیرش",
    description: "پایپ‌لاین و صف‌های عملیاتی",
    permissions: ["reports.view", "registrations.view"],
    widgetIds: [
      "pipeline",
      "queue_assignment",
      "queue_follow_up",
      "queue_sla_breaches",
      "leads_today",
    ],
    defaultRefreshSeconds: 90,
    cacheTtlSeconds: 90,
  },
  {
    id: "marketing",
    title: "بازاریابی",
    description: "حجم ورودی و لیدها",
    permissions: ["reports.view"],
    widgetIds: ["leads_today", "conversion", "queue_assignment"],
    defaultRefreshSeconds: 120,
    cacheTtlSeconds: 120,
  },
] as const;

const BY_ID = new Map(DASHBOARD_REGISTRY.map((d) => [d.id, d]));

export function getDashboardDefinition(
  id: string,
): DashboardDefinition | undefined {
  return BY_ID.get(id);
}

export function listDashboardDefinitions(): readonly DashboardDefinition[] {
  return DASHBOARD_REGISTRY;
}

export function isDashboardId(id: string): boolean {
  return BY_ID.has(id);
}
