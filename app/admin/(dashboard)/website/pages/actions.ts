"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  PAGE_SEO_DESCRIPTION_MAX,
  PAGE_SEO_TITLE_MAX,
  PAGE_TITLE_MAX,
  isPageBuilderSectionType,
  isSectionStatus,
  normalizePageBuilderText,
  type PageBuilderSectionType,
  type PageStatus,
} from "@/lib/website/page-builder/constants";
import {
  assertOrganizationMediaIds,
  syncSectionMediaLinks,
} from "@/lib/website/page-builder/media-sync";
import {
  normalizePageSectionSortOrders,
  nextSectionSortOrder,
} from "@/lib/website/page-builder/normalize-order";
import {
  createWebsitePageRecord,
  findLivePageBySlug,
  type AdminWebsitePageListView,
} from "@/lib/website/page-builder/pages-admin";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";
import {
  archiveWebsitePage,
  duplicateWebsitePage,
  restoreArchivedWebsitePage,
  restoreDeletedWebsitePage,
  softDeleteWebsitePage,
} from "@/lib/website/page-builder/lifecycle";
import {
  resolvePageArchivedAtOnPublish,
  resolvePagePublishedAt,
} from "@/lib/website/page-builder/publish";
import {
  getDefaultSectionConfig,
  getSectionDefinition,
} from "@/lib/website/page-builder/registry";
import { parseWebsitePageSlug } from "@/lib/website/page-builder/reserved-slugs";
import type {
  SectionMediaLinkInput,
  SectionMediaRole,
} from "@/lib/website/page-builder/types";
import { parseSectionConfig } from "@/lib/website/page-builder/validate-config";

export type PageBuilderActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidatePageBuilder(pageId?: string, slug?: string) {
  revalidatePath("/admin/website/pages");
  if (pageId) {
    revalidatePath(`/admin/website/pages/${pageId}`);
    revalidatePath(`/admin/website/pages/${pageId}/preview`);
  }
  if (slug) {
    revalidatePath(getPublicPagePath(slug));
  }
}

function readListView(formData: FormData): AdminWebsitePageListView {
  const raw = readString(formData, "view").trim();
  if (
    raw === "draft" ||
    raw === "published" ||
    raw === "archived" ||
    raw === "deleted" ||
    raw === "active"
  ) {
    return raw;
  }
  return "active";
}

function redirectToPageList(
  view: AdminWebsitePageListView,
  params: { success?: string; error?: string },
) {
  const query = new URLSearchParams();
  if (view !== "active") query.set("view", view);
  if (params.success) query.set("success", params.success);
  if (params.error) query.set("error", params.error);
  const qs = query.toString();
  redirect(qs ? `/admin/website/pages?${qs}` : "/admin/website/pages");
}

async function assertOwnedPage(organizationId: string, pageId: string) {
  return prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      archivedAt: true,
    },
  });
}

async function assertOwnedSection(
  organizationId: string,
  sectionId: string,
) {
  return prisma.websitePageSection.findFirst({
    where: { id: sectionId, organizationId, deletedAt: null },
    select: {
      id: true,
      pageId: true,
      type: true,
      status: true,
      sortOrder: true,
      config: true,
      page: { select: { slug: true } },
    },
  });
}

