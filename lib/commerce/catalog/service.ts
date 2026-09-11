/**
 * Shop + admin catalog loaders — canonical BookSku only.
 */

import {
  BookPriceKind,
  BookSkuStatus,
  CommerceBindingType,
  CommerceFormatSize,
  CommercePrintType,
  CommerceSystemKind,
} from "@/generated/prisma/enums";
import { latestOpenPrice, toShopPriceInput } from "@/lib/books/catalog/price";
import { buildSkuSearchText } from "@/lib/books/catalog/search";
import { allocateOrgBookSkuSlug } from "@/lib/books/catalog/sku-service";
import { slugifyBookSku } from "@/lib/books/catalog/slug";
import {
  featuresFromFormText,
  parseFeatureList,
  type CommerceBindingTypeValue,
  type CommerceFormatSizeValue,
  type CommercePrintTypeValue,
} from "@/lib/commerce/booklet";
import {
  bookSkuStatusFromShopStatus,
  shopStatusFromBookSku,
} from "@/lib/commerce/catalog/shop-status";
import { seedCommerceCategoriesForOrganization } from "@/lib/commerce/categories/seed";
import { resolveCommercePrice } from "@/lib/commerce/pricing";
import type { CommerceItemStatusValue } from "@/lib/commerce/types";
import { publicLibraryUrl } from "@/lib/media/library-image";
import { prisma } from "@/lib/prisma";

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

const PRICE_SELECT = {
  id: true,
  kind: true,
  amountRials: true,
  effectiveFrom: true,
  effectiveTo: true,
} as const;

export type CommerceItemAdminRow = {
  id: string;
  title: string;
  slug: string;
  status: CommerceItemStatusValue;
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
  isFeatured: boolean;
  metaTitle: string | null;
};

