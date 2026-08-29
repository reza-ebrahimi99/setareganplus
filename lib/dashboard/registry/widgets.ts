import type { WidgetDefinition } from "@/lib/dashboard/contracts/widget";

const metricEmpty = {
  title: "داده‌ای نیست",
  description: "هنوز مقداری برای این شاخص ثبت نشده است.",
};
const listEmpty = {
  title: "صف خالی است",
  description: "موردی برای نمایش وجود ندارد.",
};

export const WIDGET_REGISTRY: readonly WidgetDefinition[] = [
  {
    id: "leads_today",
    title: "لیدهای امروز",
    permissions: ["reports.view"],
    refreshIntervalSeconds: 120,
    dataSource: "KPI",
    loaderKey: "kpi_leads_today",
    emptyState: metricEmpty,
    loadingState: { skeleton: "metric" },
  },
  {
    id: "conversion",
    title: "تبدیل",
    permissions: ["reports.view"],
    refreshIntervalSeconds: 180,
    dataSource: "KPI",
    loaderKey: "kpi_conversion",
    emptyState: metricEmpty,
    loadingState: { skeleton: "metric" },
  },
  {
    id: "revenue",
    title: "درآمد منتسب",
    permissions: ["reports.view"],
    refreshIntervalSeconds: 180,
    dataSource: "KPI",
    loaderKey: "kpi_revenue",
    emptyState: metricEmpty,
    loadingState: { skeleton: "metric" },
  },
  {
    id: "pipeline",
    title: "پایپ‌لاین",
    permissions: ["reports.view", "crm.view_all"],
    refreshIntervalSeconds: 120,
    dataSource: "KPI",
    loaderKey: "kpi_pipeline",
    emptyState: metricEmpty,
    loadingState: { skeleton: "chart" },
  },
  {
    id: "manager_ops_metrics",
    title: "شاخص‌های عملیاتی مدیر",
    permissions: ["reports.view", "crm.view_all"],
    refreshIntervalSeconds: 90,
    dataSource: "TRUTH",
    loaderKey: "truth_manager_ops",
    emptyState: metricEmpty,
    loadingState: { skeleton: "metric" },
  },
  {
    id: "staff_performance_strip",
    title: "عملکرد تماس همکاران امروز",
    permissions: ["reports.view", "crm.view_all"],
    refreshIntervalSeconds: 120,
    dataSource: "TRUTH",
    loaderKey: "truth_staff_calls_today",
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "queue_assignment",
    title: "صف تخصیص",
    permissions: ["crm.view_assigned"],
    refreshIntervalSeconds: 60,
    dataSource: "QUEUE",
    loaderKey: "queue_assignment",
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "queue_follow_up",
    title: "صف پیگیری",
    permissions: ["crm.view_assigned"],
    refreshIntervalSeconds: 60,
    dataSource: "QUEUE",
    loaderKey: "queue_follow_up",
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "queue_sla_breaches",
    title: "نقض SLA",
    permissions: ["crm.view_all"],
    refreshIntervalSeconds: 60,
    dataSource: "QUEUE",
    loaderKey: "queue_sla",
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "automation_activity",
    title: "فعالیت اتوماسیون",
    permissions: ["automations.manage"],
    refreshIntervalSeconds: 120,
    dataSource: "AUTOMATION",
    loaderKey: "automation_activity",
    lazy: true,
    emptyState: metricEmpty,
    loadingState: { skeleton: "metric" },
  },
  {
    id: "notifications",
    title: "اعلان‌ها",
    permissions: ["crm.view_assigned"],
    refreshIntervalSeconds: 60,
    dataSource: "AUTOMATION",
    loaderKey: "automation_notifications",
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "workspace_board",
    title: "میز کار مشاور",
    permissions: ["crm.view_assigned"],
    refreshIntervalSeconds: 60,
    dataSource: "TRUTH",
    loaderKey: "truth_workspace",
    emptyState: listEmpty,
    loadingState: { skeleton: "table" },
  },
  {
    id: "static_readiness",
    title: "آمادگی فنی سکو",
    permissions: ["reports.view"],
    refreshIntervalSeconds: 600,
    dataSource: "STATIC",
    loaderKey: "static_readiness",
    lazy: true,
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
  {
    id: "static_quick_actions",
    title: "دسترسی سریع",
    permissions: ["reports.view"],
    refreshIntervalSeconds: 600,
    dataSource: "STATIC",
    loaderKey: "static_quick_actions",
    lazy: true,
    emptyState: listEmpty,
    loadingState: { skeleton: "list" },
  },
] as const;

const BY_ID = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]));

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return BY_ID.get(id);
}

export function listWidgetDefinitions(): readonly WidgetDefinition[] {
  return WIDGET_REGISTRY;
}

export function isWidgetId(id: string): boolean {
  return BY_ID.has(id);
}
