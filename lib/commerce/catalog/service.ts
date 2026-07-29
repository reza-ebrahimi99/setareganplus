/**
 * Commerce catalog admin + public loaders / writers.
 */

import {
  CommerceBindingType,
  CommerceFormatSize,
  CommerceItemStatus,
  CommercePrintType,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import {
  featuresFromFormText,
  parseFeatureList,
  type CommerceBindingTypeValue,
  type CommerceFormatSizeValue,
  type CommercePrintTypeValue,
} from "@/lib/commerce/booklet";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import { seedCommerceCategoriesForOrganization } from "@/lib/commerce/categories/seed";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";

function slugifyFa(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function optionalEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function parseRequiredNonNegInt(
  raw: FormDataEntryValue | null,
  fallback = 0,
): number {
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0) return fallback;
  return n;
}

export type CommerceItemAdminRow = {
  id: string;
  title: string;
  slug: string;
  status: CommerceItemStatus;
  isVisible: boolean;
  basePriceRials: number;
  salePriceRials: number | null;
  stockQuantity: number | null;
  unlimitedStock: boolean;
  authors: string;
  subject: string | null;
  gradeLabel: string | null;
  updatedAt: Date;
  categoryTitle: string | null;
  imageUrl: string | null;
};

export async function listAdminCommerceItems(
  organizationId: string,
): Promise<CommerceItemAdminRow[]> {
  await seedCommerceCategoriesForOrganization(prisma, organizationId);

  const rows = await prisma.commerceItem.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      primaryImage: { select: { storageKey: true, status: true } },
      categoryLinks: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { title: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    isVisible: row.isVisible,
    basePriceRials: row.basePriceRials,
    salePriceRials: row.salePriceRials,
    stockQuantity: row.stockQuantity,
    unlimitedStock: row.unlimitedStock,
    authors: row.authors,
    subject: row.subject,
    gradeLabel: row.gradeLabel,
    updatedAt: row.updatedAt,
    categoryTitle: row.categoryLinks[0]?.category.title ?? null,
    imageUrl:
      row.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(row.primaryImage.storageKey)
        : null,
  }));
}

export async function listAdminCommerceCategories(organizationId: string) {
  await seedCommerceCategoriesForOrganization(prisma, organizationId);
  return prisma.commerceCategory.findMany({
    where: { organizationId, deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true },
  });
}

