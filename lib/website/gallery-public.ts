/**
 * Public gallery loaders — active, non-deleted, currently publishable only.
 * Never joins student identity or student portraits.
 */

import { HOME_GALLERY_PLACEMENT_KEY } from "@/lib/media/placement-keys";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";
import {
  galleryContent,
  galleryImages,
  type GalleryFit,
  type GallerySlot,
} from "@/content/home";

export type PublicGalleryImage = {
  id: string;
  title: string;
  category: string;
  caption: string | null;
  alt: string;
  url: string;
  width: number | null;
  height: number | null;
  albumSlug?: string;
};

export type PublicGalleryAlbumCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  coverAlt: string;
  itemCount: number;
  publishedAt: Date | null;
};

export type PublicGalleryAlbumDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  publishedAt: Date | null;
  items: PublicGalleryImage[];
};

function isPlacementCurrentlyActive(params: {
  isActive: boolean;
  startAt: Date | null;
  endAt: Date | null;
  now: Date;
}): boolean {
  if (!params.isActive) return false;
  if (params.startAt && params.startAt > params.now) return false;
  if (params.endAt && params.endAt < params.now) return false;
  return true;
}

function mapMediaToPublicImage(params: {
  id: string;
  title: string | null;
  category: string | null;
  caption: string | null;
  altText: string | null;
  storageKey: string;
  width: number | null;
  height: number | null;
  albumSlug?: string;
}): PublicGalleryImage {
  const title = params.title?.trim() || "تصویر گالری";
  return {
    id: params.id,
    title,
    category: params.category?.trim() || "گالری",
    caption: params.caption,
    alt: params.altText?.trim() || title,
    url: publicLibraryUrl(params.storageKey),
    width: params.width,
    height: params.height,
    albumSlug: params.albumSlug,
  };
}

const activeMediaWhere = {
  deletedAt: null,
  status: "ACTIVE" as const,
};

export async function loadPublicGalleryAlbums(): Promise<
  PublicGalleryAlbumCard[]
> {
  try {
    const organization = await getCurrentOrganization();
    const now = new Date();

    const albums = await prisma.galleryAlbum.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        isActive: true,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        publishedAt: true,
        coverMedia: {
          select: {
            storageKey: true,
            altText: true,
            title: true,
            status: true,
            deletedAt: true,
          },
        },
        _count: {
          select: {
            items: { where: { media: activeMediaWhere } },
          },
        },
      },
    });

    return albums
      .filter((album) => album._count.items > 0)
      .map((album) => {
        const cover =
          album.coverMedia &&
          album.coverMedia.deletedAt == null &&
          album.coverMedia.status === "ACTIVE"
            ? album.coverMedia
            : null;
        return {
          id: album.id,
          slug: album.slug,
          title: album.title,
          description: album.description,
          coverUrl: cover ? publicLibraryUrl(cover.storageKey) : null,
          coverAlt: cover?.altText?.trim() || cover?.title?.trim() || album.title,
          itemCount: album._count.items,
          publishedAt: album.publishedAt,
        };
      });
  } catch {
    return [];
  }
}

export async function loadPublicGalleryAlbumBySlug(
  slug: string,
): Promise<PublicGalleryAlbumDetail | null> {
  try {
    const organization = await getCurrentOrganization();
    const now = new Date();

    const album = await prisma.galleryAlbum.findFirst({
      where: {
        organizationId: organization.id,
        slug,
        deletedAt: null,
        isActive: true,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        publishedAt: true,
        items: {
          where: { media: activeMediaWhere },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            caption: true,
            media: {
              select: {
                id: true,
                title: true,
                category: true,
                altText: true,
                storageKey: true,
                width: true,
                height: true,
              },
            },
          },
        },
      },
    });

    if (!album || album.items.length === 0) return null;

    return {
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      publishedAt: album.publishedAt,
      items: album.items.map((item) =>
        mapMediaToPublicImage({
          id: item.media.id,
          title: item.media.title,
          category: item.media.category,
          caption: item.caption,
          altText: item.media.altText,
          storageKey: item.media.storageKey,
          width: item.media.width,
          height: item.media.height,
          albumSlug: album.slug,
        }),
      ),
    };
  } catch {
    return null;
  }
}

