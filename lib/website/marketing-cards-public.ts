/**
 * Public loaders for WebsiteMarketingCard (homepage Qalamchi section).
 */

import type { MediaAsset } from "@/lib/media";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import { aboutContent } from "@/content/home";
import {
  HOMEPAGE_QALAMCHI_SECTION_KEY,
  MARKETING_CARD_DEFAULT_BADGE,
} from "@/lib/website/marketing-card-constants";

export type PublicQalamchiCard = {
  id: string;
  title: string;
  description: string;
  badge: string;
  media: MediaAsset;
  source: "database" | "static";
};

function resolveBadge(raw: string | null | undefined): string {
  const trimmed = raw?.replace(/\s+/g, " ").trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : MARKETING_CARD_DEFAULT_BADGE;
}

function staticFallbackCards(): PublicQalamchiCard[] {
  return aboutContent.branches.items.map((item, index) => ({
    id: `static-qalamchi-${index}`,
    title: item.title,
    description: item.description,
    badge: MARKETING_CARD_DEFAULT_BADGE,
    media: {
      url: item.media.url ?? null,
      alt: item.media.alt,
    },
    source: "static" as const,
  }));
}

/**
 * Active HOMEPAGE_QALAMCHI cards for the public homepage.
 * Zero active rows → static aboutContent.branches.items fallback.
 */
export async function loadHomepageQalamchiCards(): Promise<PublicQalamchiCard[]> {
  try {
    const organization = await getCurrentOrganization();

    const rows = await prisma.websiteMarketingCard.findMany({
      where: {
        organizationId: organization.id,
        sectionKey: HOMEPAGE_QALAMCHI_SECTION_KEY,
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        badge: true,
        imageAlt: true,
        imageMedia: {
          select: {
            storageKey: true,
            altText: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (rows.length === 0) {
      return staticFallbackCards();
    }

    return rows.map((row) => {
      const mediaRow = row.imageMedia;
      const mediaOk =
        mediaRow != null &&
        mediaRow.deletedAt == null &&
        mediaRow.status === "ACTIVE";

      const alt =
        row.imageAlt?.trim() ||
        (mediaOk ? mediaRow.altText?.trim() : null) ||
        row.title;

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        badge: resolveBadge(row.badge),
        media: {
          url: mediaOk ? publicLibraryUrl(mediaRow.storageKey) : null,
          alt,
        },
        source: "database" as const,
      };
    });
  } catch {
    return staticFallbackCards();
  }
}
