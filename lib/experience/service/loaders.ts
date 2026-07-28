import {
  ExperienceBlockStatus,
  ExperienceOwnerType,
  ExperiencePurpose,
  ExperienceStatus,
  ExperienceVersionStatus,
  MediaAssetStatus,
} from "@/generated/prisma/enums";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import type { BlockMediaMap, BlockMediaRole } from "@/lib/experience/media-types";
import {
  getBlockDefinition,
  isExperienceBlockType,
  type AnyBlockConfig,
  type ExperienceBlockType,
} from "@/lib/experience/registry";
import { resolveSupportedOwner } from "@/lib/experience/service/owner";
import {
  failResult,
  issue,
  okResult,
  type ExperienceIssue,
  type ExperienceResult,
} from "@/lib/experience/service/types";
import type { ExperienceRecord } from "@/lib/experience/service/experience-service";

export type LoadedBlockMediaLink = {
  id: string;
  role: string;
  mediaId: string;
  sortOrder: number;
  url: string | null;
  altText: string | null;
  title: string | null;
};

export type LoadedExperienceBlock = {
  id: string;
  type: string;
  status: ExperienceBlockStatus;
  sortOrder: number;
  opensAt: Date | null;
  closesAt: Date | null;
  visibility: unknown | null;
  animation: unknown | null;
  layout: unknown | null;
  rawConfig: unknown;
  mediaLinks: LoadedBlockMediaLink[];
  media: BlockMediaMap;
  /**
   * Parsed typed config when type+config are valid.
   * Null when diagnostics contain a blocking parse/type error.
   */
  config: AnyBlockConfig | null;
  diagnostics: ExperienceIssue[];
};

export type LoadedExperienceVersion = {
  id: string;
  experienceId: string;
  versionNumber: number;
  status: ExperienceVersionStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageMediaId: string | null;
  themeOverride: unknown;
  publishedAt: Date | null;
  blocks: LoadedExperienceBlock[];
  diagnostics: ExperienceIssue[];
};

