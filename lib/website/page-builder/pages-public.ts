/**
 * Public / preview loaders for Visual Page Builder.
 */

import { prisma } from "@/lib/prisma";
import { publicLibraryUrl } from "@/lib/media/library-image";
import {
  isPageBuilderSectionType,
  type PageBuilderSectionType,
} from "./constants";
import type { SectionMediaMap } from "./registry";
import type { AnySectionConfig, SectionMediaRole } from "./types";
import { parseSectionConfig } from "./validate-config";

export type RenderableSection = {
  id: string;
  type: PageBuilderSectionType;
  config: AnySectionConfig;
  media: SectionMediaMap;
};

export type PublicWebsitePage = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageMediaId: string | null;
  sections: RenderableSection[];
};

type LoadMode = "public" | "preview";

async function loadPageBySlug(
  organizationId: string,
  slug: string,
  mode: LoadMode,
): Promise<PublicWebsitePage | null> {
  const page = await prisma.websitePage.findFirst({
    where: {
      organizationId,
      slug,
      deletedAt: null,
      ...(mode === "public" ? { status: "PUBLISHED" } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      seoTitle: true,
      seoDescription: true,
      seoImageMediaId: true,
      status: true,
      sections: {
        where: {
          deletedAt: null,
          ...(mode === "public"
            ? { status: "PUBLISHED" }
            : { status: { in: ["DRAFT", "PUBLISHED"] } }),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          config: true,
          mediaLinks: {
            orderBy: [{ sortOrder: "asc" }],
            select: {
              role: true,
              media: {
                select: {
                  id: true,
                  storageKey: true,
                  altText: true,
                  title: true,
                  deletedAt: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!page) return null;
  if (mode === "public" && page.status !== "PUBLISHED") return null;

  const sections: RenderableSection[] = [];

  for (const section of page.sections) {
    if (!isPageBuilderSectionType(section.type)) continue;
    const parsed = parseSectionConfig(section.type, section.config);
    if (!parsed.ok) continue;

    const media: SectionMediaMap = {};
    for (const link of section.mediaLinks) {
      const asset = link.media;
      if (!asset || asset.deletedAt != null || asset.status !== "ACTIVE") {
        continue;
      }
      const role = link.role as SectionMediaRole;
      media[role] = {
        id: asset.id,
        url: publicLibraryUrl(asset.storageKey),
        altText: asset.altText,
        title: asset.title,
      };
    }

    sections.push({
      id: section.id,
      type: section.type,
      config: parsed.data,
      media,
    });
  }

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoImageMediaId: page.seoImageMediaId,
    sections,
  };
}

/** Load a published WebsitePage by slug for the public site. */
export async function loadPublishedPageBySlug(
  organizationId: string,
  slug: string,
): Promise<PublicWebsitePage | null> {
  return loadPageBySlug(organizationId, slug, "public");
}

export async function loadPreviewWebsitePage(
  organizationId: string,
  pageId: string,
): Promise<PublicWebsitePage | null> {
  const page = await prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: { slug: true },
  });
  if (!page) return null;
  return loadPageBySlug(organizationId, page.slug, "preview");
}
