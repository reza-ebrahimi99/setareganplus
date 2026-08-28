import {
  buildWidgetCacheKey,
  clampWidgetTtlSeconds,
  readWidgetCache,
  writeWidgetCache,
} from "@/lib/dashboard/cache";
import type {
  DashboardComposeContext,
  DashboardDefinition,
  WidgetDefinition,
  WidgetPayload,
} from "@/lib/dashboard/contracts/widget";
import { getWidgetLoader } from "@/lib/dashboard/loaders";
import {
  canViewDashboard,
  canViewWidget,
} from "@/lib/dashboard/permissions/filter";
import { getDashboardDefinition } from "@/lib/dashboard/registry/dashboards";
import { getWidgetDefinition } from "@/lib/dashboard/registry/widgets";

function isEmptyData(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.value === "number") return obj.value === 0;
    if (typeof obj.count === "number") return obj.count === 0;
    if (Array.isArray(obj.items)) return obj.items.length === 0;
    if (Array.isArray(obj.latest)) return obj.latest.length === 0;
  }
  return false;
}

function basePayload(
  def: WidgetDefinition,
  patch: Partial<WidgetPayload>,
): WidgetPayload {
  return {
    id: def.id,
    title: def.title,
    permissions: def.permissions,
    refreshIntervalSeconds: def.refreshIntervalSeconds,
    dataSource: def.dataSource,
    status: "ok",
    emptyState: def.emptyState,
    loadingState: def.loadingState,
    data: null,
    fetchedAt: new Date().toISOString(),
    cache: { hit: false, ttlSeconds: clampWidgetTtlSeconds(def.refreshIntervalSeconds) },
    ...patch,
  };
}

export async function loadWidgetPayload(params: {
  widget: WidgetDefinition;
  ctx: DashboardComposeContext;
  useCache?: boolean;
}): Promise<WidgetPayload> {
  const { widget, ctx } = params;
  const useCache = params.useCache !== false;
  const ttlSeconds = clampWidgetTtlSeconds(widget.refreshIntervalSeconds);

  if (!canViewWidget(ctx.permissions, widget)) {
    return basePayload(widget, { status: "forbidden", data: null });
  }

  const cacheKey = buildWidgetCacheKey({
    organizationId: ctx.organizationId,
    widgetId: widget.id,
    viewerUserId: ctx.viewerUserId,
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
    from: ctx.from.toISOString(),
    to: ctx.to.toISOString(),
  });

  if (useCache) {
    const cached = await readWidgetCache({
      organizationId: ctx.organizationId,
      cacheKey,
    });
    if (cached) {
      return {
        ...cached,
        cache: { hit: true, ttlSeconds },
      };
    }
  }

  const loader = getWidgetLoader(widget.loaderKey);
  if (!loader) {
    return basePayload(widget, {
      status: "error",
      data: { error: "LOADER_MISSING" },
    });
  }

  try {
    const data = await loader(ctx);
    const status = isEmptyData(data) ? "empty" : "ok";
    const payload = basePayload(widget, {
      status,
      data,
      cache: { hit: false, ttlSeconds },
    });
    if (status === "ok" || status === "empty") {
      await writeWidgetCache({
        organizationId: ctx.organizationId,
        cacheKey,
        widgetId: widget.id,
        payload,
        ttlSeconds,
      }).catch(() => undefined);
    }
    return payload;
  } catch (error) {
    return basePayload(widget, {
      status: "error",
      data: {
        error: error instanceof Error ? error.message.slice(0, 200) : "failed",
      },
    });
  }
}

export type ComposedDashboard = {
  dashboardId: string;
  title: string;
  description?: string;
  defaultRefreshSeconds: number;
  widgets: WidgetPayload[];
  omittedWidgetIds: string[];
};

export async function composeDashboard(params: {
  dashboardId: string;
  ctx: DashboardComposeContext;
}): Promise<
  | { ok: true; dashboard: ComposedDashboard }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" }
> {
  const def = getDashboardDefinition(params.dashboardId);
  if (!def) return { ok: false, error: "NOT_FOUND" };
  if (!canViewDashboard(params.ctx.permissions, def)) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const omittedWidgetIds: string[] = [];
  const toLoad: WidgetDefinition[] = [];
  for (const widgetId of def.widgetIds) {
    const widget = getWidgetDefinition(widgetId);
    if (!widget) continue;
    if (!canViewWidget(params.ctx.permissions, widget)) {
      omittedWidgetIds.push(widgetId);
      continue;
    }
    if (widget.lazy && !params.ctx.includeLazy) {
      omittedWidgetIds.push(widgetId);
      continue;
    }
    toLoad.push(widget);
  }

  const settled = await Promise.allSettled(
    toLoad.map((widget) =>
      loadWidgetPayload({ widget, ctx: params.ctx, useCache: true }),
    ),
  );

  const widgets: WidgetPayload[] = [];
  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i]!;
    const widget = toLoad[i]!;
    if (result.status === "fulfilled") {
      widgets.push(result.value);
    } else {
      widgets.push(
        basePayload(widget, {
          status: "error",
          data: {
            error:
              result.reason instanceof Error
                ? result.reason.message.slice(0, 200)
                : "failed",
          },
        }),
      );
    }
  }

  return {
    ok: true,
    dashboard: {
      dashboardId: def.id,
      title: def.title,
      description: def.description,
      defaultRefreshSeconds: def.defaultRefreshSeconds,
      widgets,
      omittedWidgetIds,
    },
  };
}

export function getDashboardDef(
  id: string,
): DashboardDefinition | undefined {
  return getDashboardDefinition(id);
}