export type LoadedExperienceBundle = {
  experience: ExperienceRecord;
  version: LoadedExperienceVersion | null;
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

const versionInclude = {
  blocks: {
    where: { deletedAt: null },
    orderBy: [
      { sortOrder: "asc" as const },
      { createdAt: "asc" as const },
      { id: "asc" as const },
    ],
    include: {
      mediaLinks: {
        orderBy: [
          { sortOrder: "asc" as const },
          { id: "asc" as const },
        ],
        include: {
          media: {
            select: {
              id: true,
              storageKey: true,
              altText: true,
              title: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  },
};

function mapMediaLinks(
  links: Array<{
    id: string;
    role: string;
    mediaId: string;
    sortOrder: number;
    media: {
      id: string;
      storageKey: string;
      altText: string | null;
      title: string | null;
      status: MediaAssetStatus;
      deletedAt: Date | null;
    };
  }>,
): { mediaLinks: LoadedBlockMediaLink[]; media: BlockMediaMap } {
  const mediaLinks: LoadedBlockMediaLink[] = [];
  const media: BlockMediaMap = {};

  for (const link of links) {
    const active =
      link.media.deletedAt == null &&
      link.media.status === MediaAssetStatus.ACTIVE;
    const url = active ? publicUrlForStorageKey(link.media.storageKey) : null;
    mediaLinks.push({
      id: link.id,
      role: link.role,
      mediaId: link.mediaId,
      sortOrder: link.sortOrder,
      url,
      altText: link.media.altText,
      title: link.media.title,
    });

    if (active && url) {
      const role = link.role as BlockMediaRole;
      if (!media[role]) {
        media[role] = {
          id: link.media.id,
          url,
          altText: link.media.altText,
          title: link.media.title,
        };
      }
    }
  }

  return { mediaLinks, media };
}

function mapBlocks(
  rows: Array<{
    id: string;
    type: string;
    status: ExperienceBlockStatus;
    sortOrder: number;
    config: unknown;
    visibility: unknown | null;
    opensAt: Date | null;
    closesAt: Date | null;
    animation: unknown | null;
    layout: unknown | null;
    mediaLinks: Array<{
      id: string;
      role: string;
      mediaId: string;
      sortOrder: number;
      media: {
        id: string;
        storageKey: string;
        altText: string | null;
        title: string | null;
        status: MediaAssetStatus;
        deletedAt: Date | null;
      };
    }>;
  }>,
  options: { failUnknownHard: boolean },
): { blocks: LoadedExperienceBlock[]; diagnostics: ExperienceIssue[] } {
  const diagnostics: ExperienceIssue[] = [];
  const blocks: LoadedExperienceBlock[] = [];

  for (const row of rows) {
    const blockDiagnostics: ExperienceIssue[] = [];
    const { mediaLinks, media } = mapMediaLinks(row.mediaLinks);

    let config: AnyBlockConfig | null = null;
    if (!isExperienceBlockType(row.type)) {
      blockDiagnostics.push(
        issue("BLOCK_TYPE_UNKNOWN", `نوع بلوک ناشناخته: ${row.type}`, {
          blockId: row.id,
          blockType: row.type,
        }),
      );
    } else {
      const definition = getBlockDefinition(row.type as ExperienceBlockType);
      const parsed = definition.parseConfig(row.config);
      if (!parsed.ok) {
        blockDiagnostics.push(
          issue("BLOCK_CONFIG_INVALID", parsed.error, {
            blockId: row.id,
            blockType: row.type,
          }),
        );
      } else {
        config = parsed.data;
      }
    }

    if (options.failUnknownHard) {
      diagnostics.push(...blockDiagnostics);
    }

    blocks.push({
      id: row.id,
      type: row.type,
      status: row.status,
      sortOrder: row.sortOrder,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      visibility: row.visibility,
      animation: row.animation,
      layout: row.layout,
      rawConfig: row.config,
      mediaLinks,
      media,
      config: options.failUnknownHard && blockDiagnostics.length > 0 ? null : config,
      diagnostics: blockDiagnostics,
    });
  }

  return { blocks, diagnostics };
}

async function loadVersionById(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
  expectedStatus?: ExperienceVersionStatus;
  failUnknownHard: boolean;
}): Promise<ExperienceResult<LoadedExperienceVersion>> {
  const version = await prisma.experienceVersion.findFirst({
    where: {
      id: params.versionId,
      organizationId: params.organizationId,
      experienceId: params.experienceId,
      ...(params.expectedStatus ? { status: params.expectedStatus } : {}),
    },
    include: versionInclude,
  });

  if (!version) {
    return failResult("NOT_FOUND", "نسخه تجربه یافت نشد.");
  }

  const mapped = mapBlocks(version.blocks, {
    failUnknownHard: params.failUnknownHard,
  });

  if (params.failUnknownHard && mapped.diagnostics.length > 0) {
    return failResult(
      "VALIDATION_FAILED",
      "نسخه منتشرشده شامل بلوک نامعتبر است.",
      mapped.diagnostics,
    );
  }

  return okResult({
    id: version.id,
    experienceId: version.experienceId,
    versionNumber: version.versionNumber,
    status: version.status,
    seoTitle: version.seoTitle,
    seoDescription: version.seoDescription,
    seoImageMediaId: version.seoImageMediaId,
    themeOverride: version.themeOverride,
    publishedAt: version.publishedAt,
    blocks: mapped.blocks,
    diagnostics: mapped.diagnostics,
  });
}

export async function loadExperienceByOwner(params: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  key?: string;
}): Promise<ExperienceResult<ExperienceRecord | null>> {
  const owner = await resolveSupportedOwner(params);
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

/**
 * Published landing only — never falls back to draft.
 */
export async function loadPublishedExperienceByOwner(params: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  key?: string;
}): Promise<ExperienceResult<LoadedExperienceBundle | null>> {
  const owner = await resolveSupportedOwner(params);
  if (!owner.ok) return owner;

  const key = (params.key ?? "default").trim() || "default";
  const experience = await prisma.experience.findFirst({
    where: {
      organizationId: params.organizationId,
      ownerType: owner.data.ownerType,
      ownerId: owner.data.ownerId,
      purpose: owner.data.purpose,
      key,
      deletedAt: null,
      status: { not: ExperienceStatus.ARCHIVED },
    },
    select: experienceSelect,
  });

  if (!experience || !experience.publishedVersionId) {
    return okResult(null);
  }

  const version = await loadVersionById({
    organizationId: params.organizationId,
    experienceId: experience.id,
    versionId: experience.publishedVersionId,
    expectedStatus: ExperienceVersionStatus.PUBLISHED,
    failUnknownHard: true,
  });

  if (!version.ok) {
    if (version.code === "NOT_FOUND") {
      return okResult(null);
    }
    return version;
  }

  return okResult({
    experience,
    version: version.data,
  });
}

/**
 * Editable draft for the owner — never returns another org's data.
 */
export async function loadDraftExperienceByOwner(params: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  key?: string;
}): Promise<ExperienceResult<LoadedExperienceBundle | null>> {
  const owner = await resolveSupportedOwner(params);
  if (!owner.ok) return owner;

  const key = (params.key ?? "default").trim() || "default";
  const experience = await prisma.experience.findFirst({
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

  if (!experience) {
    return okResult(null);
  }

  const draft = await prisma.experienceVersion.findFirst({
    where: {
      organizationId: params.organizationId,
      experienceId: experience.id,
      status: ExperienceVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  if (!draft) {
    return okResult({ experience, version: null });
  }

  const version = await loadVersionById({
    organizationId: params.organizationId,
    experienceId: experience.id,
    versionId: draft.id,
    expectedStatus: ExperienceVersionStatus.DRAFT,
    failUnknownHard: false,
  });
  if (!version.ok) return version;

  return okResult({
    experience,
    version: version.data,
  });
}

export async function loadExperienceVersion(params: {
  organizationId: string;
  experienceId: string;
  versionId: string;
}): Promise<ExperienceResult<LoadedExperienceVersion>> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }

  return loadVersionById({
    organizationId: params.organizationId,
    experienceId: params.experienceId,
    versionId: params.versionId,
    failUnknownHard: false,
  });
}

export async function loadPublishedExperienceVersion(params: {
  organizationId: string;
  experienceId: string;
}): Promise<ExperienceResult<LoadedExperienceVersion | null>> {
  const experience = await prisma.experience.findFirst({
    where: {
      id: params.experienceId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, publishedVersionId: true },
  });
  if (!experience) {
    return failResult("NOT_FOUND", "تجربه یافت نشد.");
  }
  if (!experience.publishedVersionId) {
    return okResult(null);
  }

  const version = await loadVersionById({
    organizationId: params.organizationId,
    experienceId: experience.id,
    versionId: experience.publishedVersionId,
    expectedStatus: ExperienceVersionStatus.PUBLISHED,
    failUnknownHard: true,
  });

  if (!version.ok) {
    if (version.code === "NOT_FOUND") return okResult(null);
    return version;
  }

  return okResult(version.data);
}

/** Re-export enums used by callers for owner keys. */
export const EXPERIENCE_RUNTIME_OWNER = ExperienceOwnerType.REGISTRATION_FLOW;
export const EXPERIENCE_RUNTIME_PURPOSE = ExperiencePurpose.LANDING;