function parseConfigFromForm(
  type: PageBuilderSectionType,
  formData: FormData,
):
  | { ok: true; config: Prisma.InputJsonValue; links: SectionMediaLinkInput[] }
  | { ok: false; error: string } {
  const def = getSectionDefinition(type);
  if (!def) return { ok: false, error: "نوع بخش نامعتبر است." };

  const rawConfigJson = readString(formData, "configJson").trim();
  let raw: unknown;

  if (rawConfigJson) {
    try {
      raw = JSON.parse(rawConfigJson);
    } catch {
      return { ok: false, error: "پیکربندی بخش نامعتبر است." };
    }
  } else {
    raw = buildConfigObjectFromFields(type, formData);
  }

  const parsed = parseSectionConfig(type, raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const formMedia: Partial<Record<SectionMediaRole, string | null>> = {};
  for (const role of def.mediaRoles) {
    const id = readString(formData, `mediaRole_${role}`).trim();
    formMedia[role] = id || null;
  }
  const links = def.extractMediaLinks(formMedia);

  return {
    ok: true,
    config: parsed.data as Prisma.InputJsonValue,
    links,
  };
}

function buildConfigObjectFromFields(
  type: PageBuilderSectionType,
  formData: FormData,
): unknown {
  const button = (prefix: string) => {
    const label = readString(formData, `${prefix}Label`).trim();
    const href = readString(formData, `${prefix}Href`).trim();
    if (!label && !href) return undefined;
    return { label, href };
  };

  switch (type) {
    case "HERO":
      return {
        v: 1,
        eyebrow: readString(formData, "eyebrow"),
        headline: readString(formData, "headline"),
        subheadline: readString(formData, "subheadline"),
        primaryCta: button("primaryCta"),
        secondaryCta: button("secondaryCta"),
        align: readString(formData, "align") || "start",
        overlay: readString(formData, "overlay") || "soft",
      };
    case "IMAGE":
      return {
        v: 1,
        caption: readString(formData, "caption"),
        altOverride: readString(formData, "altOverride"),
        aspect: readString(formData, "aspect") || "16/9",
        objectFit: readString(formData, "objectFit") || "cover",
        linkHref: readString(formData, "linkHref"),
      };
    case "RICH_TEXT":
      return {
        v: 1,
        title: readString(formData, "title"),
        body: readString(formData, "body"),
        textAlign: readString(formData, "textAlign") || "start",
        maxWidth: readString(formData, "maxWidth") || "prose",
      };
    case "CTA":
      return {
        v: 1,
        title: readString(formData, "title"),
        description: readString(formData, "description"),
        primaryCta: button("primaryCta"),
        secondaryCta: button("secondaryCta"),
        align: readString(formData, "align") || "center",
      };
    case "SPACER":
      return {
        v: 1,
        size: readString(formData, "size") || "md",
      };
  }
}

export async function createWebsitePageAction(
  _prev: PageBuilderActionState,
  formData: FormData,
): Promise<PageBuilderActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const title =
    normalizePageBuilderText(readString(formData, "title"), PAGE_TITLE_MAX) ??
    "";
  if (!title) {
    return {
      formError: "عنوان صفحه الزامی است.",
      fieldErrors: { title: "عنوان را وارد کنید." },
    };
  }

  const slugParsed = parseWebsitePageSlug(readString(formData, "slug"));
  if (!slugParsed.ok) {
    return {
      formError: slugParsed.error,
      fieldErrors: { slug: slugParsed.error },
    };
  }

  const existing = await findLivePageBySlug(organizationId, slugParsed.slug);
  if (existing) {
    return {
      formError: "صفحه‌ای با این نامک از قبل وجود دارد.",
      fieldErrors: { slug: "نامک تکراری است." },
    };
  }

  let pageId: string;
  try {
    const page = await createWebsitePageRecord({
      organizationId,
      slug: slugParsed.slug,
      title,
    });
    pageId = page.id;
  } catch {
    return { formError: "ایجاد صفحه ناموفق بود. دوباره تلاش کنید." };
  }

  revalidatePageBuilder(pageId, slugParsed.slug);
  redirect(`/admin/website/pages/${pageId}`);
}

