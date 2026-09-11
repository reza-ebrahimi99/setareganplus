/**
 * Merchandising categories for StarBook. Not a second catalog —
 * products remain BookSku; this only groups them for the storefront.
 */

import { slugifyBookSku } from "@/lib/books/catalog/slug";
import { seedCommerceCategoriesForOrganization } from "@/lib/commerce/categories/seed";
import {
  CommerceCategoryValidationError,
  assertUniqueCategorySlug,
  assertValidCategoryParent,
  normalizeCommerceCategoryInput,
} from "@/lib/commerce/categories/validation";
import { prisma } from "@/lib/prisma";

export type CommerceCategoryAdminRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  parentId: string | null;
  parentTitle: string | null;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  color: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number;
};

export type UpsertCommerceCategoryResult =
  | { ok: true; categoryId: string }
  | { ok: false; error: string };

async function allocateCategorySlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
) {
  const base = slugifyBookSku(desired) || `cat-${Date.now().toString(36)}`;
  let candidate = base;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const taken = await prisma.commerceCategory.findFirst({
      where: {
        organizationId,
        slug: candidate,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 80);
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 80);
}

export async function listAdminCommerceCategoriesManage(
  organizationId: string,
): Promise<CommerceCategoryAdminRow[]> {
  await seedCommerceCategoriesForOrganization(prisma, organizationId);
  const rows = await prisma.commerceCategory.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { title: true } },
      _count: { select: { skuLinks: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    parentId: row.parentId,
    parentTitle: row.parent?.title ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isVisible: row.isVisible,
    isFeatured: row.isFeatured,
    color: row.color,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    productCount: row._count.skuLinks,
  }));
}

export async function upsertCommerceCategoryFromForm(params: {
  organizationId: string;
  categoryId?: string | null;
  formData: FormData;
}): Promise<UpsertCommerceCategoryResult> {
  let normalized;
  try {
    normalized = normalizeCommerceCategoryInput({
      title: String(params.formData.get("title") ?? ""),
      slug: String(params.formData.get("slug") ?? ""),
      parentId: String(params.formData.get("parentId") ?? "") || null,
      sortOrder: String(params.formData.get("sortOrder") ?? "0"),
      description: String(params.formData.get("description") ?? ""),
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CommerceCategoryValidationError
          ? error.message
          : "داده دسته نامعتبر است.",
    };
  }

  const existing = await prisma.commerceCategory.findMany({
    where: { organizationId: params.organizationId, deletedAt: null },
    select: { id: true, parentId: true, slug: true },
  });

  try {
    assertValidCategoryParent({
      categoryId: params.categoryId,
      parentId: normalized.parentId,
      existing,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CommerceCategoryValidationError
          ? error.message
          : "والد نامعتبر است.",
    };
  }

  const slug = await allocateCategorySlug(
    params.organizationId,
    normalized.slug,
    params.categoryId ?? undefined,
  );

  try {
    assertUniqueCategorySlug({
      slug,
      excludeId: params.categoryId,
      existing,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CommerceCategoryValidationError
          ? error.message
          : "اسلاگ تکراری است.",
    };
  }

  const isVisible = params.formData.get("isVisible") === "true";
  const isFeatured = params.formData.get("isFeatured") === "true";
  const isActive = params.formData.get("isActive") === "true";
  const color = String(params.formData.get("color") ?? "").trim() || null;
  const metaTitle = String(params.formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription =
    String(params.formData.get("metaDescription") ?? "").trim() || null;

  if (params.categoryId) {
    const current = await prisma.commerceCategory.findFirst({
      where: {
        id: params.categoryId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!current) return { ok: false, error: "دسته یافت نشد." };
    await prisma.commerceCategory.update({
      where: { id: current.id },
      data: {
        title: normalized.title,
        slug,
        description: normalized.description,
        parentId: normalized.parentId,
        sortOrder: normalized.sortOrder,
        isVisible,
        isFeatured,
        isActive,
        color,
        metaTitle,
        metaDescription,
      },
    });
    return { ok: true, categoryId: current.id };
  }

  const created = await prisma.commerceCategory.create({
    data: {
      organizationId: params.organizationId,
      title: normalized.title,
      slug,
      description: normalized.description,
      parentId: normalized.parentId,
      sortOrder: normalized.sortOrder,
      isVisible,
      isFeatured,
      isActive,
      color,
      metaTitle,
      metaDescription,
    },
    select: { id: true },
  });
  return { ok: true, categoryId: created.id };
}

export async function archiveCommerceCategory(params: {
  organizationId: string;
  categoryId: string;
}): Promise<UpsertCommerceCategoryResult> {
  const child = await prisma.commerceCategory.findFirst({
    where: {
      organizationId: params.organizationId,
      parentId: params.categoryId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (child) {
    return { ok: false, error: "اول زیردسته‌ها را حذف یا جابه‌جا کنید." };
  }
  const current = await prisma.commerceCategory.findFirst({
    where: {
      id: params.categoryId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "دسته یافت نشد." };
  await prisma.commerceCategory.update({
    where: { id: current.id },
    data: { deletedAt: new Date(), isActive: false, isVisible: false },
  });
  return { ok: true, categoryId: current.id };
}

export async function setCommerceCategoryFlag(params: {
  organizationId: string;
  categoryId: string;
  field: "isFeatured" | "isVisible";
  value: boolean;
}): Promise<UpsertCommerceCategoryResult> {
  const current = await prisma.commerceCategory.findFirst({
    where: {
      id: params.categoryId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "دسته یافت نشد." };
  await prisma.commerceCategory.update({
    where: { id: current.id },
    data: { [params.field]: params.value },
  });
  return { ok: true, categoryId: current.id };
}
