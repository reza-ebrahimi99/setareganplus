"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  EXPERIMENTAL_PAGE_SLUG,
  EXPERIMENTAL_PUBLIC_PATH,
  PAGE_SEO_DESCRIPTION_MAX,
  PAGE_SEO_TITLE_MAX,
  PAGE_TITLE_MAX,
  isPageBuilderSectionType,
  isPageStatus,
  isSectionStatus,
  normalizePageBuilderText,
  type PageBuilderSectionType,
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
  createExperimentalPageRecord,
  findExperimentalPage,
} from "@/lib/website/page-builder/pages-admin";
import {
  getDefaultSectionConfig,
  getSectionDefinition,
} from "@/lib/website/page-builder/registry";
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

function revalidatePageBuilder(pageId?: string) {
  revalidatePath("/admin/website/pages");
  if (pageId) {
    revalidatePath(`/admin/website/pages/${pageId}`);
    revalidatePath(`/admin/website/pages/${pageId}/preview`);
  }
  revalidatePath(EXPERIMENTAL_PUBLIC_PATH);
}

async function assertOwnedPage(organizationId: string, pageId: string) {
  return prisma.websitePage.findFirst({
    where: { id: pageId, organizationId, deletedAt: null },
    select: { id: true, slug: true, status: true },
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

export async function createExperimentalPageAction(): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const existing = await findExperimentalPage(organizationId);
  if (existing) {
    redirect(`/admin/website/pages/${existing.id}`);
  }

  let pageId: string;
  try {
    const page = await createExperimentalPageRecord(organizationId);
    pageId = page.id;
  } catch {
    redirect("/admin/website/pages?error=create");
  }

  revalidatePageBuilder(pageId);
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

  const title =
    normalizePageBuilderText(readString(formData, "title"), PAGE_TITLE_MAX) ??
    "";
  if (!title) {
    return {
      formError: "عنوان صفحه الزامی است.",
      fieldErrors: { title: "عنوان را وارد کنید." },
    };
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
  if (!isPageStatus(statusRaw)) {
    return { formError: "وضعیت صفحه نامعتبر است." };
  }

  if (statusRaw === "PUBLISHED") {
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

  try {
    await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        title,
        seoTitle,
        seoDescription,
        status: statusRaw,
        publishedAt:
          statusRaw === "PUBLISHED"
            ? page.status === "PUBLISHED"
              ? undefined
              : new Date()
            : null,
      },
    });
  } catch {
    return { formError: "ذخیره تنظیمات صفحه ناموفق بود." };
  }

  revalidatePageBuilder(pageId);
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

  if (page.slug !== EXPERIMENTAL_PAGE_SLUG) {
    return { formError: "در فاز ۱ فقط صفحه آزمایشی قابل انتشار است." };
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

  try {
    await prisma.websitePage.update({
      where: { id: pageId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  } catch {
    return { formError: "انتشار صفحه ناموفق بود." };
  }

  revalidatePageBuilder(pageId);
  return {
    successMessage: `صفحه منتشر شد. آدرس عمومی: ${EXPERIMENTAL_PUBLIC_PATH}`,
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

  revalidatePageBuilder(pageId);
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

  revalidatePageBuilder(section.pageId);
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

  revalidatePageBuilder(section.pageId);
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

  revalidatePageBuilder(section.pageId);
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

  revalidatePageBuilder(section.pageId);
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

  revalidatePageBuilder(section.pageId);
}