export async function updatePageSettingsAction(
  _prev: PageBuilderActionState,
  formData: FormData,
): Promise<PageBuilderActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();

  const page = await assertOwnedPage(organizationId, pageId);
  if (!page) {
    return { formError: "صفحه یافت نشد." };
  }

  if (page.status === "ARCHIVED") {
    return {
      formError:
        "صفحه بایگانی شده است. برای ویرایش وضعیت، ابتدا آن را از بایگانی بازیابی کنید.",
    };
  }

  const title =
    normalizePageBuilderText(readString(formData, "title"), PAGE_TITLE_MAX) ??
    "";
  if (!title) {
    return {
      formError: "عنوان صفحه الزامی است.",
      fieldErrors: { title: "عنوان را وارد کنید." },
    };
  }

  const slugParsed = parseWebsitePageSlug(readString(formData, "slug"));
  if (!slugParsed.ok) {
    return {
      formError: slugParsed.error,
      fieldErrors: { slug: slugParsed.error },
    };
  }

  if (slugParsed.slug !== page.slug) {
    const clash = await findLivePageBySlug(
      organizationId,
      slugParsed.slug,
      pageId,
    );
    if (clash) {
      return {
        formError: "صفحه‌ای با این نامک از قبل وجود دارد.",
        fieldErrors: { slug: "نامک تکراری است." },
      };
    }
  }

  const seoTitle = normalizePageBuilderText(
    readString(formData, "seoTitle"),
    PAGE_SEO_TITLE_MAX,
  );
  const seoDescription = normalizePageBuilderText(
    readString(formData, "seoDescription"),
    PAGE_SEO_DESCRIPTION_MAX,
  );

  const statusRaw = readString(formData, "status").trim();
  if (statusRaw !== "DRAFT" && statusRaw !== "PUBLISHED") {
    return { formError: "وضعیت صفحه نامعتبر است." };
  }
  const nextStatus: PageStatus = statusRaw;

  if (nextStatus === "PUBLISHED") {
    const publishedCount = await prisma.websitePageSection.count({
      where: {
        organizationId,
        pageId,
        deletedAt: null,
        status: "PUBLISHED",
      },
    });
    if (publishedCount === 0) {
      return {
        formError:
          "برای انتشار صفحه، حداقل یک بخش با وضعیت «منتشرشده» لازم است. انتشار صفحه، بخش‌های پیش‌نویس را منتشر نمی‌کند.",
      };
    }
  }

  const publishedAt = resolvePagePublishedAt({
    nextStatus,
    previousPublishedAt: page.publishedAt,
  });
  const archivedAt = resolvePageArchivedAtOnPublish(nextStatus);

  const previousSlug = page.slug;

  try {
    await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        title,
        slug: slugParsed.slug,
        seoTitle,
        seoDescription,
        status: nextStatus,
        publishedAt,
        ...(archivedAt === null ? { archivedAt: null } : {}),
      },
    });
  } catch {
    return { formError: "ذخیره تنظیمات صفحه ناموفق بود." };
  }

  revalidatePageBuilder(pageId, slugParsed.slug);
  if (previousSlug !== slugParsed.slug) {
    revalidatePath(getPublicPagePath(previousSlug));
  }
  return { successMessage: "تنظیمات صفحه ذخیره شد." };
}

export async function publishPageAction(
  _prev: PageBuilderActionState,
  formData: FormData,
): Promise<PageBuilderActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();

  const page = await assertOwnedPage(organizationId, pageId);
  if (!page) return { formError: "صفحه یافت نشد." };

  if (page.status === "ARCHIVED") {
    return {
      formError:
        "صفحه بایگانی شده است. ابتدا آن را به پیش‌نویس بازگردانید، سپس منتشر کنید.",
    };
  }

  const publishedCount = await prisma.websitePageSection.count({
    where: {
      organizationId,
      pageId,
      deletedAt: null,
      status: "PUBLISHED",
    },
  });
  if (publishedCount === 0) {
    return {
      formError:
        "برای انتشار صفحه، حداقل یک بخش با وضعیت «منتشرشده» لازم است. بخش‌های پیش‌نویس به‌صورت خودکار منتشر نمی‌شوند.",
    };
  }

  const publishedAt = resolvePagePublishedAt({
    nextStatus: "PUBLISHED",
    previousPublishedAt: page.publishedAt,
  });

  try {
    await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        status: "PUBLISHED",
        publishedAt,
        archivedAt: null,
      },
    });
  } catch {
    return { formError: "انتشار صفحه ناموفق بود." };
  }

  const publicPath = getPublicPagePath(page.slug);
  revalidatePageBuilder(pageId, page.slug);
  return {
    successMessage: `صفحه منتشر شد. آدرس عمومی: ${publicPath}`,
  };
}

