import { ExperienceFileKind, ExperienceTimelineVisibility } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FILE_READY_EVENT_TYPE } from "@/lib/sxp/engine/timeline-query";
import { asRecord, readString } from "@/lib/sxp/engine/payload";
import type { EngineSourceEvent, HandlerOutcome } from "@/lib/sxp/engine/types";

function parseKind(raw: string | null): ExperienceFileKind {
  if (!raw) return ExperienceFileKind.OTHER;
  const hit = (Object.values(ExperienceFileKind) as string[]).find(
    (value) => value === raw.toUpperCase(),
  );
  return (hit as ExperienceFileKind | undefined) ?? ExperienceFileKind.OTHER;
}

/**
 * Indexes FILE_READY projections only. No publisher on master yet — stays idle.
 * Does not query booking/commerce/CRM tables.
 */
export async function runDownloadIndexer(params: {
  event: EngineSourceEvent;
}): Promise<HandlerOutcome> {
  if (params.event.eventType !== FILE_READY_EVENT_TYPE) {
    return { status: "skipped", reason: "not_file_ready" };
  }

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

  const payload = asRecord(params.event.payload);
  const sourceFileId =
    readString(payload, "fileId") ??
    readString(payload, "mediaId") ??
    params.event.aggregateId;
  const title = readString(payload, "title") ?? "فایل";

  try {
    await prisma.experienceFile.upsert({
      where: {
        organizationId_userId_sourceFileId: {
          organizationId: params.event.organizationId,
          userId: owner.userId,
          sourceFileId,
        },
      },
      update: {
        title,
        mime: readString(payload, "mime"),
        mediaStorageKey: readString(payload, "storageKey"),
        kind: parseKind(readString(payload, "kind")),
        sourceType: params.event.aggregateType,
        sourceId: params.event.aggregateId,
      },
      create: {
        organizationId: params.event.organizationId,
        userId: owner.userId,
        sourceFileId,
        title,
        mime: readString(payload, "mime"),
        mediaStorageKey: readString(payload, "storageKey"),
        kind: parseKind(readString(payload, "kind")),
        sourceType: params.event.aggregateType,
        sourceId: params.event.aggregateId,
        visibility: ExperienceTimelineVisibility.SELF,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "processed", userId: owner.userId };
    }
    throw error;
  }

  return { status: "processed", userId: owner.userId };
}
