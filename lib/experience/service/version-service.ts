import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceBlockStatus,
  ExperienceStatus,
  ExperienceVersionStatus,
  MediaAssetStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { assertRegistrationFlowOwner } from "@/lib/experience/service/owner";
import {
  failResult,
  okResult,
  type ExperienceResult,
} from "@/lib/experience/service/types";
import {
  cloneVersionContentsToDraft,
  cloneVersionContentsToDraftInTx,
} from "@/lib/experience/service/version-clone";
import {
  normalizeExperienceBlockSortOrders,
} from "@/lib/experience/service/normalize-order";
import {
  validateExperienceVersionForPublish,
  type PublishBlockInput,
} from "@/lib/experience/service/validate-publish";

class PublishConflictError extends Error {
  constructor() {
    super("EXPERIENCE_PUBLISH_CONFLICT");
    this.name = "PublishConflictError";
  }
}

export async function getEditableDraftVersion(params: {
  organizationId: string;
  experienceId: string;
}): Promise<ExperienceResult<{ versionId: string; versionNumber: number }>> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, status: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }
  if (experience.status === ExperienceStatus.ARCHIVED) {
    return failResult("INVALID_STATE", "تجربه بایگانی شده قابل ویرایش نیست.");
  }

  const draft = await prisma.experienceVersion.findFirst({
    where: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true },
  });

  if (!draft) {
    return failResult("NO_DRAFT", "پیش‌نویس قابل ویرایش یافت نشد.");
  }

  return okResult({
    versionId: draft.id,
    versionNumber: draft.versionNumber,
  });
}

export async function getActivePublishedVersion(params: {
  organizationId: string;
  experienceId: string;
}): Promise<
  ExperienceResult<{ versionId: string; versionNumber: number } | null>
> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { publishedVersionId: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }
  if (!experience.publishedVersionId) {
    return okResult(null);
  }

  const published = await prisma.experienceVersion.findFirst({
    where: {
      id: experience.publishedVersionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.PUBLISHED,
    },
    select: { id: true, versionNumber: true },
  });

  if (!published) {
    return okResult(null);
  }

  return okResult({
    versionId: published.id,
    versionNumber: published.versionNumber,
  });
}

/**
 * Create an empty draft only when none exists.
 * Never overwrites an existing draft.
 */
export async function createDraftVersion(params: {
  organizationId: string;
  experienceId: string;
  actorUserId?: string | null;
}): Promise<ExperienceResult<{ versionId: string; versionNumber: number }>> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, status: true, publishedVersionId: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }
  if (experience.status === ExperienceStatus.ARCHIVED) {
    return failResult("INVALID_STATE", "تجربه بایگانی شده قابل ویرایش نیست.");
  }

  const existingDraft = await prisma.experienceVersion.findFirst({
    where: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.DRAFT,
    },
    select: { id: true },
  });
  if (existingDraft) {
    return failResult(
      "DRAFT_EXISTS",
      "پیش‌نویس فعال از قبل وجود دارد.",
    );
  }

  if (experience.publishedVersionId) {
    return cloneVersionContentsToDraft({
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      sourceVersionId: experience.publishedVersionId,
      actorUserId: params.actorUserId ?? null,
      requireSourceStatus: ExperienceVersionStatus.PUBLISHED,
    }).then((result) => {
      if (!result.ok) return result;
      return okResult({
        versionId: result.data.draftVersionId,
        versionNumber: result.data.versionNumber,
      });
    });
  }

  const aggregate = await prisma.experienceVersion.aggregate({
    where: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
    },
    _max: { versionNumber: true },
  });
  const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;

  const draft = await prisma.experienceVersion.create({
    data: {
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      versionNumber,
      status: ExperienceVersionStatus.DRAFT,
      themeOverride: {},
      createdByUserId: params.actorUserId ?? null,
    },
    select: { id: true, versionNumber: true },
  });

  return okResult({
    versionId: draft.id,
    versionNumber: draft.versionNumber,
  });
}

