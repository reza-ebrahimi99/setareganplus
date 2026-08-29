import type { Prisma } from "@/generated/prisma/client";
import { BookPriceKind, BookSkuStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { BOOKS_CATALOG_PAGE_SIZE } from "@/lib/books/constants";
import { resolveCurrentPrice } from "@/lib/books/catalog/price";

export type BookCatalogSort = "newest" | "title" | "priceAsc" | "priceDesc";

export type BookCatalogFilters = {
  q?: string;
  bookTypeId?: string;
  gradeId?: string;
  subjectId?: string;
  majorId?: string;
  publisherId?: string;
  status?: BookSkuStatus;
  priceMinRials?: number;
  priceMaxRials?: number;
  sort?: BookCatalogSort;
  page?: number;
};

export type BookCatalogRow = {
  id: string;
  internalCode: string;
  barcode: string | null;
  title: string;
  editionLabel: string | null;
  editionYear: string | null;
  status: BookSkuStatus;
  bookTypeLabel: string | null;
  gradeName: string | null;
  subjectName: string | null;
  publisherName: string | null;
  currentListRials: number | null;
  currentSaleRials: number | null;
  createdAt: Date;
};

export type BookCatalogPage = {
  rows: BookCatalogRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listBookCatalog(
  organizationId: string,
  filters: BookCatalogFilters,
): Promise<BookCatalogPage> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = BOOKS_CATALOG_PAGE_SIZE;

  const where: Prisma.BookSkuWhereInput = {
    organizationId,
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q?.trim() ? { searchText: { contains: filters.q.trim().toLocaleLowerCase("fa") } } : {}),
    title: {
      deletedAt: null,
      ...(filters.bookTypeId ? { bookTypeId: filters.bookTypeId } : {}),
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.majorId ? { majorId: filters.majorId } : {}),
      ...(filters.publisherId ? { publisherId: filters.publisherId } : {}),
    },
  };

  const orderBy: Prisma.BookSkuOrderByWithRelationInput =
    filters.sort === "title" ? { title: { title: "asc" } } : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    prisma.bookSku.count({ where }),
    prisma.bookSku.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        internalCode: true,
        barcode: true,
        editionLabel: true,
        editionYear: true,
        status: true,
        createdAt: true,
        prices: {
          select: { kind: true, amountRials: true, effectiveFrom: true, effectiveTo: true, id: true },
        },
        title: {
          select: {
            title: true,
            bookType: { select: { label: true } },
            grade: { select: { name: true } },
            subject: { select: { name: true } },
            publisher: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const now = new Date();
  let mapped: BookCatalogRow[] = rows.map((row) => {
    const listPrice = resolveCurrentPrice(row.prices, BookPriceKind.LIST, now);
    const salePrice = resolveCurrentPrice(row.prices, BookPriceKind.SALE, now);
    return {
      id: row.id,
      internalCode: row.internalCode,
      barcode: row.barcode,
      title: row.title.title,
      editionLabel: row.editionLabel,
      editionYear: row.editionYear,
      status: row.status,
      bookTypeLabel: row.title.bookType?.label ?? null,
      gradeName: row.title.grade?.name ?? null,
      subjectName: row.title.subject?.name ?? null,
      publisherName: row.title.publisher?.name ?? null,
      currentListRials: listPrice?.amountRials ?? null,
      currentSaleRials: salePrice?.amountRials ?? null,
      createdAt: row.createdAt,
    };
  });

  if (filters.priceMinRials != null || filters.priceMaxRials != null) {
    mapped = mapped.filter((row) => {
      const price = row.currentSaleRials ?? row.currentListRials;
      if (price == null) return false;
      if (filters.priceMinRials != null && price < filters.priceMinRials) return false;
      if (filters.priceMaxRials != null && price > filters.priceMaxRials) return false;
      return true;
    });
  }

  if (filters.sort === "priceAsc" || filters.sort === "priceDesc") {
    mapped = [...mapped].sort((a, b) => {
      const priceA = a.currentSaleRials ?? a.currentListRials ?? 0;
      const priceB = b.currentSaleRials ?? b.currentListRials ?? 0;
      return filters.sort === "priceAsc" ? priceA - priceB : priceB - priceA;
    });
  }

  return {
    rows: mapped,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBookSkuDetail(organizationId: string, skuId: string) {
  const sku = await prisma.bookSku.findFirst({
    where: { organizationId, id: skuId, deletedAt: null },
    include: {
      prices: { orderBy: { effectiveFrom: "desc" } },
      tags: { include: { tag: true } },
      title: {
        include: {
          publisher: true,
          bookType: true,
          grade: true,
          subject: true,
          major: true,
        },
      },
    },
  });
  return sku;
}
