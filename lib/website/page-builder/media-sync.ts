/**
 * Transactional media-link sync for WebsitePageSectionMedia.
 */

import type { Prisma } from "@/generated/prisma/client";
import type { SectionMediaLinkInput } from "./types";

type Tx = Prisma.TransactionClient;

/**
 * Replace section media links with the validated set.
 * Caller must already verify every mediaId belongs to organizationId.
 */
export async function syncSectionMediaLinks(
  tx: Tx,
  params: {
    organizationId: string;
    sectionId: string;
    links: SectionMediaLinkInput[];
  },
): Promise<void> {
  const { organizationId, sectionId, links } = params;

  await tx.websitePageSectionMedia.deleteMany({
    where: { sectionId, organizationId },
  });

  if (links.length === 0) return;

  await tx.websitePageSectionMedia.createMany({
    data: links.map((link) => ({
      organizationId,
      sectionId,
      mediaId: link.mediaId,
      role: link.role,
      sortOrder: link.sortOrder,
    })),
  });
}

/**
 * Verify all media IDs exist for the organization (non-deleted).
 */
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
