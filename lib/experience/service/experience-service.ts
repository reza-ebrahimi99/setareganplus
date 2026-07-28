import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceOwnerType,
  ExperiencePurpose,
  ExperienceStatus,
  ExperienceVersionStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { asRequiredInputJson } from "@/lib/experience/service/json";
import { resolveSupportedOwner } from "@/lib/experience/service/owner";
import {
  failResult,
  okResult,
  type ExperienceResult,
} from "@/lib/experience/service/types";
import { cloneVersionContentsToDraft } from "@/lib/experience/service/version-clone";

export type ExperienceRecord = {
  id: string;
  organizationId: string;
  ownerType: ExperienceOwnerType;
  ownerId: string;
  purpose: ExperiencePurpose;
  key: string;
  title: string;
  templateKey: string | null;
  status: ExperienceStatus;
  publishedVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const experienceSelect = {
  id: true,
  organizationId: true,
  ownerType: true,
  ownerId: true,
  purpose: true,
  key: true,
  title: true,
  templateKey: true,
  status: true,
  publishedVersionId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type CreateExperienceInput = {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  key?: string;
  title?: string;
  templateKey?: string | null;
  actorUserId?: string | null;
};

/**
 * Create Experience + first DRAFT version. Fails if a live experience already
 * exists for the same org/owner/purpose/key.
 */
export async function createExperience(
  input: CreateExperienceInput,
): Promise<
  ExperienceResult<{ experience: ExperienceRecord; draftVersionId: string }>
> {
  const owner = await resolveSupportedOwner({
    organizationId: input.organizationId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    purpose: input.purpose,
  });
  if (!owner.ok) return owner;

  const key = (input.key ?? "default").trim() || "default";
  const title =
    input.title?.trim() ||
    `تجربه ${owner.data.flowTitle}`.slice(0, 200);

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.experience.findFirst({
          where: {
            organizationId: input.organizationId,
            ownerType: owner.data.ownerType,
            ownerId: owner.data.ownerId,
            purpose: owner.data.purpose,
            key,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (existing) {
          return { conflict: true as const };
        }

        const experience = await tx.experience.create({
          data: {
            organizationId: input.organizationId,
            ownerType: owner.data.ownerType,
            ownerId: owner.data.ownerId,
            purpose: owner.data.purpose,
            key,
            title,
            templateKey: input.templateKey ?? null,
            status: ExperienceStatus.DRAFT,
          },
          select: experienceSelect,
        });

        const draft = await tx.experienceVersion.create({
          data: {
            organizationId: input.organizationId,
            experienceId: experience.id,
            versionNumber: 1,
            status: ExperienceVersionStatus.DRAFT,
            themeOverride: asRequiredInputJson({}),
            createdByUserId: input.actorUserId ?? null,
          },
          select: { id: true },
        });

        return { conflict: false as const, experience, draftVersionId: draft.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (created.conflict) {
      return failResult(
        "DRAFT_EXISTS",
        "برای این مالک و هدف، تجربه از قبل وجود دارد.",
      );
    }

    return okResult({
      experience: created.experience,
      draftVersionId: created.draftVersionId,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return failResult("CONFLICT", "ایجاد تجربه با تعارض همزمانی مواجه شد.");
    }
    throw error;
  }
}

/**
 * Return existing experience for owner, or create one with a draft version.
 * Never silently overwrites an existing draft version.
 */
export async function getOrCreateDraftExperience(
  input: CreateExperienceInput,
): Promise<
  ExperienceResult<{
    experience: ExperienceRecord;
    draftVersionId: string;
    created: boolean;
  }>
> {
  const owner = await resolveSupportedOwner({
    organizationId: input.organizationId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    purpose: input.purpose,
  });
  if (!owner.ok) return owner;

  const key = (input.key ?? "default").trim() || "default";

  const existing = await prisma.experience.findFirst({
    where: {
      organizationId: input.organizationId,
      ownerType: owner.data.ownerType,
      ownerId: owner.data.ownerId,
      purpose: owner.data.purpose,
      key,
      deletedAt: null,
    },
    select: experienceSelect,
  });

  if (existing) {
    if (existing.status === ExperienceStatus.ARCHIVED) {
      return failResult(
        "INVALID_STATE",
        "تجربه بایگانی شده است؛ قبل از ویرایش بازیابی لازم است.",
      );
    }

    const draft = await prisma.experienceVersion.findFirst({
      where: {
        organizationId: input.organizationId,
        experienceId: existing.id,
        status: ExperienceVersionStatus.DRAFT,
      },
      orderBy: { versionNumber: "desc" },
      select: { id: true },
    });

    if (draft) {
      return okResult({
        experience: existing,
        draftVersionId: draft.id,
        created: false,
      });
    }

    // Published exists but no draft — clone published into a new draft.
    if (existing.publishedVersionId) {
      const cloned = await clonePublishedVersionToDraftInternal({
        organizationId: input.organizationId,
        experienceId: existing.id,
        publishedVersionId: existing.publishedVersionId,
        actorUserId: input.actorUserId ?? null,
      });
      if (!cloned.ok) return cloned;
      return okResult({
        experience: existing,
        draftVersionId: cloned.data.draftVersionId,
        created: false,
      });
    }

    // No draft and no published — create empty draft v1
    const emptyDraft = await prisma.experienceVersion.create({
      data: {
        organizationId: input.organizationId,
        experienceId: existing.id,
        versionNumber: 1,
        status: ExperienceVersionStatus.DRAFT,
        themeOverride: asRequiredInputJson({}),
        createdByUserId: input.actorUserId ?? null,
      },
      select: { id: true },
    });
    return okResult({
      experience: existing,
      draftVersionId: emptyDraft.id,
      created: false,
    });
  }

  const created = await createExperience(input);
  if (!created.ok) return created;
  return okResult({
    experience: created.data.experience,
    draftVersionId: created.data.draftVersionId,
    created: true,
  });
}

async function clonePublishedVersionToDraftInternal(params: {
  organizationId: string;
  experienceId: string;
  publishedVersionId: string;
  actorUserId: string | null;
}): Promise<ExperienceResult<{ draftVersionId: string }>> {
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
      "پیش‌نویس فعال وجود دارد؛ بدون بازنویسی خاموش نمی‌توان پیش‌نویس جدید ساخت.",
    );
  }

  return cloneVersionContentsToDraft({
    organizationId: params.organizationId,
    experienceId: params.experienceId,
    sourceVersionId: params.publishedVersionId,
    actorUserId: params.actorUserId,
    requireSourceStatus: ExperienceVersionStatus.PUBLISHED,
  });
}

export async function archiveExperience(params: {
  organizationId: string;
  experienceId: string;
}): Promise<ExperienceResult<{ experienceId: string }>> {
  const result = await prisma.experience.updateMany({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
      status: { not: ExperienceStatus.ARCHIVED },
    },
    data: {
      status: ExperienceStatus.ARCHIVED,
    },
  });

  if (result.count !== 1) {
    return failResult("NOT_FOUND", "تجربه یافت نشد یا قبلاً بایگانی شده است.");
  }

  return okResult({ experienceId: params.experienceId });
}

export async function findExperienceByOwner(params: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  key?: string;
}): Promise<ExperienceResult<ExperienceRecord | null>> {
  const owner = await resolveSupportedOwner({
    organizationId: params.organizationId,
    ownerType: params.ownerType,
    ownerId: params.ownerId,
    purpose: params.purpose,
  });
  if (!owner.ok) return owner;

  const key = (params.key ?? "default").trim() || "default";
  const row = await prisma.experience.findFirst({
    where: {
      organizationId: params.organizationId,
      ownerType: owner.data.ownerType,
      ownerId: owner.data.ownerId,
      purpose: owner.data.purpose,
      key,
      deletedAt: null,
    },
    select: experienceSelect,
  });

  return okResult(row);
}
