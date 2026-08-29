import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_WIDGET_TTL_SECONDS,
  MAX_WIDGET_TTL_SECONDS,
  MIN_WIDGET_TTL_SECONDS,
  type WidgetPayload,
} from "@/lib/dashboard/contracts/widget";
import { prisma } from "@/lib/prisma";

export function clampWidgetTtlSeconds(raw?: number): number {
  if (raw === undefined || Number.isNaN(raw)) return DEFAULT_WIDGET_TTL_SECONDS;
  return Math.min(
    MAX_WIDGET_TTL_SECONDS,
    Math.max(MIN_WIDGET_TTL_SECONDS, Math.trunc(raw)),
  );
}

export function buildWidgetCacheKey(parts: {
  organizationId: string;
  widgetId: string;
  viewerUserId: string;
  branchIds?: readonly string[];
  from: string;
  to: string;
}): string {
  const payload = {
    organizationId: parts.organizationId,
    widgetId: parts.widgetId,
    viewerUserId: parts.viewerUserId,
    branchIds: parts.branchIds ? [...parts.branchIds].sort() : null,
    from: parts.from,
    to: parts.to,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function readWidgetCache(params: {
  organizationId: string;
  cacheKey: string;
}): Promise<WidgetPayload | null> {
  const row = await prisma.dashboardWidgetCache.findUnique({
    where: {
      organizationId_cacheKey: {
        organizationId: params.organizationId,
        cacheKey: params.cacheKey,
      },
    },
    select: { payload: true, expiresAt: true },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.payload as unknown as WidgetPayload;
}

export async function writeWidgetCache(params: {
  organizationId: string;
  cacheKey: string;
  widgetId: string;
  payload: WidgetPayload;
  ttlSeconds: number;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);
  await prisma.dashboardWidgetCache.upsert({
    where: {
      organizationId_cacheKey: {
        organizationId: params.organizationId,
        cacheKey: params.cacheKey,
      },
    },
    create: {
      organizationId: params.organizationId,
      cacheKey: params.cacheKey,
      widgetId: params.widgetId,
      payload: params.payload as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      widgetId: params.widgetId,
      payload: params.payload as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}
