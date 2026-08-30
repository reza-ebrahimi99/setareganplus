import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceEngineHandlerName,
  ExperienceEngineInboxStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { SXP_ENGINE_MAX_ATTEMPTS } from "@/lib/sxp/constants";

const TERMINAL: ExperienceEngineInboxStatus[] = [
  ExperienceEngineInboxStatus.PROCESSED,
  ExperienceEngineInboxStatus.SKIPPED,
  ExperienceEngineInboxStatus.DEAD_LETTER,
];

export async function claimHandlerInbox(params: {
  organizationId: string;
  outboxEventId: string;
  handlerName: ExperienceEngineHandlerName;
}): Promise<{ id: string; attemptCount: number } | null> {
  try {
    const created = await prisma.experienceEngineInbox.create({
      data: {
        organizationId: params.organizationId,
        outboxEventId: params.outboxEventId,
        handlerName: params.handlerName,
        status: ExperienceEngineInboxStatus.PENDING,
        attemptCount: 1,
      },
      select: { id: true, attemptCount: true },
    });
    return created;
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const existing = await prisma.experienceEngineInbox.findUnique({
    where: {
      organizationId_outboxEventId_handlerName: {
        organizationId: params.organizationId,
        outboxEventId: params.outboxEventId,
        handlerName: params.handlerName,
      },
    },
    select: { id: true, status: true, attemptCount: true },
  });
  if (!existing) return null;
  if (TERMINAL.includes(existing.status)) return null;

  const claimed = await prisma.experienceEngineInbox.updateMany({
    where: {
      id: existing.id,
      status: {
        in: [
          ExperienceEngineInboxStatus.PENDING,
          ExperienceEngineInboxStatus.FAILED,
        ],
      },
    },
    data: {
      status: ExperienceEngineInboxStatus.PENDING,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return null;

  return {
    id: existing.id,
    attemptCount: existing.attemptCount + 1,
  };
}

export async function completeHandlerInbox(params: {
  inboxId: string;
  status: "processed" | "skipped" | "failed";
  attemptCount: number;
  lastError?: string;
}): Promise<void> {
  let status: ExperienceEngineInboxStatus;
  if (params.status === "processed") {
    status = ExperienceEngineInboxStatus.PROCESSED;
  } else if (params.status === "skipped") {
    status = ExperienceEngineInboxStatus.SKIPPED;
  } else if (params.attemptCount >= SXP_ENGINE_MAX_ATTEMPTS) {
    status = ExperienceEngineInboxStatus.DEAD_LETTER;
  } else {
    status = ExperienceEngineInboxStatus.FAILED;
  }

  await prisma.experienceEngineInbox.update({
    where: { id: params.inboxId },
    data: {
      status,
      lastError: params.lastError ?? null,
      processedAt:
        status === ExperienceEngineInboxStatus.PROCESSED ||
        status === ExperienceEngineInboxStatus.SKIPPED
          ? new Date()
          : null,
    },
  });
}