export async function addSectionAction(
  _prev: PageBuilderActionState,
  formData: FormData,
): Promise<PageBuilderActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const typeRaw = readString(formData, "type").trim();

  const page = await assertOwnedPage(organizationId, pageId);
  if (!page) return { formError: "صفحه یافت نشد." };
  if (!isPageBuilderSectionType(typeRaw)) {
    return { formError: "نوع بخش مجاز نیست." };
  }

  const config = getDefaultSectionConfig(typeRaw);

  try {
    await prisma.$transaction(async (tx) => {
      const sortOrder = await nextSectionSortOrder(tx, organizationId, pageId);
      await tx.websitePageSection.create({
        data: {
          organizationId,
          pageId,
          type: typeRaw,
          status: "DRAFT",
          sortOrder,
          config: config as Prisma.InputJsonValue,
        },
      });
    });
  } catch {
    return { formError: "افزودن بخش ناموفق بود." };
  }

  revalidatePageBuilder(pageId, page.slug);
  return { successMessage: "بخش جدید به‌صورت پیش‌نویس افزوده شد." };
}

export async function updateSectionAction(
  _prev: PageBuilderActionState,
  formData: FormData,
): Promise<PageBuilderActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionId = readString(formData, "sectionId").trim();

  const section = await assertOwnedSection(organizationId, sectionId);
  if (!section) return { formError: "بخش یافت نشد." };
  if (!isPageBuilderSectionType(section.type)) {
    return { formError: "نوع بخش پشتیبانی نمی‌شود." };
  }

  const statusRaw = readString(formData, "status").trim();
  if (!isSectionStatus(statusRaw)) {
    return { formError: "وضعیت بخش نامعتبر است." };
  }

  const parsed = parseConfigFromForm(section.type, formData);
  if (!parsed.ok) return { formError: parsed.error };

  try {
    await prisma.$transaction(async (tx) => {
      const mediaCheck = await assertOrganizationMediaIds(
        tx,
        organizationId,
        parsed.links.map((l) => l.mediaId),
      );
      if (!mediaCheck.ok) {
        throw new Error(mediaCheck.error);
      }

      await tx.websitePageSection.update({
        where: { id: sectionId },
        data: {
          config: parsed.config,
          status: statusRaw,
        },
      });

      await syncSectionMediaLinks(tx, {
        organizationId,
        sectionId,
        links: parsed.links,
      });
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("رسانه")
        ? error.message
        : "ذخیره بخش ناموفق بود.";
    return { formError: message };
  }

  revalidatePageBuilder(section.pageId, section.page.slug);
  return { successMessage: "بخش ذخیره شد." };
}

export async function duplicateSectionAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionId = readString(formData, "sectionId").trim();

  const section = await assertOwnedSection(organizationId, sectionId);
  if (!section || !isPageBuilderSectionType(section.type)) return;

  const parsed = parseSectionConfig(section.type, section.config);
  if (!parsed.ok) return;

  try {
    await prisma.$transaction(async (tx) => {
      const sortOrder = await nextSectionSortOrder(
        tx,
        organizationId,
        section.pageId,
      );
      const created = await tx.websitePageSection.create({
        data: {
          organizationId,
          pageId: section.pageId,
          type: section.type,
          status: "DRAFT",
          sortOrder,
          config: parsed.data as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      const links = await tx.websitePageSectionMedia.findMany({
        where: { sectionId, organizationId },
        orderBy: [{ sortOrder: "asc" }],
        select: { role: true, mediaId: true, sortOrder: true },
      });

      if (links.length > 0) {
        await tx.websitePageSectionMedia.createMany({
          data: links.map((link) => ({
            organizationId,
            sectionId: created.id,
            mediaId: link.mediaId,
            role: link.role,
            sortOrder: link.sortOrder,
          })),
        });
      }
    });
  } catch {
    return;
  }

  revalidatePageBuilder(section.pageId, section.page.slug);
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionId = readString(formData, "sectionId").trim();
  const direction = readString(formData, "direction").trim();

  if (direction !== "up" && direction !== "down") return;

  const section = await assertOwnedSection(organizationId, sectionId);
  if (!section) return;

  try {
    await prisma.$transaction(async (tx) => {
      await normalizePageSectionSortOrders(tx, organizationId, section.pageId);

      const current = await tx.websitePageSection.findFirst({
        where: { id: sectionId, organizationId, deletedAt: null },
        select: { id: true, sortOrder: true, pageId: true },
      });
      if (!current) return;

      const neighbor = await tx.websitePageSection.findFirst({
        where: {
          organizationId,
          pageId: current.pageId,
          deletedAt: null,
          sortOrder:
            direction === "up"
              ? { lt: current.sortOrder }
              : { gt: current.sortOrder },
        },
        orderBy: {
          sortOrder: direction === "up" ? "desc" : "asc",
        },
        select: { id: true, sortOrder: true },
      });
      if (!neighbor) return;

      await tx.websitePageSection.update({
        where: { id: current.id },
        data: { sortOrder: neighbor.sortOrder },
      });
      await tx.websitePageSection.update({
        where: { id: neighbor.id },
        data: { sortOrder: current.sortOrder },
      });

      await normalizePageSectionSortOrders(tx, organizationId, current.pageId);
    });
  } catch {
    return;
  }

  revalidatePageBuilder(section.pageId, section.page.slug);
}

export async function updateSectionStatusAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionId = readString(formData, "sectionId").trim();
  const statusRaw = readString(formData, "status").trim();

  if (!isSectionStatus(statusRaw)) return;

  const section = await assertOwnedSection(organizationId, sectionId);
  if (!section) return;

  try {
    await prisma.websitePageSection.update({
      where: { id: sectionId },
      data: { status: statusRaw },
    });
  } catch {
    return;
  }

  revalidatePageBuilder(section.pageId, section.page.slug);
}

export async function softDeleteSectionAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionId = readString(formData, "sectionId").trim();

  const section = await assertOwnedSection(organizationId, sectionId);
  if (!section) return;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.websitePageSection.update({
        where: { id: sectionId },
        data: { deletedAt: new Date() },
      });
      await tx.websitePageSectionMedia.deleteMany({
        where: { sectionId, organizationId },
      });
      await normalizePageSectionSortOrders(tx, organizationId, section.pageId);
    });
  } catch {
    return;
  }

  revalidatePageBuilder(section.pageId, section.page.slug);
}

