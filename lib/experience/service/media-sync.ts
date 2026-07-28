import type { Prisma } from "@/generated/prisma/client";
import type { BlockMediaLinkInput, BlockMediaRole } from "@/lib/experience/media-types";
import { isExperienceBlockType } from "@/lib/experience/registry";
import { getBlockDefinition } from "@/lib/experience/registry";

type Tx = Prisma.TransactionClient;

export async function assertOrganizationMediaIds(
  tx: Tx,
  organizationId: string,
  mediaIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = [...new Set(mediaIds.filter(Boolean))];
  if (unique.length === 0) return { ok: true };

  const found = await tx.mediaAsset.findMany({
    where: {
      organizationId,
      deletedAt: null,
      id: { in: unique },
    },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    return {
      ok: false,
      error: "یکی از رسانه‌های انتخاب‌شده در این سازمان یافت نشد.",
    };
  }
  return { ok: true };
}

export function validateMediaRolesForBlockType(
  blockType: string,
  roles: readonly string[],
): { ok: true } | { ok: false; error: string; role?: string } {
  if (!isExperienceBlockType(blockType)) {
    return { ok: false, error: "نوع بلوک ناشناخته است." };
  }
  const definition = getBlockDefinition(blockType);
  const allowed = new Set(definition.mediaRoles);
  for (const role of roles) {
    if (!allowed.has(role as BlockMediaRole)) {
      return {
        ok: false,
        error: `نقش رسانه «${role}» برای بلوک ${blockType} مجاز نیست.`,
        role,
      };
    }
  }
  return { ok: true };
}

export async function syncExperienceBlockMediaLinks(
  tx: Tx,
  params: {
    organizationId: string;
    blockId: string;
    links: BlockMediaLinkInput[];
  },
): Promise<void> {
  const { organizationId, blockId, links } = params;

  await tx.experienceBlockMedia.deleteMany({
    where: { blockId, organizationId },
  });

  if (links.length === 0) return;

  await tx.experienceBlockMedia.createMany({
    data: links.map((link) => ({
      organizationId,
      blockId,
      mediaId: link.mediaId,
      role: link.role,
      sortOrder: link.sortOrder,
    })),
  });
}