export type HomepageGalleryTile = {
  mediaKey: string;
  title: string;
  category: string;
  caption: string;
  slot: GallerySlot;
  fit: GalleryFit;
  objectPosition: string;
  media: { url: string; alt: string };
};

function slotForIndex(index: number): GallerySlot {
  if (index === 0) return "feature";
  if (index === 1) return "secondary";
  return "tile";
}

function staticHomepageGallery(): HomepageGalleryTile[] {
  return galleryImages.map((item) => ({
    mediaKey: item.mediaKey,
    title: item.title,
    category: item.category,
    caption: item.caption,
    slot: item.slot,
    fit: item.fit,
    objectPosition: item.objectPosition,
    media: { url: item.media.url, alt: item.media.alt },
  }));
}

/**
 * Homepage gallery via MediaPlacement HOME_GALLERY.
 * Always falls back to static content/home.ts on empty result or any error.
 */
export async function loadHomepageGalleryImages(): Promise<{
  source: "database" | "static";
  content: typeof galleryContent;
  images: HomepageGalleryTile[];
}> {
  try {
    const organization = await getCurrentOrganization();
    const now = new Date();

    const placements = await prisma.mediaPlacement.findMany({
      where: {
        organizationId: organization.id,
        placementKey: HOME_GALLERY_PLACEMENT_KEY,
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        titleOverride: true,
        descriptionOverride: true,
        sortOrder: true,
        startAt: true,
        endAt: true,
        isActive: true,
        media: {
          select: {
            id: true,
            title: true,
            category: true,
            description: true,
            altText: true,
            storageKey: true,
            status: true,
            deletedAt: true,
            width: true,
            height: true,
          },
        },
        album: {
          select: {
            id: true,
            slug: true,
            title: true,
            isActive: true,
            deletedAt: true,
            publishedAt: true,
            items: {
              where: { media: activeMediaWhere },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: {
                caption: true,
                media: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    description: true,
                    altText: true,
                    storageKey: true,
                    width: true,
                    height: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const images: HomepageGalleryTile[] = [];

    for (const placement of placements) {
      if (
        !isPlacementCurrentlyActive({
          isActive: placement.isActive,
          startAt: placement.startAt,
          endAt: placement.endAt,
          now,
        })
      ) {
        continue;
      }

      if (placement.media) {
        if (
          placement.media.deletedAt != null ||
          placement.media.status !== "ACTIVE"
        ) {
          continue;
        }
        const title =
          placement.titleOverride?.trim() ||
          placement.media.title?.trim() ||
          "تصویر گالری";
        images.push({
          mediaKey: `placement-${placement.id}`,
          title,
          category: placement.media.category?.trim() || "گالری",
          caption:
            placement.descriptionOverride?.trim() ||
            placement.media.description?.trim() ||
            "",
          slot: slotForIndex(images.length),
          fit: "cover",
          objectPosition: "object-center",
          media: {
            url: publicLibraryUrl(placement.media.storageKey),
            alt: placement.media.altText?.trim() || title,
          },
        });
        continue;
      }

      const album = placement.album;
      if (
        !album ||
        album.deletedAt != null ||
        !album.isActive ||
        (album.publishedAt != null && album.publishedAt > now)
      ) {
        continue;
      }

      for (const item of album.items) {
        const title =
          placement.titleOverride?.trim() ||
          item.media.title?.trim() ||
          album.title;
        images.push({
          mediaKey: `album-${album.id}-${item.media.id}`,
          title,
          category: item.media.category?.trim() || "گالری",
          caption:
            item.caption?.trim() ||
            placement.descriptionOverride?.trim() ||
            item.media.description?.trim() ||
            "",
          slot: slotForIndex(images.length),
          fit: "cover",
          objectPosition: "object-center",
          media: {
            url: publicLibraryUrl(item.media.storageKey),
            alt: item.media.altText?.trim() || title,
          },
        });
      }
    }

    if (images.length === 0) {
      return {
        source: "static",
        content: galleryContent,
        images: staticHomepageGallery(),
      };
    }

    return {
      source: "database",
      content: galleryContent,
      images: images.slice(0, 12),
    };
  } catch {
    return {
      source: "static",
      content: galleryContent,
      images: staticHomepageGallery(),
    };
  }
}