export async function getAdminCommerceItem(
  organizationId: string,
  itemId: string,
) {
  const item = await prisma.commerceItem.findFirst({
    where: { id: itemId, organizationId, deletedAt: null },
    include: {
      primaryImage: {
        select: { id: true, storageKey: true, status: true, altText: true },
      },
      categoryLinks: {
        select: { categoryId: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!item) return null;

  return {
    ...item,
    features: parseFeatureList(item.features),
    categoryId: item.categoryLinks[0]?.categoryId ?? null,
    imageUrl:
      item.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(item.primaryImage.storageKey)
        : null,
  };
}

export type UpsertCommerceItemResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

export async function upsertCommerceItemFromForm(params: {
  organizationId: string;
  itemId?: string | null;
  formData: FormData;
}): Promise<UpsertCommerceItemResult> {
  const title = String(params.formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "نام محصول الزامی است." };

  let slug = String(params.formData.get("slug") ?? "").trim();
  if (!slug) slug = slugifyFa(title);
  if (!slug) return { ok: false, error: "slug معتبر نیست." };

  const shortDescription = String(
    params.formData.get("shortDescription") ?? "",
  ).trim();
  const description = String(params.formData.get("description") ?? "").trim();
  const authors = String(params.formData.get("authors") ?? "").trim();
  const subject =
    String(params.formData.get("subject") ?? "").trim() || null;
  const gradeLabel =
    String(params.formData.get("gradeLabel") ?? "").trim() || null;
  const statusRaw = String(params.formData.get("status") ?? "DRAFT").trim();
  const allowedStatuses = [
    "DRAFT",
    "ACTIVE",
    "OUT_OF_STOCK",
    "ARCHIVED",
  ] as const;
  const status = (allowedStatuses as readonly string[]).includes(statusRaw)
    ? (statusRaw as CommerceItemStatus)
    : CommerceItemStatus.DRAFT;

  const basePriceRials = parseRequiredNonNegInt(
    params.formData.get("basePriceRials"),
  );
  const saleRaw = String(params.formData.get("salePriceRials") ?? "").trim();
  const salePriceRials = saleRaw ? parseRequiredNonNegInt(saleRaw) : null;
  if (salePriceRials != null && salePriceRials > basePriceRials) {
    return { ok: false, error: "قیمت فروش نمی‌تواند از قیمت اصلی بیشتر باشد." };
  }

  const priceStartsAtRaw = String(
    params.formData.get("priceStartsAt") ?? "",
  ).trim();
  const priceEndsAtRaw = String(params.formData.get("priceEndsAt") ?? "").trim();
  const priceStartsAt = priceStartsAtRaw ? new Date(priceStartsAtRaw) : null;
  const priceEndsAt = priceEndsAtRaw ? new Date(priceEndsAtRaw) : null;
  if (priceStartsAt && Number.isNaN(priceStartsAt.getTime())) {
    return { ok: false, error: "تاریخ شروع تخفیف نامعتبر است." };
  }
  if (priceEndsAt && Number.isNaN(priceEndsAt.getTime())) {
    return { ok: false, error: "تاریخ پایان تخفیف نامعتبر است." };
  }

  const stockQuantity = parseOptionalInt(params.formData.get("stockQuantity"));
  const isVisible = params.formData.get("isVisible") === "true";
  const pageCount = parseOptionalInt(params.formData.get("pageCount"));
  const editionYear = parseOptionalInt(params.formData.get("editionYear"));
  const printType = optionalEnum(
    String(params.formData.get("printType") ?? ""),
    ["COLOR", "BLACK_AND_WHITE"] as const,
  ) as CommercePrintTypeValue | null;
  const bindingType = optionalEnum(
    String(params.formData.get("bindingType") ?? ""),
    ["STAPLED", "SPIRAL", "PERFECT", "OTHER"] as const,
  ) as CommerceBindingTypeValue | null;
  const formatSize = optionalEnum(
    String(params.formData.get("formatSize") ?? ""),
    ["A4", "A5", "RAHLI", "OTHER"] as const,
  ) as CommerceFormatSizeValue | null;

  const features = featuresFromFormText(
    String(params.formData.get("features") ?? ""),
  );
  const categoryId =
    String(params.formData.get("categoryId") ?? "").trim() || null;
  const primaryImageAssetId =
    String(params.formData.get("primaryImageAssetId") ?? "").trim() || null;

  const slugConflict = await prisma.commerceItem.findFirst({
    where: {
      organizationId: params.organizationId,
      slug,
      deletedAt: null,
      ...(params.itemId ? { NOT: { id: params.itemId } } : {}),
    },
    select: { id: true },
  });
  if (slugConflict) {
    return { ok: false, error: "این slug قبلاً استفاده شده است." };
  }

  if (categoryId) {
    const category = await prisma.commerceCategory.findFirst({
      where: {
        id: categoryId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!category) return { ok: false, error: "دسته‌بندی معتبر نیست." };
  }

  if (primaryImageAssetId) {
    const media = await prisma.mediaAsset.findFirst({
      where: {
        id: primaryImageAssetId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!media) return { ok: false, error: "تصویر جلد معتبر نیست." };
  }

  const data = {
    organizationId: params.organizationId,
    title,
    slug,
    shortDescription,
    description,
    status,
    systemKind: CommerceSystemKind.PHYSICAL,
    basePriceRials,
    salePriceRials,
    priceStartsAt,
    priceEndsAt,
    primaryImageAssetId,
    trackInventory: true,
    unlimitedStock: false,
    stockQuantity: stockQuantity ?? 0,
    requiresShipping: false,
    grantsDigitalAccess: false,
    requiresScheduling: false,
    requiresEnrollment: false,
    isVisible,
    authors,
    subject,
    gradeLabel,
    pageCount,
    editionYear,
    printType: printType as CommercePrintType | null,
    bindingType: bindingType as CommerceBindingType | null,
    formatSize: formatSize as CommerceFormatSize | null,
    features,
  };

  try {
    const itemId = await prisma.$transaction(async (tx) => {
      let id = params.itemId ?? null;
      if (id) {
        const existing = await tx.commerceItem.findFirst({
          where: {
            id,
            organizationId: params.organizationId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!existing) throw new Error("محصول یافت نشد.");
        await tx.commerceItem.update({
          where: { id },
          data: {
            title: data.title,
            slug: data.slug,
            shortDescription: data.shortDescription,
            description: data.description,
            status: data.status,
            systemKind: data.systemKind,
            basePriceRials: data.basePriceRials,
            salePriceRials: data.salePriceRials,
            priceStartsAt: data.priceStartsAt,
            priceEndsAt: data.priceEndsAt,
            primaryImageAssetId: data.primaryImageAssetId,
            trackInventory: true,
            unlimitedStock: false,
            stockQuantity: data.stockQuantity,
            requiresShipping: false,
            isVisible: data.isVisible,
            authors: data.authors,
            subject: data.subject,
            gradeLabel: data.gradeLabel,
            pageCount: data.pageCount,
            editionYear: data.editionYear,
            printType: data.printType,
            bindingType: data.bindingType,
            formatSize: data.formatSize,
            features: data.features,
          },
        });
        await tx.commerceItemCategory.deleteMany({
          where: { organizationId: params.organizationId, itemId: id },
        });
      } else {
        const created = await tx.commerceItem.create({ data });
        id = created.id;
      }

      if (categoryId && id) {
        await tx.commerceItemCategory.create({
          data: {
            organizationId: params.organizationId,
            itemId: id,
            categoryId,
            sortOrder: 0,
          },
        });
      }

      return id!;
    });

    return { ok: true, itemId };
  } catch (error) {
    console.error("[commerce] upsert item failed", error);
    return { ok: false, error: "ذخیره محصول ناموفق بود." };
  }
}

export type PublicCommerceProduct = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  authors: string;
  subject: string | null;
  gradeLabel: string | null;
  pageCount: number | null;
  editionYear: number | null;
  printType: CommercePrintType | null;
  bindingType: CommerceBindingType | null;
  formatSize: CommerceFormatSize | null;
  features: string[];
  stockQuantity: number | null;
  status: CommerceItemStatus;
  inStock: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  categoryTitle: string | null;
  pricing: ReturnType<typeof resolveCommercePrice>;
};

export type ListPublicCommerceProductsInput = {
  organizationId: string;
  q?: string;
  gradeLabel?: string;
  subject?: string;
  limit?: number;
};

type PublicCommerceProductRow = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  authors: string;
  subject: string | null;
  gradeLabel: string | null;
  pageCount: number | null;
  editionYear: number | null;
  printType: CommercePrintType | null;
  bindingType: CommerceBindingType | null;
  formatSize: CommerceFormatSize | null;
  features: unknown;
  stockQuantity: number | null;
  unlimitedStock: boolean;
  status: CommerceItemStatus;
  trackInventory: boolean;
  basePriceRials: number;
  salePriceRials: number | null;
  priceStartsAt: Date | null;
  priceEndsAt: Date | null;
  primaryImage: {
    storageKey: string;
    status: string;
    altText: string | null;
  } | null;
  categoryLinks: Array<{
    category: {
      title: string;
    };
  }>;
};

function publicCommerceProductWhere(
  params: Pick<
    ListPublicCommerceProductsInput,
    "organizationId" | "q" | "gradeLabel" | "subject"
  >,
) {
  const q = params.q?.trim();
  const gradeLabel = params.gradeLabel?.trim();
  const subject = params.subject?.trim();

  return {
    organizationId: params.organizationId,
    deletedAt: null,
    isVisible: true,
    status: CommerceItemStatus.ACTIVE,
    AND: [
      {
        OR: [
          { trackInventory: false },
          { unlimitedStock: true },
          { stockQuantity: { gt: 0 } },
        ],
      },
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { authors: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
                { gradeLabel: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(gradeLabel ? [{ gradeLabel }] : []),
      ...(subject ? [{ subject }] : []),
    ],
  };
}

function mapPublicCommerceProduct(
  item: PublicCommerceProductRow,
): PublicCommerceProduct {
  const stock = item.stockQuantity ?? 0;
  const inStock =
    item.status === CommerceItemStatus.ACTIVE &&
    (!item.trackInventory || item.unlimitedStock || stock > 0);

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    shortDescription: item.shortDescription,
    description: item.description,
    authors: item.authors,
    subject: item.subject,
    gradeLabel: item.gradeLabel,
    pageCount: item.pageCount,
    editionYear: item.editionYear,
    printType: item.printType,
    bindingType: item.bindingType,
    formatSize: item.formatSize,
    features: parseFeatureList(item.features),
    stockQuantity: item.unlimitedStock ? null : stock,
    status: item.status,
    inStock,
    imageUrl:
      item.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(item.primaryImage.storageKey)
        : null,
    imageAlt: item.primaryImage?.altText ?? item.title,
    categoryTitle: item.categoryLinks[0]?.category.title ?? null,
    pricing: resolveCommercePrice({
      basePriceRials: item.basePriceRials,
      salePriceRials: item.salePriceRials,
      priceStartsAt: item.priceStartsAt,
      priceEndsAt: item.priceEndsAt,
    }),
  };
}

export async function listPublicCommerceProducts(
  params: ListPublicCommerceProductsInput,
): Promise<PublicCommerceProduct[]> {
  const items = await prisma.commerceItem.findMany({
    where: publicCommerceProductWhere(params),
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: params.limit,
    include: {
      primaryImage: {
        select: { storageKey: true, status: true, altText: true },
      },
      categoryLinks: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { title: true } } },
      },
    },
  });

  return items.map(mapPublicCommerceProduct);
}

export async function listPublicCommerceFilters(organizationId: string): Promise<{
  grades: string[];
  subjects: string[];
}> {
  const items = await prisma.commerceItem.findMany({
    where: publicCommerceProductWhere({ organizationId }),
    select: {
      gradeLabel: true,
      subject: true,
    },
  });

  const grades = Array.from(
    new Set(
      items
        .map((item: { gradeLabel: string | null }) => item.gradeLabel?.trim() ?? "")
        .filter((value: string) => value.length > 0),
    ),
  ).sort((a: string, b: string) => a.localeCompare(b, "fa"));
  const subjects = Array.from(
    new Set(
      items
        .map((item: { subject: string | null }) => item.subject?.trim() ?? "")
        .filter((value: string) => value.length > 0),
    ),
  ).sort((a: string, b: string) => a.localeCompare(b, "fa"));

  return { grades, subjects };
}

export async function getPublicCommerceProductBySlug(params: {
  organizationId: string;
  slug: string;
}): Promise<PublicCommerceProduct | null> {
  const item = await prisma.commerceItem.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: params.slug,
      deletedAt: null,
      isVisible: true,
      status: {
        in: [CommerceItemStatus.ACTIVE, CommerceItemStatus.OUT_OF_STOCK],
      },
    },
    include: {
      primaryImage: {
        select: { storageKey: true, status: true, altText: true },
      },
      categoryLinks: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { title: true } } },
      },
    },
  });
  if (!item) return null;

  const stock = item.stockQuantity ?? 0;
  const inStock =
    item.status === CommerceItemStatus.ACTIVE &&
    (!item.trackInventory || item.unlimitedStock || stock > 0);
  if (!inStock) return null;

  return mapPublicCommerceProduct(item);
}
