/**
 * Admin loaders / writers for Visual Page Builder.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { publicLibraryUrl } from "@/lib/media/library-image";
import {
  isPageBuilderSectionType,
  type PageBuilderSectionType,
  type PageStatus,
  type SectionStatus,
} from "./constants";
import { getSectionDefinition } from "./registry";
import type { AnySectionConfig, SectionMediaRole } from "./types";
import { parseSectionConfig } from "./validate-config";

export type AdminWebsitePageListView =
  | "active"
  | "draft"
  | "published"
  | "archived"
  | "deleted";

export type AdminWebsitePageListItem = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sectionCount: number;
};

function listWhereForView(
  organizationId: string,
  view: AdminWebsitePageListView,
): Prisma.WebsitePageWhereInput {
  switch (view) {
    case "deleted":
      return { organizationId, deletedAt: { not: null } };
    case "archived":
      return { organizationId, deletedAt: null, status: "ARCHIVED" };
    case "published":
      return { organizationId, deletedAt: null, status: "PUBLISHED" };
    case "draft":
      return { organizationId, deletedAt: null, status: "DRAFT" };
    case "active":
    default:
      return {
        organizationId,
        deletedAt: null,
        status: { not: "ARCHIVED" },
      };
  }
}

export async function listAdminWebsitePages(
  organizationId: string,
  view: AdminWebsitePageListView = "active",
): Promise<AdminWebsitePageListItem[]> {
  const pages = await prisma.websitePage.findMany({
    where: listWhereForView(organizationId, view),
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      archivedAt: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sections: { where: { deletedAt: null } },
        },
      },
    },
  });

  return pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    status: page.status,
    publishedAt: page.publishedAt,
    archivedAt: page.archivedAt,
    deletedAt: page.deletedAt,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    sectionCount: page._count.sections,
  }));
}

export type AdminSectionMediaPreview = {
  role: SectionMediaRole;
  mediaId: string;
  url: string | null;
  title: string | null;
};

export type AdminWebsitePageSection = {
  id: string;
  type: PageBuilderSectionType;
  typeLabelFa: string;
  status: SectionStatus;
  sortOrder: number;
  config: AnySectionConfig;
  media: AdminSectionMediaPreview[];
  updatedAt: Date;
};

export type AdminWebsitePageDetail = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageMediaId: string | null;
  templateKey: string | null;
  status: PageStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  sections: AdminWebsitePageSection[];
  publishedSectionCount: number;
};

export async function getAdminWebsitePage(
  organizationId: string,
  pageId: string,
): Promise<AdminWebsitePageDetail | null> {
  const page = await prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      seoTitle: true,
      seoDescription: true,
      seoImageMediaId: true,
      templateKey: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      sections: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          status: true,
          sortOrder: true,
          config: true,
          updatedAt: true,
          mediaLinks: {
            orderBy: [{ sortOrder: "asc" }],
            select: {
              role: true,
              mediaId: true,
              media: {
                select: {
                  storageKey: true,
                  title: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!page) return null;

  const sections: AdminWebsitePageSection[] = [];
  let publishedSectionCount = 0;

  for (const section of page.sections) {
    if (!isPageBuilderSectionType(section.type)) continue;
    const def = getSectionDefinition(section.type);
    if (!def) continue;

    const parsed = parseSectionConfig(section.type, section.config);
    const config = parsed.ok ? parsed.data : def.defaultConfig;

    if (section.status === "PUBLISHED") publishedSectionCount += 1;

    sections.push({
      id: section.id,
      type: section.type,
      typeLabelFa: def.labelFa,
      status: section.status,
      sortOrder: section.sortOrder,
      config,
      updatedAt: section.updatedAt,
      media: section.mediaLinks.map((link) => {
        const mediaOk = link.media && link.media.deletedAt == null;
        return {
          role: link.role as SectionMediaRole,
          mediaId: link.mediaId,
          url: mediaOk ? publicLibraryUrl(link.media.storageKey) : null,
          title: mediaOk ? link.media.title : null,
        };
      }),
    });
  }

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoImageMediaId: page.seoImageMediaId,
    templateKey: page.templateKey,
    status: page.status,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    sections,
    publishedSectionCount,
  };
}

export async function findLivePageBySlug(
  organizationId: string,
  slug: string,
  excludePageId?: string,
): Promise<{ id: string } | null> {
  return prisma.websitePage.findFirst({
    where: {
      organizationId,
      slug,
      deletedAt: null,
      ...(excludePageId ? { NOT: { id: excludePageId } } : {}),
    },
    select: { id: true },
  });
}

export async function createWebsitePageRecord(params: {
  organizationId: string;
  slug: string;
  title: string;
}): Promise<{ id: string; slug: string }> {
  return prisma.websitePage.create({
    data: {
      organizationId: params.organizationId,
      slug: params.slug,
      title: params.title,
      status: "DRAFT",
    },
    select: { id: true, slug: true },
  });
}
