/**
 * Public loaders for WebsiteTopRankArchive.
 */

import { prisma } from "@/lib/prisma";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { defaultTopRankTitle } from "@/lib/website/top-rank-archive-constants";

export type PublicTopRankArchiveItem = {
  id: string;
  year: number;
  title: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string;
  width: number | null;
  height: number | null;
};

export async function loadPublicTopRankArchives(): Promise<
  PublicTopRankArchiveItem[]
> {
  try {
    const organization = await getCurrentOrganization();
    const rows = await prisma.websiteTopRankArchive.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        isPublished: true,
        media: {
          deletedAt: null,
          status: "ACTIVE",
        },
      },
      orderBy: [{ year: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        year: true,
        title: true,
        description: true,
        media: {
          select: {
            storageKey: true,
            altText: true,
            title: true,
            width: true,
            height: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const title = row.title?.trim() || defaultTopRankTitle(row.year);
      return {
        id: row.id,
        year: row.year,
        title,
        description: row.description,
        imageUrl: publicLibraryUrl(row.media.storageKey),
        imageAlt:
          row.media.altText?.trim() ||
          row.media.title?.trim() ||
          title,
        width: row.media.width,
        height: row.media.height,
      };
    });
  } catch {
    return [];
  }
}
