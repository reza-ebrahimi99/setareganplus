import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { asRecord, readString } from "@/lib/sxp/engine/payload";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";
import {
  buildWidgetSnapshots,
  DEFAULT_WIDGET_KEYS,
  type TimelineSlice,
} from "@/lib/sxp/engine/widgets";

export async function runWidgetSnapshotter(params: {
  event: EngineSourceEvent;
}): Promise<HandlerOutcome> {
  const owner = await prisma.experienceTimelineEvent.findFirst({
    where: {
      organizationId: params.event.organizationId,
      sourceEventId: params.event.outboxEventId,
    },
    select: { userId: true },
  });
  if (!owner) {
    return { status: "skipped", reason: "no_timeline" };
  }

  const rows = await prisma.experienceTimelineEvent.findMany({
    where: {
      organizationId: params.event.organizationId,
      userId: owner.userId,
    },
    select: {
      eventType: true,
      aggregateId: true,
      occurredAt: true,
      title: true,
      payload: true,
    },
    orderBy: { occurredAt: "asc" },
    take: 200,
  });

  const slices: TimelineSlice[] = rows.map((row) => {
    const payload = asRecord(row.payload);
    return {
      eventType: row.eventType,
      aggregateId: row.aggregateId,
      occurredAt: row.occurredAt,
      title: row.title,
      trackingCode: readString(payload, "trackingCode"),
      status: readString(payload, "status"),
    };
  });

  const filesCount = await prisma.experienceFile.count({
    where: {
      organizationId: params.event.organizationId,
      userId: owner.userId,
    },
  });

  const snapshots = buildWidgetSnapshots(slices, { filesCount });
  const refreshedAt = new Date();

  for (const widgetKey of DEFAULT_WIDGET_KEYS) {
    const payload = snapshots[widgetKey] as Prisma.InputJsonValue;
    await prisma.experienceWidgetSnapshot.upsert({
      where: {
        organizationId_userId_widgetKey: {
          organizationId: params.event.organizationId,
          userId: owner.userId,
          widgetKey,
        },
      },
      update: {
        payload,
        refreshedAt,
      },
      create: {
        organizationId: params.event.organizationId,
        userId: owner.userId,
        widgetKey,
        payload,
        refreshedAt,
      },
    });
  }

  return { status: "processed", userId: owner.userId };
}
