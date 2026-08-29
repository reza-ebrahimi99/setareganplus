/**
 * WebsitePage lifecycle domain helpers (Phase 2.2).
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSectionConfig } from "./validate-config";
import { isPageBuilderSectionType } from "./constants";

export type LifecycleErrorCode =
  | "NOT_FOUND"
  | "ALREADY_ARCHIVED"
  | "ALREADY_DELETED"
  | "INVALID_STATE"
  | "SLUG_CONFLICT"
  | "DUPLICATE_FAILED"
  | "UNEXPECTED";

export type LifecycleResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: LifecycleErrorCode; message: string };

export const LIFECYCLE_MESSAGES: Record<LifecycleErrorCode, string> = {
  NOT_FOUND: "صفحه یافت نشد.",
  ALREADY_ARCHIVED: "این صفحه قبلاً بایگانی شده است.",
  ALREADY_DELETED: "این صفحه قبلاً حذف شده است.",
  INVALID_STATE: "عملیات برای وضعیت فعلی صفحه مجاز نیست.",
  SLUG_CONFLICT:
    "نامک این صفحه اکنون توسط صفحه دیگری استفاده می‌شود. قبل از بازیابی، نامک را تغییر دهید.",
  DUPLICATE_FAILED: "تکثیر صفحه ناموفق بود. دوباره تلاش کنید.",
  UNEXPECTED: "عملیات ناموفق بود. دوباره تلاش کنید.",
};

type Tx = Prisma.TransactionClient;

const SLUG_ITERATION_LIMIT = 20;

export async function uniqueLiveWebsitePageSlug(
  organizationId: string,
  baseSlug: string,
  excludePageId?: string,
  tx: Tx | typeof prisma = prisma,
): Promise<string> {
  const trimmed = baseSlug.trim();
  let candidate = `${trimmed}-copy`;
  for (let i = 0; i < SLUG_ITERATION_LIMIT; i += 1) {
    const hit = await tx.websitePage.findFirst({
      where: {
        organizationId,
        slug: candidate,
        deletedAt: null,
        ...(excludePageId ? { NOT: { id: excludePageId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) return candidate;
    candidate = `${trimmed}-copy-${i + 2}`;
  }
  return `${trimmed}-copy-${Date.now().toString(36)}`;
}

export async function archiveWebsitePage(params: {
  organizationId: string;
  pageId: string;
  now?: Date;
}): Promise<LifecycleResult<{ slug: string }>> {
  const now = params.now ?? new Date();
  const page = await prisma.websitePage.findFirst({
    where: {
      id: params.pageId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, status: true, slug: true, archivedAt: true },
  });

  if (!page) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_MESSAGES.NOT_FOUND };
  }

  if (page.status === "ARCHIVED" && page.archivedAt != null) {
    return {
      ok: true,
      data: { slug: page.slug },
    };
  }

  await prisma.websitePage.update({
    where: { id: page.id },
    data: {
      status: "ARCHIVED",
      archivedAt: now,
    },
  });

  return { ok: true, data: { slug: page.slug } };
}

export async function restoreArchivedWebsitePage(params: {
  organizationId: string;
  pageId: string;
}): Promise<LifecycleResult<{ slug: string }>> {
  const page = await prisma.websitePage.findFirst({
    where: {
      id: params.pageId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, status: true, slug: true },
  });

  if (!page) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_MESSAGES.NOT_FOUND };
  }

  if (page.status !== "ARCHIVED") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: LIFECYCLE_MESSAGES.INVALID_STATE,
    };
  }

  await prisma.websitePage.update({
    where: { id: page.id },
    data: {
      status: "DRAFT",
      archivedAt: null,
    },
  });

  return { ok: true, data: { slug: page.slug } };
}

export async function softDeleteWebsitePage(params: {
  organizationId: string;
  pageId: string;
  now?: Date;
}): Promise<LifecycleResult<{ slug: string }>> {
  const now = params.now ?? new Date();
  const page = await prisma.websitePage.findFirst({
    where: {
      id: params.pageId,
      organizationId: params.organizationId,
    },
    select: { id: true, deletedAt: true, slug: true },
  });

  if (!page) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_MESSAGES.NOT_FOUND };
  }

  if (page.deletedAt != null) {
    return { ok: true, data: { slug: page.slug } };
  }

  await prisma.websitePage.update({
    where: { id: page.id },
    data: { deletedAt: now },
  });

  return { ok: true, data: { slug: page.slug } };
}

export async function restoreDeletedWebsitePage(params: {
  organizationId: string;
  pageId: string;
}): Promise<LifecycleResult<{ slug: string }>> {
  const page = await prisma.websitePage.findFirst({
    where: {
      id: params.pageId,
      organizationId: params.organizationId,
      deletedAt: { not: null },
    },
    select: { id: true, slug: true },
  });

  if (!page) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_MESSAGES.NOT_FOUND };
  }

  const clash = await prisma.websitePage.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: page.slug,
      deletedAt: null,
      NOT: { id: page.id },
    },
    select: { id: true },
  });

  if (clash) {
    return {
      ok: false,
      code: "SLUG_CONFLICT",
      message: LIFECYCLE_MESSAGES.SLUG_CONFLICT,
    };
  }

  await prisma.websitePage.update({
    where: { id: page.id },
    data: {
      deletedAt: null,
      status: "DRAFT",
      archivedAt: null,
    },
  });

  return { ok: true, data: { slug: page.slug } };
}

export async function duplicateWebsitePage(params: {
  organizationId: string;
  sourcePageId: string;
}): Promise<LifecycleResult<{ id: string; slug: string }>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.websitePage.findFirst({
        where: {
          id: params.sourcePageId,
          organizationId: params.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          seoTitle: true,
          seoDescription: true,
          seoImageMediaId: true,
          templateKey: true,
          sections: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              type: true,
              sortOrder: true,
              config: true,
              mediaLinks: {
                orderBy: [{ sortOrder: "asc" }],
                select: {
                  role: true,
                  mediaId: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      });

      if (!source) {
        return { ok: false as const, code: "NOT_FOUND" as const };
      }

      const newSlug = await uniqueLiveWebsitePageSlug(
        params.organizationId,
        source.slug,
        undefined,
        tx,
      );
      const newTitle = `${source.title} (کپی)`;

      const created = await tx.websitePage.create({
        data: {
          organizationId: params.organizationId,
          slug: newSlug,
          title: newTitle,
          seoTitle: source.seoTitle,
          seoDescription: source.seoDescription,
          seoImageMediaId: source.seoImageMediaId,
          templateKey: source.templateKey,
          status: "DRAFT",
          publishedAt: null,
          archivedAt: null,
        },
        select: { id: true, slug: true },
      });

      for (const section of source.sections) {
        if (!isPageBuilderSectionType(section.type)) continue;
        const parsed = parseSectionConfig(section.type, section.config);
        if (!parsed.ok) continue;

        const newSection = await tx.websitePageSection.create({
          data: {
            organizationId: params.organizationId,
            pageId: created.id,
            type: section.type,
            status: "DRAFT",
            sortOrder: section.sortOrder,
            config: parsed.data as Prisma.InputJsonValue,
          },
          select: { id: true },
        });

        if (section.mediaLinks.length > 0) {
          await tx.websitePageSectionMedia.createMany({
            data: section.mediaLinks.map((link) => ({
              organizationId: params.organizationId,
              sectionId: newSection.id,
              mediaId: link.mediaId,
              role: link.role,
              sortOrder: link.sortOrder,
            })),
          });
        }
      }

      return { ok: true as const, data: created };
    });

    if (!result.ok) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: LIFECYCLE_MESSAGES.NOT_FOUND,
      };
    }

    return { ok: true, data: result.data };
  } catch {
    return {
      ok: false,
      code: "DUPLICATE_FAILED",
      message: LIFECYCLE_MESSAGES.DUPLICATE_FAILED,
    };
  }
}