export async function clonePublishedVersionToDraft(params: {
  organizationId: string;
  experienceId: string;
  actorUserId?: string | null;
}): Promise<ExperienceResult<{ versionId: string; versionNumber: number }>> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { publishedVersionId: true, status: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }
  if (!experience.publishedVersionId) {
    return failResult("NOT_FOUND", "نسخه منتشرشده‌ای برای کلون وجود ندارد.");
  }

  const cloned = await cloneVersionContentsToDraft({
    organizationId: params.organizationId,
    experienceId: params.experienceId,
    sourceVersionId: experience.publishedVersionId,
    actorUserId: params.actorUserId ?? null,
    requireSourceStatus: ExperienceVersionStatus.PUBLISHED,
  });
  if (!cloned.ok) return cloned;
  return okResult({
    versionId: cloned.data.draftVersionId,
    versionNumber: cloned.data.versionNumber,
  });
}

export async function archiveDraftVersion(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
}): Promise<ExperienceResult<{ versionId: string }>> {
  const result = await prisma.experienceVersion.updateMany({
    where: {
      id: params.versionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.DRAFT,
    },
    data: { status: ExperienceVersionStatus.ARCHIVED },
  });

  if (result.count !== 1) {
    return failResult(
      "VERSION_NOT_DRAFT",
      "فقط پیش‌نویس قابل بایگانی است یا نسخه یافت نشد.",
    );
  }

  return okResult({ versionId: params.versionId });
}

/**
 * Update SEO fields on a DRAFT version only. Published versions are immutable.
 */
export async function updateDraftVersionSeo(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageMediaId?: string | null;
}): Promise<ExperienceResult<{ versionId: string }>> {
  const draft = await prisma.experienceVersion.findFirst({
    where: {
      id: params.versionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.DRAFT,
    },
    select: { id: true },
  });
  if (!draft) {
    return failResult(
      "VERSION_NOT_DRAFT",
      "فقط پیش‌نویس قابل ویرایش است یا نسخه یافت نشد.",
    );
  }

  if (params.seoImageMediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: params.seoImageMediaId,
        organizationId: params.organizationId,
        deletedAt: null,
        status: MediaAssetStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!media) {
      return failResult("MEDIA_INVALID", "رسانه SEO در سازمان یافت نشد.");
    }
  }

  const seoTitle =
    params.seoTitle === undefined
      ? undefined
      : params.seoTitle?.trim()
        ? params.seoTitle.trim().slice(0, 120)
        : null;
  const seoDescription =
    params.seoDescription === undefined
      ? undefined
      : params.seoDescription?.trim()
        ? params.seoDescription.trim().slice(0, 320)
        : null;

  await prisma.experienceVersion.update({
    where: { id: draft.id },
    data: {
      ...(seoTitle !== undefined ? { seoTitle } : {}),
      ...(seoDescription !== undefined ? { seoDescription } : {}),
      ...(params.seoImageMediaId !== undefined
        ? { seoImageMediaId: params.seoImageMediaId }
        : {}),
    },
  });

  return okResult({ versionId: draft.id });
}

export async function publishExperienceVersion(params: {
  organizationId: string;
  experienceId: string;
  expectedDraftVersionId: string;
  actorUserId: string;
}): Promise<
  ExperienceResult<{
    publishedVersionId: string;
    freshDraftVersionId: string;
    freshDraftVersionNumber: number;
  }>
> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const experience = await tx.experience.findFirst({
          where: {
            id: params.experienceId,
            organizationId: params.organizationId,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            ownerType: true,
            ownerId: true,
            purpose: true,
          },
        });

        if (!experience) {
          return failResult("NOT_FOUND", "تجربه یافت نشد.");
        }
        if (experience.status === ExperienceStatus.ARCHIVED) {
          return failResult(
            "INVALID_STATE",
            "تجربه بایگانی‌شده قابل انتشار نیست.",
          );
        }

        const ownerCheck = await assertRegistrationFlowOwner({
          organizationId: params.organizationId,
          ownerId: experience.ownerId,
          tx,
        });
        if (!ownerCheck.ok) return ownerCheck;

        const draft = await tx.experienceVersion.findFirst({
          where: {
            id: params.expectedDraftVersionId,
            organizationId: params.organizationId,
            experienceId: experience.id,
            status: ExperienceVersionStatus.DRAFT,
          },
          include: {
            blocks: {
              where: { deletedAt: null },
              orderBy: [
                { sortOrder: "asc" },
                { createdAt: "asc" },
                { id: "asc" },
              ],
              include: {
                mediaLinks: {
                  orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
                },
              },
            },
          },
        });

        if (!draft) {
          return failResult(
            "VERSION_NOT_DRAFT",
            "پیش‌نویس مورد انتظار یافت نشد.",
          );
        }

        await normalizeExperienceBlockSortOrders(
          tx,
          params.organizationId,
          draft.id,
        );

        const normalizedBlocks = await tx.experienceBlock.findMany({
          where: {
            organizationId: params.organizationId,
            experienceVersionId: draft.id,
            deletedAt: null,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          include: {
            mediaLinks: {
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            },
          },
        });

        const publishBlocks: PublishBlockInput[] = normalizedBlocks.map(
          (block) => ({
            id: block.id,
            type: block.type,
            status: block.status,
            sortOrder: block.sortOrder,
            config: block.config,
            mediaLinks: block.mediaLinks.map((link) => ({
              role: link.role,
              mediaId: link.mediaId,
              sortOrder: link.sortOrder,
            })),
          }),
        );

        const validation = validateExperienceVersionForPublish({
          versionId: draft.id,
          experienceId: experience.id,
          organizationId: params.organizationId,
          purpose: experience.purpose,
          ownerExists: true,
          blocks: publishBlocks,
        });

        if (!validation.ok) {
          return failResult(
            "VALIDATION_FAILED",
            "اعتبارسنجی انتشار ناموفق بود.",
            validation.issues,
          );
        }

        const publishedAt = new Date();
        const claimed = await tx.experienceVersion.updateMany({
          where: {
            id: draft.id,
            organizationId: params.organizationId,
            experienceId: experience.id,
            status: ExperienceVersionStatus.DRAFT,
          },
          data: {
            status: ExperienceVersionStatus.PUBLISHED,
            publishedAt,
          },
        });

        if (claimed.count !== 1) {
          throw new PublishConflictError();
        }

        await tx.experienceVersion.updateMany({
          where: {
            organizationId: params.organizationId,
            experienceId: experience.id,
            status: ExperienceVersionStatus.PUBLISHED,
            NOT: { id: draft.id },
          },
          data: { status: ExperienceVersionStatus.SUPERSEDED },
        });

        // Promote enabled draft blocks to PUBLISHED; keep DISABLED as-is.
        await tx.experienceBlock.updateMany({
          where: {
            organizationId: params.organizationId,
            experienceVersionId: draft.id,
            deletedAt: null,
            status: { not: ExperienceBlockStatus.DISABLED },
          },
          data: { status: ExperienceBlockStatus.PUBLISHED },
        });

        await tx.experience.update({
          where: {
            organizationId_id: {
              organizationId: params.organizationId,
              id: experience.id,
            },
          },
          data: {
            publishedVersionId: draft.id,
            status: ExperienceStatus.ACTIVE,
          },
        });

        const fresh = await cloneVersionContentsToDraftInTx({
          tx,
          organizationId: params.organizationId,
          experienceId: experience.id,
          sourceVersionId: draft.id,
          actorUserId: params.actorUserId,
        });

        return okResult({
          publishedVersionId: draft.id,
          freshDraftVersionId: fresh.draftVersionId,
          freshDraftVersionNumber: fresh.versionNumber,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const isConflict =
      error instanceof PublishConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034"));

    if (isConflict) {
      return failResult(
        "CONFLICT",
        "انتشار با تعارض همزمانی مواجه شد؛ دوباره تلاش کنید.",
      );
    }
    throw error;
  }
}
