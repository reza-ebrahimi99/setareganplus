import { Prisma } from "@/generated/prisma/client";
import {
  ExperienceBlockStatus,
  ExperienceVersionStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  getBlockDefinition,
  isExperienceBlockType,
  type AnyBlockConfig,
  type ExperienceBlockType,
} from "@/lib/experience/registry";
import type { BlockMediaRole } from "@/lib/experience/media-types";
import {
  asNullableInputJson,
  asRequiredInputJson,
} from "@/lib/experience/service/json";
import {
  assertOrganizationMediaIds,
  syncExperienceBlockMediaLinks,
  validateMediaRolesForBlockType,
} from "@/lib/experience/service/media-sync";
import {
  applyExperienceBlockOrder,
  nextExperienceBlockSortOrder,
  normalizeExperienceBlockSortOrders,
} from "@/lib/experience/service/normalize-order";
import {
  failResult,
  okResult,
  type ExperienceResult,
} from "@/lib/experience/service/types";

async function requireDraftVersion(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
}): Promise<ExperienceResult<{ versionId: string }>> {
  const version = await prisma.experienceVersion.findFirst({
    where: {
      id: params.versionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      status: ExperienceVersionStatus.DRAFT,
    },
    select: { id: true },
  });
  if (!version) {
    return failResult(
      "VERSION_NOT_DRAFT",
      "فقط نسخه پیش‌نویس قابل ویرایش است.",
    );
  }
  return okResult({ versionId: version.id });
}

async function requireDraftBlock(params: {
  organizationId: string;
  blockId: string;
}): Promise<
  ExperienceResult<{
    blockId: string;
    experienceVersionId: string;
    type: string;
    status: ExperienceBlockStatus;
  }>
> {
  const block = await prisma.experienceBlock.findFirst({
    where: {
      id: params.blockId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      type: true,
      status: true,
      experienceVersionId: true,
      experienceVersion: {
        select: { status: true, experienceId: true },
      },
    },
  });

  if (!block) {
    return failResult("NOT_FOUND", "بلوک یافت نشد.");
  }
  if (block.experienceVersion.status !== ExperienceVersionStatus.DRAFT) {
    return failResult(
      "VERSION_IMMUTABLE",
      "بلوک‌های نسخه منتشرشده تغییرناپذیرند.",
    );
  }

  return okResult({
    blockId: block.id,
    experienceVersionId: block.experienceVersionId,
    type: block.type,
    status: block.status,
  });
}

export async function addBlock(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
  type: string;
  config?: unknown;
}): Promise<ExperienceResult<{ blockId: string; sortOrder: number }>> {
  if (!isExperienceBlockType(params.type)) {
    return failResult(
      "BLOCK_TYPE_UNKNOWN",
      `نوع بلوک ناشناخته: ${params.type}`,
    );
  }

  const draft = await requireDraftVersion(params);
  if (!draft.ok) return draft;

  const definition = getBlockDefinition(params.type);
  const parsed = definition.parseConfig(
    params.config ?? definition.defaultConfig,
  );
  if (!parsed.ok) {
    return failResult("BLOCK_CONFIG_INVALID", parsed.error);
  }

  const created = await prisma.$transaction(async (tx) => {
    const sortOrder = await nextExperienceBlockSortOrder(
      tx,
      params.organizationId,
      params.versionId,
    );
    const block = await tx.experienceBlock.create({
      data: {
        organizationId: params.organizationId,
        experienceVersionId: params.versionId,
        type: params.type,
        status: ExperienceBlockStatus.PUBLISHED,
        sortOrder,
        config: asRequiredInputJson(parsed.data),
      },
      select: { id: true, sortOrder: true },
    });
    return block;
  });

  return okResult({
    blockId: created.id,
    sortOrder: created.sortOrder,
  });
}

export async function updateBlockConfig(params: {
  organizationId: string;
  blockId: string;
  config: unknown;
}): Promise<ExperienceResult<{ blockId: string }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  if (!isExperienceBlockType(block.data.type)) {
    return failResult("BLOCK_TYPE_UNKNOWN", "نوع بلوک ناشناخته است.");
  }

  const definition = getBlockDefinition(block.data.type as ExperienceBlockType);
  const parsed = definition.parseConfig(params.config);
  if (!parsed.ok) {
    return failResult("BLOCK_CONFIG_INVALID", parsed.error);
  }

  await prisma.experienceBlock.update({
    where: { id: block.data.blockId },
    data: { config: asRequiredInputJson(parsed.data) },
  });

  return okResult({ blockId: block.data.blockId });
}

