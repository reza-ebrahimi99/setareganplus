/**
 * Org-scoped WebsiteMarketingCard admin queries.
 */

import type { Prisma } from "@/generated/prisma/client";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";
import {
  HOMEPAGE_QALAMCHI_SECTION_KEY,
  type MarketingCardSectionKey,
} from "@/lib/website/marketing-card-constants";

export type AdminMarketingCardListItem = {
  id: string;
  title: string;
  description: string;
  badge: string | null;
  isActive: boolean;
  sortOrder: number;
  imageUrl: string | null;
  imageAlt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMarketingCardDetail = AdminMarketingCardListItem & {
  sectionKey: string;
  imageMediaId: string | null;
};

export async function listAdminMarketingCards(
  organizationId: string,
  sectionKey: MarketingCardSectionKey = HOMEPAGE_QALAMCHI_SECTION_KEY,
): Promise<AdminMarketingCardListItem[]> {
  const rows = await prisma.websiteMarketingCard.findMany({
    where: {
      organizationId,
      sectionKey,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      badge: true,
      isActive: true,
      sortOrder: true,
      imageAlt: true,
      createdAt: true,
      updatedAt: true,
      imageMedia: {
        select: {
          storageKey: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const media = row.imageMedia;
    const mediaOk =
      media != null && media.deletedAt == null && media.status === "ACTIVE";
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      badge: row.badge,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      imageUrl: mediaOk ? publicLibraryUrl(media.storageKey) : null,
      imageAlt: row.imageAlt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function getAdminMarketingCard(
  organizationId: string,
  cardId: string,
): Promise<AdminMarketingCardDetail | null> {
  const row = await prisma.websiteMarketingCard.findFirst({
    where: { id: cardId, organizationId, deletedAt: null },
    select: {
      id: true,
      sectionKey: true,
      title: true,
      description: true,
      badge: true,
      isActive: true,
      sortOrder: true,
      imageMediaId: true,
      imageAlt: true,
      createdAt: true,
      updatedAt: true,
      imageMedia: {
        select: {
          storageKey: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  const media = row.imageMedia;
  const mediaOk =
    media != null && media.deletedAt == null && media.status === "ACTIVE";

  return {
    id: row.id,
    sectionKey: row.sectionKey,
    title: row.title,
    description: row.description,
    badge: row.badge,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    imageMediaId: row.imageMediaId,
    imageUrl: mediaOk ? publicLibraryUrl(media.storageKey) : null,
    imageAlt: row.imageAlt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function nextMarketingCardSortOrder(
  organizationId: string,
  sectionKey: MarketingCardSectionKey,
): Promise<number> {
  const agg = await prisma.websiteMarketingCard.aggregate({
    where: { organizationId, sectionKey, deletedAt: null },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
}

export type MarketingCardWriteInput = {
  title: string;
  description: string;
  badge: string | null;
  imageMediaId: string | null;
  imageAlt: string | null;
  isActive: boolean;
};

export function buildMarketingCardCreateData(
  organizationId: string,
  sectionKey: MarketingCardSectionKey,
  sortOrder: number,
  input: MarketingCardWriteInput,
): Prisma.WebsiteMarketingCardCreateInput {
  return {
    organization: { connect: { id: organizationId } },
    sectionKey,
    title: input.title,
    description: input.description,
    badge: input.badge,
    imageAlt: input.imageAlt,
    sortOrder,
    isActive: input.isActive,
    ...(input.imageMediaId
      ? { imageMedia: { connect: { id: input.imageMediaId } } }
      : {}),
  };
}

export function buildMarketingCardUpdateData(
  input: MarketingCardWriteInput,
): Prisma.WebsiteMarketingCardUpdateInput {
  return {
    title: input.title,
    description: input.description,
    badge: input.badge,
    imageAlt: input.imageAlt,
    isActive: input.isActive,
    imageMedia: input.imageMediaId
      ? { connect: { id: input.imageMediaId } }
      : { disconnect: true },
  };
}
