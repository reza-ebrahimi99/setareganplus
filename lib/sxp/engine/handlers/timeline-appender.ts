import { Prisma } from "@/generated/prisma/client";
import { ExperienceTimelineVisibility } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  catalogSkipReason,
  timelineSummaryFor,
  timelineTitleFor,
} from "@/lib/sxp/engine/catalog";
import { readString } from "@/lib/sxp/engine/payload";
import { resolveExperienceUserId } from "@/lib/sxp/engine/resolve-user";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";

export async function runTimelineAppender(params: {
  inboxId: string;
  event: EngineSourceEvent;
}): Promise<HandlerOutcome> {
  const skip = catalogSkipReason({
    eventType: params.event.eventType,
    smsPurpose: readString(params.event.payload, "purpose"),
  });
  if (skip) {
    return { status: "skipped", reason: skip };
  }

  const userId = await resolveExperienceUserId(params.event);
  if (!userId) {
    return { status: "skipped", reason: "unresolved_user" };
  }

  const trackingCode = readString(params.event.payload, "trackingCode");
  const status = readString(params.event.payload, "status");
  const payload = {
    trackingCode,
    status,
    serviceId: readString(params.event.payload, "serviceId"),
    formId: readString(params.event.payload, "formId"),
    purpose: readString(params.event.payload, "purpose"),
  };

  try {
    await prisma.experienceTimelineEvent.create({
      data: {
        organizationId: params.event.organizationId,
        userId,
        inboxId: params.inboxId,
        sourceType: params.event.sourceKind,
        sourceEventId: params.event.outboxEventId,
        eventType: params.event.eventType,
        aggregateType: params.event.aggregateType,
        aggregateId: params.event.aggregateId,
        occurredAt: params.event.occurredAt,
        title: timelineTitleFor(params.event.eventType),
        summary: timelineSummaryFor({
          eventType: params.event.eventType,
          trackingCode,
          smsPurpose: readString(params.event.payload, "purpose"),
        }),
        href: null,
        visibility: ExperienceTimelineVisibility.SELF,
        feedEligible: false,
        feedRank: 0,
        payload,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "processed", userId };
    }
    throw error;
  }

  return { status: "processed", userId };
}
