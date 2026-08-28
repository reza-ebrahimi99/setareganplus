export type WidgetDataSource =
  | "KPI"
  | "QUEUE"
  | "AUTOMATION"
  | "TRUTH"
  | "STATIC";

export type WidgetDefinition = {
  id: string;
  title: string;
  permissions: readonly string[];
  refreshIntervalSeconds: number;
  dataSource: WidgetDataSource;
  loaderKey: string;
  lazy?: boolean;
  emptyState: { title: string; description?: string };
  loadingState: { skeleton: "metric" | "list" | "chart" | "table" };
};

export type WidgetPayload = {
  id: string;
  title: string;
  permissions: readonly string[];
  refreshIntervalSeconds: number;
  dataSource: WidgetDataSource;
  status: "ok" | "empty" | "error" | "forbidden";
  emptyState: WidgetDefinition["emptyState"];
  loadingState: WidgetDefinition["loadingState"];
  data: unknown;
  fetchedAt: string;
  cache: { hit: boolean; ttlSeconds: number };
};

export type DashboardDefinition = {
  id: string;
  title: string;
  description?: string;
  permissions: readonly string[];
  widgetIds: readonly string[];
  defaultRefreshSeconds: number;
  cacheTtlSeconds: number;
};

export type DashboardComposeContext = {
  organizationId: string;
  viewerUserId: string;
  membershipId: string;
  permissions: ReadonlySet<string>;
  allBranches: boolean;
  branchIds: readonly string[];
  from: Date;
  to: Date;
  includeLazy: boolean;
  /** Opaque session for truth loaders that need full admin context */
  session?: unknown;
};

export const MIN_WIDGET_TTL_SECONDS = 30;
export const MAX_WIDGET_TTL_SECONDS = 900;
export const DEFAULT_WIDGET_TTL_SECONDS = 120;
