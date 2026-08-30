import { prisma } from "@/lib/prisma";
import { feedRankFor, isFeedEligibleEventType } from "@/lib/sxp/engine/catalog";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";

export async function runFeedCurator(params: {
  event: EngineSourceEvent;
}): Promise<HandlerOutcome> {
  const row = await prisma.experienceTimelineEvent.findFirst({
    where: {
      organizationId: params.event.organizationId,
      sourceEventId: params.event.outboxEventId,
    },
    select: { id: true, userId: true, eventType: true },
  });

  if (!row) {
    return { status: "skipped", reason: "no_timeline" };
  }

  const feedEligible = isFeedEligibleEventType(row.eventType);
  await prisma.experienceTimelineEvent.update({
    where: { id: row.id },
    data: {
      feedEligible,
      feedRank: feedEligible ? feedRankFor(row.eventType) : 0,
    },
  });

  return { status: "processed", userId: row.userId };
}