export async function listAdminCommerceItems(
  organizationId: string,
): Promise<CommerceItemAdminRow[]> {
  await seedCommerceCategoriesForOrganization(prisma, organizationId);

  const rows = await prisma.bookSku.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      title: { select: { title: true } },
      prices: { select: PRICE_SELECT },
      primaryImage: { select: { storageKey: true, status: true } },
      categoryLinks: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { title: true } } },
      },
    },
  });

  const now = new Date();
  return rows.map((row) => {
    const price = toShopPriceInput(row.prices, now);
    return {
      id: row.id,
      title: row.title.title,
      slug: row.slug,
      status: shopStatusFromBookSku(row),
      isVisible: row.isVisible,
      basePriceRials: price.basePriceRials,
      salePriceRials: price.salePriceRials,
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
      isFeatured: row.isFeatured,
      metaTitle: row.metaTitle,
    };
  });
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
  const sku = await prisma.bookSku.findFirst({
    where: { id: itemId, organizationId, deletedAt: null },
    include: {
      title: { select: { title: true, description: true } },
      prices: { select: PRICE_SELECT, orderBy: { effectiveFrom: "desc" } },
      primaryImage: {
        select: { id: true, storageKey: true, status: true, altText: true },
      },
      categoryLinks: {
        select: { categoryId: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!sku) return null;

  const list = latestOpenPrice(sku.prices, BookPriceKind.LIST);
  const sale = latestOpenPrice(sku.prices, BookPriceKind.SALE);

  return {
    id: sku.id,
    title: sku.title.title,
    slug: sku.slug,
    shortDescription: sku.shortDescription,
    description: sku.title.description ?? "",
    status: shopStatusFromBookSku(sku),
    isVisible: sku.isVisible,
    authors: sku.authors,
    subject: sku.subject,
    gradeLabel: sku.gradeLabel,
    pageCount: sku.pageCount,
    editionYear: sku.editionYear ? Number(sku.editionYear) || null : null,
    printType: sku.printType,
    bindingType: sku.bindingType,
    formatSize: sku.formatSize,
    features: parseFeatureList(sku.features),
    basePriceRials: list?.amountRials ?? 0,
    salePriceRials: sale?.amountRials ?? null,
    priceStartsAt: sale?.effectiveFrom ?? null,
    priceEndsAt: sale?.effectiveTo ?? null,
    stockQuantity: sku.stockQuantity,
    primaryImageAssetId: sku.primaryImageAssetId,
    categoryId: sku.categoryLinks[0]?.categoryId ?? null,
    imageUrl:
      sku.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(sku.primaryImage.storageKey)
        : null,
    isFeatured: sku.isFeatured,
    metaTitle: sku.metaTitle ?? "",
    metaDescription: sku.metaDescription ?? "",
  };
}

export type UpsertCommerceItemResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string };

async function writeSkuPrice(params: {
  organizationId: string;
  skuId: string;
  kind: BookPriceKind;
  amountRials: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}) {
  const open = await prisma.bookSkuPrice.findFirst({
    where: {
      organizationId: params.organizationId,
      skuId: params.skuId,
      kind: params.kind,
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (params.amountRials == null) {
    if (open) {
      await prisma.bookSkuPrice.update({
        where: { id: open.id },
        data: { effectiveTo: params.effectiveFrom },
      });
    }
    return;
  }

  if (
    open &&
    open.amountRials === params.amountRials &&
    (open.effectiveTo ?? null) === params.effectiveTo
  ) {
    return;
  }

  if (open) {
    await prisma.bookSkuPrice.update({
      where: { id: open.id },
      data: { effectiveTo: params.effectiveFrom },
    });
  }

  await prisma.bookSkuPrice.create({
    data: {
      organizationId: params.organizationId,
      skuId: params.skuId,
      kind: params.kind,
      amountRials: params.amountRials,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo,
      source: "SHOP",
    },
  });
}

export async function upsertCommerceItemFromForm(params: {
  organizationId: string;
  itemId?: string | null;
  formData: FormData;
}): Promise<UpsertCommerceItemResult> {
  const title = String(params.formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "نام محصول الزامی است." };

  let slug = slugifyBookSku(String(params.formData.get("slug") ?? "").trim() || title);
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
  const shopStatus = (allowedStatuses as readonly string[]).includes(statusRaw)
    ? (statusRaw as (typeof allowedStatuses)[number])
    : "DRAFT";
  const skuStatus = bookSkuStatusFromShopStatus(shopStatus);

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

  let stockQuantity = parseOptionalInt(params.formData.get("stockQuantity"));
  if (shopStatus === "OUT_OF_STOCK") stockQuantity = 0;
  const isVisible = params.formData.get("isVisible") === "true";
  const isFeatured = params.formData.get("isFeatured") === "true";
  const metaTitle = String(params.formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription =
    String(params.formData.get("metaDescription") ?? "").trim() || null;
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

  slug = await allocateOrgBookSkuSlug(
    params.organizationId,
    slug,
    params.itemId ?? undefined,
  );

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

  const now = new Date();

  try {
    const itemId = await prisma.$transaction(async (tx) => {
      let id = params.itemId ?? null;
      if (id) {
        const existing = await tx.bookSku.findFirst({
          where: {
            id,
            organizationId: params.organizationId,
            deletedAt: null,
          },
          select: { id: true, titleId: true, internalCode: true },
        });
        if (!existing) throw new Error("محصول یافت نشد.");

        await tx.bookTitle.update({
          where: { id: existing.titleId },
          data: {
            title,
            description: description || null,
          },
        });

        await tx.bookSku.update({
          where: { id },
          data: {
            slug,
            shortDescription,
            authors,
            subject,
            gradeLabel,
            pageCount,
            editionYear: editionYear != null ? String(editionYear) : null,
            printType: printType as CommercePrintType | null,
            bindingType: bindingType as CommerceBindingType | null,
            formatSize: formatSize as CommerceFormatSize | null,
            features,
            status: skuStatus,
            isVisible,
            isFeatured,
            metaTitle,
            metaDescription,
            primaryImageAssetId,
            trackInventory: true,
            unlimitedStock: false,
            stockQuantity: stockQuantity ?? 0,
            systemKind: CommerceSystemKind.PHYSICAL,
            searchText: buildSkuSearchText({
              internalCode: existing.internalCode,
              title,
              authors,
              subject,
              gradeLabel,
            }),
          },
        });

        await tx.bookSkuCategory.deleteMany({
          where: { organizationId: params.organizationId, skuId: id },
        });
      } else {
        const createdTitle = await tx.bookTitle.create({
          data: {
            organizationId: params.organizationId,
            title,
            description: description || null,
          },
          select: { id: true },
        });
        let internalCode = `SHOP-${slug}`.slice(0, 80);
        const codeTaken = await tx.bookSku.findFirst({
          where: {
            organizationId: params.organizationId,
            internalCode,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (codeTaken) {
          internalCode = `SHOP-${slug}-${Date.now().toString(36)}`.slice(0, 80);
        }
        const created = await tx.bookSku.create({
          data: {
            organizationId: params.organizationId,
            titleId: createdTitle.id,
            internalCode,
            slug,
            shortDescription,
            authors,
            subject,
            gradeLabel,
            pageCount,
            editionYear: editionYear != null ? String(editionYear) : null,
            printType: printType as CommercePrintType | null,
            bindingType: bindingType as CommerceBindingType | null,
            formatSize: formatSize as CommerceFormatSize | null,
            features,
            status: skuStatus,
            isVisible,
            isFeatured,
            metaTitle,
            metaDescription,
            primaryImageAssetId,
            trackInventory: true,
            unlimitedStock: false,
            stockQuantity: stockQuantity ?? 0,
            systemKind: CommerceSystemKind.PHYSICAL,
            searchText: buildSkuSearchText({
              internalCode,
              title,
              authors,
              subject,
              gradeLabel,
            }),
          },
          select: { id: true },
        });
        id = created.id;
      }

      if (categoryId && id) {
        await tx.bookSkuCategory.create({
          data: {
            organizationId: params.organizationId,
            skuId: id,
            categoryId,
            sortOrder: 0,
          },
        });
      }

      return id!;
    });

    await writeSkuPrice({
      organizationId: params.organizationId,
      skuId: itemId,
      kind: BookPriceKind.LIST,
      amountRials: basePriceRials,
      effectiveFrom: now,
      effectiveTo: null,
    });
    await writeSkuPrice({
      organizationId: params.organizationId,
      skuId: itemId,
      kind: BookPriceKind.SALE,
      amountRials: salePriceRials,
      effectiveFrom: priceStartsAt && !Number.isNaN(priceStartsAt.getTime()) ? priceStartsAt : now,
      effectiveTo: priceEndsAt,
    });

    return { ok: true, itemId };
  } catch (error) {
    console.error("[commerce] upsert book sku failed", error);
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
  status: CommerceItemStatusValue;
  inStock: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  categoryTitle: string | null;
  categorySlug: string | null;
  isFeatured: boolean;
  updatedAt: Date;
  branchId: string | null;
  pricing: ReturnType<typeof resolveCommercePrice>;
};

export type ListPublicCommerceProductsInput = {
  organizationId: string;
  q?: string;
  gradeLabel?: string;
  subject?: string;
  categorySlug?: string;
  excludeId?: string;
  featured?: boolean;
  limit?: number;
  sort?: "newest" | "featured" | "priceAsc" | "priceDesc";
};

function publicBookSkuWhere(
  params: Pick<
    ListPublicCommerceProductsInput,
    "organizationId" | "q" | "gradeLabel" | "subject" | "categorySlug" | "excludeId" | "featured"
  >,
) {
  const q = params.q?.trim();
  const gradeLabel = params.gradeLabel?.trim();
  const subject = params.subject?.trim();
  const categorySlug = params.categorySlug?.trim();

  return {
    organizationId: params.organizationId,
    deletedAt: null,
    isVisible: true,
    status: BookSkuStatus.ACTIVE,
    ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    ...(params.featured ? { isFeatured: true } : {}),
    title: { deletedAt: null },
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
                { searchText: { contains: q.toLocaleLowerCase("fa") } },
                { title: { title: { contains: q, mode: "insensitive" as const } } },
                { authors: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
                { gradeLabel: { contains: q, mode: "insensitive" as const } },
                { internalCode: { contains: q, mode: "insensitive" as const } },
                { barcode: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(gradeLabel ? [{ gradeLabel }] : []),
      ...(subject ? [{ subject }] : []),
      ...(categorySlug
        ? [
            {
              categoryLinks: {
                some: { category: { slug: categorySlug, deletedAt: null } },
              },
            },
          ]
        : []),
    ],
  };
}

const publicSkuInclude = {
  title: { select: { title: true, description: true } },
  prices: { select: PRICE_SELECT },
  primaryImage: {
    select: { storageKey: true, status: true, altText: true },
  },
  categoryLinks: {
    take: 1,
    orderBy: { sortOrder: "asc" as const },
    include: { category: { select: { title: true, slug: true } } },
  },
} as const;

function mapPublicCommerceProduct(sku: {
  id: string;
  slug: string;
  shortDescription: string;
  authors: string;
  subject: string | null;
  gradeLabel: string | null;
  pageCount: number | null;
  editionYear: string | null;
  printType: CommercePrintType | null;
  bindingType: CommerceBindingType | null;
  formatSize: CommerceFormatSize | null;
  features: unknown;
  stockQuantity: number | null;
  unlimitedStock: boolean;
  status: BookSkuStatus;
  trackInventory: boolean;
  branchId: string | null;
  isFeatured: boolean;
  updatedAt: Date;
  title: { title: string; description: string | null };
  prices: Array<{
    id: string;
    kind: BookPriceKind;
    amountRials: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  }>;
  primaryImage: {
    storageKey: string;
    status: string;
    altText: string | null;
  } | null;
  categoryLinks: Array<{ category: { title: string; slug: string } }>;
}): PublicCommerceProduct {
  const stock = sku.stockQuantity ?? 0;
  const shopStatus = shopStatusFromBookSku(sku);
  const inStock =
    shopStatus === "ACTIVE" &&
    (!sku.trackInventory || sku.unlimitedStock || stock > 0);
  const price = toShopPriceInput(sku.prices);

  return {
    id: sku.id,
    title: sku.title.title,
    slug: sku.slug,
    shortDescription: sku.shortDescription,
    description: sku.title.description ?? "",
    authors: sku.authors,
    subject: sku.subject,
    gradeLabel: sku.gradeLabel,
    pageCount: sku.pageCount,
    editionYear: sku.editionYear ? Number(sku.editionYear) || null : null,
    printType: sku.printType,
    bindingType: sku.bindingType,
    formatSize: sku.formatSize,
    features: parseFeatureList(sku.features),
    stockQuantity: sku.unlimitedStock ? null : stock,
    status: shopStatus,
    inStock,
    imageUrl:
      sku.primaryImage?.status === "ACTIVE"
        ? publicLibraryUrl(sku.primaryImage.storageKey)
        : null,
    imageAlt: sku.primaryImage?.altText ?? sku.title.title,
    categoryTitle: sku.categoryLinks[0]?.category.title ?? null,
    categorySlug: sku.categoryLinks[0]?.category.slug ?? null,
    isFeatured: sku.isFeatured,
    updatedAt: sku.updatedAt,
    branchId: sku.branchId,
    pricing: resolveCommercePrice(price),
  };
}

export async function listPublicCommerceProducts(
  params: ListPublicCommerceProductsInput,
): Promise<PublicCommerceProduct[]> {
  const sort = params.sort ?? "featured";
  const items = await prisma.bookSku.findMany({
    where: publicBookSkuWhere(params),
    orderBy:
      sort === "newest"
        ? [{ updatedAt: "desc" }]
        : [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    take: params.limit ?? 80,
    include: publicSkuInclude,
  });

  const mapped = items.map(mapPublicCommerceProduct);
  if (sort === "priceAsc") {
    return [...mapped].sort(
      (a, b) => a.pricing.finalPriceRials - b.pricing.finalPriceRials,
    );
  }
  if (sort === "priceDesc") {
    return [...mapped].sort(
      (a, b) => b.pricing.finalPriceRials - a.pricing.finalPriceRials,
    );
  }
  return mapped;
}

export async function listPublicCommerceFilters(organizationId: string): Promise<{
  grades: string[];
  subjects: string[];
}> {
  const items = await prisma.bookSku.findMany({
    where: publicBookSkuWhere({ organizationId }),
    select: {
      gradeLabel: true,
      subject: true,
    },
  });

  const grades = Array.from(
    new Set(
      items
        .map((item) => item.gradeLabel?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "fa"));
  const subjects = Array.from(
    new Set(
      items
        .map((item) => item.subject?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "fa"));

  return { grades, subjects };
}

export async function getPublicCommerceProductBySlug(params: {
  organizationId: string;
  slug: string;
}): Promise<PublicCommerceProduct | null> {
  const sku = await prisma.bookSku.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: params.slug,
      deletedAt: null,
      isVisible: true,
      status: { in: [BookSkuStatus.ACTIVE, BookSkuStatus.INACTIVE] },
    },
    include: publicSkuInclude,
  });
  if (!sku) return null;

  const mapped = mapPublicCommerceProduct(sku);
  if (!mapped.inStock) return null;
  return mapped;
}

export async function listPublicStoreCollections(organizationId: string) {
  await seedCommerceCategoriesForOrganization(prisma, organizationId);
  return prisma.commerceCategory.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
      isVisible: true,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isFeatured: true,
    },
  });
}

export async function listAdminCommerceSeoRows(organizationId: string) {
  return prisma.bookSku.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      slug: true,
      isVisible: true,
      metaTitle: true,
      metaDescription: true,
      title: { select: { title: true } },
    },
  });
}

export async function setBookSkuMerchFlag(params: {
  organizationId: string;
  skuId: string;
  field: "isFeatured" | "isVisible";
  value: boolean;
}): Promise<UpsertCommerceItemResult> {
  const sku = await prisma.bookSku.findFirst({
    where: {
      id: params.skuId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!sku) return { ok: false, error: "کتاب یافت نشد." };
  await prisma.bookSku.update({
    where: { id: sku.id },
    data: { [params.field]: params.value },
  });
  return { ok: true, itemId: sku.id };
}
