import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceVersionStatus,
  type ExperienceVersionStatus as ExperienceVersionStatusValue,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  asNullableInputJson,
  asRequiredInputJson,
} from "@/lib/experience/service/json";
import {
  failResult,
  okResult,
  type ExperienceResult,
} from "@/lib/experience/service/types";

type Tx = Prisma.TransactionClient;

async function cloneVersionRows(params: {
  tx: Tx;
  organizationId: string;
  experienceId: string;
  sourceVersionId: string;
  actorUserId: string | null;
}): Promise<{ draftVersionId: string; versionNumber: number }> {
  const source = await params.tx.experienceVersion.findFirst({
    where: {
      id: params.sourceVersionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
    },
    include: {
      blocks: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        include: {
          mediaLinks: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  if (!source) {
    throw new Error("SOURCE_VERSION_NOT_FOUND");
  }

  const aggregate = await params.tx.experienceVersion.aggregate({
    where: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
    },
    _max: { versionNumber: true },
  });
  const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;

  const draft = await params.tx.experienceVersion.create({
    data: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      versionNumber,
      status: ExperienceVersionStatus.DRAFT,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      seoImageMediaId: source.seoImageMediaId,
      themeOverride: asRequiredInputJson(source.themeOverride),
      createdByUserId: params.actorUserId,
    },
    select: { id: true },
  });

  for (const block of source.blocks) {
    const createdBlock = await params.tx.experienceBlock.create({
      data: {
        organizationId: params.organizationId,
        experienceVersionId: draft.id,
        type: block.type,
        status: block.status,
        sortOrder: block.sortOrder,
        config: asRequiredInputJson(block.config),
        visibility: asNullableInputJson(block.visibility),
        opensAt: block.opensAt,
        closesAt: block.closesAt,
        animation: asNullableInputJson(block.animation),
        layout: asNullableInputJson(block.layout),
      },
      select: { id: true },
    });

    if (block.mediaLinks.length > 0) {
      await params.tx.experienceBlockMedia.createMany({
        data: block.mediaLinks.map((link) => ({
          organizationId: params.organizationId,
          blockId: createdBlock.id,
          mediaId: link.mediaId,
          role: link.role,
          sortOrder: link.sortOrder,
        })),
      });
    }
  }

  return { draftVersionId: draft.id, versionNumber };
}

export async function cloneVersionContentsToDraft(params: {
  organizationId: string;
  experienceId: string;
  sourceVersionId: string;
  actorUserId: string | null;
  requireSourceStatus?: ExperienceVersionStatusValue;
}): Promise<ExperienceResult<{ draftVersionId: string; versionNumber: number }>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const draftExists = await tx.experienceVersion.findFirst({
          where: {
            organizationId: params.organizationId,
            experienceId: params.experienceId,
            status: ExperienceVersionStatus.DRAFT,
          },
          select: { id: true },
        });
        if (draftExists) {
          return { draftExists: true as const };
        }

        if (params.requireSourceStatus) {
          const source = await tx.experienceVersion.findFirst({
            where: {
              id: params.sourceVersionId,
              organizationId: params.organizationId,
              experienceId: params.experienceId,
              status: params.requireSourceStatus,
            },
            select: { id: true },
          });
          if (!source) {
            return { draftExists: false as const, sourceMissing: true as const };
          }
        }

        const cloned = await cloneVersionRows({
          tx,
          organizationId: params.organizationId,
          experienceId: params.experienceId,
          sourceVersionId: params.sourceVersionId,
          actorUserId: params.actorUserId,
        });
        return {
          draftExists: false as const,
          sourceMissing: false as const,
          ...cloned,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.draftExists) {
      return failResult(
        "DRAFT_EXISTS",
        "پیش‌نویس فعال وجود دارد؛ کلون بدون بازنویسی انجام نشد.",
      );
    }
    if ("sourceMissing" in result && result.sourceMissing) {
      return failResult("NOT_FOUND", "نسخه مبدأ برای کلون یافت نشد.");
    }

    return okResult({
      draftVersionId: result.draftVersionId!,
      versionNumber: result.versionNumber!,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SOURCE_VERSION_NOT_FOUND"
    ) {
      return failResult("NOT_FOUND", "نسخه مبدأ برای کلون یافت نشد.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return failResult("CONFLICT", "کلون نسخه با تعارض همزمانی مواجه شد.");
    }
    throw error;
  }
}

/** Used inside an open transaction after publish claim. */
export async function cloneVersionContentsToDraftInTx(params: {
  tx: Tx;
  organizationId: string;
  experienceId: string;
  sourceVersionId: string;
  actorUserId: string | null;
}): Promise<{ draftVersionId: string; versionNumber: number }> {
  return cloneVersionRows(params);
}