export async function archivePageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const view = readListView(formData);

  const result = await archiveWebsitePage({ organizationId, pageId });
  if (!result.ok) {
    redirectToPageList(view, { error: result.message });
    return;
  }

  revalidatePageBuilder(pageId, result.data.slug);
  redirectToPageList("archived", { success: "صفحه بایگانی شد." });
}

export async function restoreArchivedPageAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const view = readListView(formData);

  const result = await restoreArchivedWebsitePage({ organizationId, pageId });
  if (!result.ok) {
    redirectToPageList(view, { error: result.message });
    return;
  }

  revalidatePageBuilder(pageId, result.data.slug);
  redirectToPageList("draft", { success: "صفحه به پیش‌نویس بازگردانده شد." });
}

export async function softDeletePageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const view = readListView(formData);

  const page = await prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: { slug: true },
  });
  if (!page) {
    redirectToPageList(view, { error: "صفحه یافت نشد." });
    return;
  }

  const result = await softDeleteWebsitePage({ organizationId, pageId });
  if (!result.ok) {
    redirectToPageList(view, { error: result.message });
    return;
  }

  revalidatePageBuilder(pageId, page.slug);
  redirectToPageList("deleted", { success: "صفحه به سطل حذف‌شده‌ها منتقل شد." });
}

export async function restoreDeletedPageAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const view = readListView(formData);

  const deleted = await prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: { not: null } },
    select: { slug: true },
  });

  const result = await restoreDeletedWebsitePage({ organizationId, pageId });
  if (!result.ok) {
    redirectToPageList(view, { error: result.message });
    return;
  }

  revalidatePageBuilder(pageId, deleted?.slug ?? result.data.slug);
  redirectToPageList("draft", { success: "صفحه بازیابی شد." });
}

export async function duplicatePageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const pageId = readString(formData, "pageId").trim();
  const view = readListView(formData);

  const source = await prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: { slug: true },
  });
  if (!source) {
    redirectToPageList(view, { error: "صفحه یافت نشد." });
    return;
  }

  const result = await duplicateWebsitePage({
    organizationId,
    sourcePageId: pageId,
  });
  if (!result.ok) {
    redirectToPageList(view, { error: result.message });
    return;
  }

  revalidatePageBuilder(undefined, source.slug);
  revalidatePageBuilder(result.data.id, result.data.slug);
  redirect(`/admin/website/pages/${result.data.id}`);
}