export async function updateBlockSettings(params: {
  organizationId: string;
  blockId: string;
  status?: ExperienceBlockStatus;
  visibility?: unknown | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  animation?: unknown | null;
  layout?: unknown | null;
}): Promise<ExperienceResult<{ blockId: string }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  if (
    params.status &&
    params.status !== ExperienceBlockStatus.DRAFT &&
    params.status !== ExperienceBlockStatus.PUBLISHED &&
    params.status !== ExperienceBlockStatus.DISABLED
  ) {
    return failResult("INVALID_STATE", "وضعیت بلوک نامعتبر است.");
  }

  await prisma.experienceBlock.update({
    where: { id: block.data.blockId },
    data: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.visibility !== undefined
        ? { visibility: asNullableInputJson(params.visibility) }
        : {}),
      ...(params.opensAt !== undefined ? { opensAt: params.opensAt } : {}),
      ...(params.closesAt !== undefined ? { closesAt: params.closesAt } : {}),
      ...(params.animation !== undefined
        ? { animation: asNullableInputJson(params.animation) }
        : {}),
      ...(params.layout !== undefined
        ? { layout: asNullableInputJson(params.layout) }
        : {}),
    },
  });

  return okResult({ blockId: block.data.blockId });
}

export async function duplicateBlock(params: {
  organizationId: string;
  blockId: string;
}): Promise<ExperienceResult<{ blockId: string; sortOrder: number }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  if (!isExperienceBlockType(block.data.type)) {
    return failResult("BLOCK_TYPE_UNKNOWN", "نوع بلوک ناشناخته است.");
  }

  const source = await prisma.experienceBlock.findFirst({
    where: {
      id: block.data.blockId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    include: {
      mediaLinks: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });
  if (!source) {
    return failResult("NOT_FOUND", "بلوک یافت نشد.");
  }

  const definition = getBlockDefinition(source.type as ExperienceBlockType);
  const parsed = definition.parseConfig(source.config);
  if (!parsed.ok) {
    return failResult("BLOCK_CONFIG_INVALID", parsed.error);
  }
  const typedConfig = (parsed as { ok: true; data: AnyBlockConfig }).data;
  const duplicatedConfig = (
    definition.duplicateConfig as (config: AnyBlockConfig) => AnyBlockConfig
  )(typedConfig);

  const created = await prisma.$transaction(async (tx) => {
    const sortOrder = await nextExperienceBlockSortOrder(
      tx,
      params.organizationId,
      source.experienceVersionId,
    );
    const row = await tx.experienceBlock.create({
      data: {
        organizationId: params.organizationId,
        experienceVersionId: source.experienceVersionId,
        type: source.type,
        status: source.status,
        sortOrder,
        config: asRequiredInputJson(duplicatedConfig),
        visibility: asNullableInputJson(source.visibility),
        opensAt: source.opensAt,
        closesAt: source.closesAt,
        animation: asNullableInputJson(source.animation),
        layout: asNullableInputJson(source.layout),
      },
      select: { id: true, sortOrder: true },
    });

    if (source.mediaLinks.length > 0) {
      await tx.experienceBlockMedia.createMany({
        data: source.mediaLinks.map((link) => ({
          organizationId: params.organizationId,
          blockId: row.id,
          mediaId: link.mediaId,
          role: link.role,
          sortOrder: link.sortOrder,
        })),
      });
    }

    return row;
  });

  return okResult({
    blockId: created.id,
    sortOrder: created.sortOrder,
  });
}

export async function reorderBlocks(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
  orderedBlockIds: string[];
}): Promise<ExperienceResult<{ blockIds: string[] }>> {
  const draft = await requireDraftVersion(params);
  if (!draft.ok) return draft;

  if (params.orderedBlockIds.length === 0) {
    return failResult("VALIDATION_FAILED", "فهرست ترتیب خالی است.");
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.experienceBlock.findMany({
          where: {
            organizationId: params.organizationId,
            experienceVersionId: params.versionId,
            deletedAt: null,
          },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((row) => row.id));
        if (existingIds.size !== params.orderedBlockIds.length) {
          throw new Error("REORDER_MISMATCH");
        }
        for (const id of params.orderedBlockIds) {
          if (!existingIds.has(id)) {
            throw new Error("REORDER_MISMATCH");
          }
        }
        const unique = new Set(params.orderedBlockIds);
        if (unique.size !== params.orderedBlockIds.length) {
          throw new Error("REORDER_MISMATCH");
        }

        await applyExperienceBlockOrder(
          tx,
          params.organizationId,
          params.versionId,
          params.orderedBlockIds,
        );
        await normalizeExperienceBlockSortOrders(
          tx,
          params.organizationId,
          params.versionId,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "REORDER_MISMATCH") {
      return failResult(
        "VALIDATION_FAILED",
        "فهرست ترتیب با بلوک‌های نسخه هم‌خوان نیست.",
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return failResult("CONFLICT", "ترتیب‌دهی با تعارض همزمانی مواجه شد.");
    }
    throw error;
  }

  return okResult({ blockIds: params.orderedBlockIds });
}

export async function disableBlock(params: {
  organizationId: string;
  blockId: string;
}): Promise<ExperienceResult<{ blockId: string }>> {
  return updateBlockSettings({
    organizationId: params.organizationId,
    blockId: params.blockId,
    status: ExperienceBlockStatus.DISABLED,
  });
}

export async function deleteBlock(params: {
  organizationId: string;
  blockId: string;
}): Promise<ExperienceResult<{ blockId: string }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  await prisma.$transaction(async (tx) => {
    await tx.experienceBlock.update({
      where: { id: block.data.blockId },
      data: { deletedAt: new Date() },
    });
    await normalizeExperienceBlockSortOrders(
      tx,
      params.organizationId,
      block.data.experienceVersionId,
    );
  });

  return okResult({ blockId: block.data.blockId });
}

export async function attachBlockMedia(params: {
  organizationId: string;
  blockId: string;
  role: string;
  mediaId: string;
  sortOrder?: number;
}): Promise<ExperienceResult<{ blockId: string }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  const roleCheck = validateMediaRolesForBlockType(block.data.type, [
    params.role,
  ]);
  if (!roleCheck.ok) {
    return failResult("MEDIA_INVALID", roleCheck.error);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const mediaOk = await assertOrganizationMediaIds(tx, params.organizationId, [
        params.mediaId,
      ]);
      if (!mediaOk.ok) {
        throw new Error(`MEDIA_ORG:${mediaOk.error}`);
      }

      const existing = await tx.experienceBlockMedia.findMany({
        where: {
          organizationId: params.organizationId,
          blockId: block.data.blockId,
        },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      });

      const sortOrder =
        params.sortOrder ??
        (existing
          .filter((row) => row.role === params.role)
          .reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1);

      const nextLinks = [
        ...existing
          .filter(
            (row) =>
              !(row.role === params.role && row.sortOrder === sortOrder),
          )
          .map((row) => ({
            role: row.role as BlockMediaRole,
            mediaId: row.mediaId,
            sortOrder: row.sortOrder,
          })),
        {
          role: params.role as BlockMediaRole,
          mediaId: params.mediaId,
          sortOrder,
        },
      ];

      await syncExperienceBlockMediaLinks(tx, {
        organizationId: params.organizationId,
        blockId: block.data.blockId,
        links: nextLinks,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MEDIA_ORG:")) {
      return failResult(
        "MEDIA_INVALID",
        error.message.replace(/^MEDIA_ORG:/, ""),
      );
    }
    throw error;
  }

  return okResult({ blockId: block.data.blockId });
}

export async function detachBlockMedia(params: {
  organizationId: string;
  blockId: string;
  role: string;
  sortOrder?: number;
}): Promise<ExperienceResult<{ blockId: string }>> {
  const block = await requireDraftBlock(params);
  if (!block.ok) return block;

  await prisma.$transaction(async (tx) => {
    await tx.experienceBlockMedia.deleteMany({
      where: {
        organizationId: params.organizationId,
        blockId: block.data.blockId,
        role: params.role,
        ...(params.sortOrder !== undefined
          ? { sortOrder: params.sortOrder }
          : {}),
      },
    });
  });

  return okResult({ blockId: block.data.blockId });
}
