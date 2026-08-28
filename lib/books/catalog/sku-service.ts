import { BookPriceKind, BookSkuStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { buildSkuSearchText } from "@/lib/books/catalog/search";
import { resolveOrCreateTags, replaceSkuTags } from "@/lib/books/catalog/tags";

export class BookCatalogError extends Error {
  constructor(
    message: string,
    public readonly code: "DUPLICATE_INTERNAL_CODE" | "DUPLICATE_BARCODE" | "NOT_FOUND",
  ) {
    super(message);
  }
}

export type BookSkuFormInput = {
  title: string;
  description?: string | null;
  keywords?: string | null;
  publisherId?: string | null;
  bookTypeId?: string | null;
  gradeId?: string | null;
  subjectId?: string | null;
  majorId?: string | null;
  internalCode: string;
  barcode?: string | null;
  editionLabel?: string | null;
  editionYear?: string | null;
  status?: BookSkuStatus;
  listPriceRials: number;
  salePriceRials?: number | null;
  tagNames?: string[];
};

async function findOrCreateTitleForSku(params: {
  organizationId: string;
  input: BookSkuFormInput;
}): Promise<string> {
  const { organizationId, input } = params;
  const existing = await prisma.bookTitle.findFirst({
    where: {
      organizationId,
      title: { equals: input.title.trim(), mode: "insensitive" },
      publisherId: input.publisherId ?? null,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.bookTitle.create({
    data: {
      organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      keywords: input.keywords?.trim() || null,
      publisherId: input.publisherId ?? null,
      bookTypeId: input.bookTypeId ?? null,
      gradeId: input.gradeId ?? null,
      subjectId: input.subjectId ?? null,
      majorId: input.majorId ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

async function assertCodesAvailable(params: {
  organizationId: string;
  internalCode: string;
  barcode: string | null;
  excludeSkuId?: string;
}): Promise<void> {
  const [byCode, byBarcode] = await Promise.all([
    prisma.bookSku.findFirst({
      where: {
        organizationId: params.organizationId,
        internalCode: params.internalCode,
        deletedAt: null,
        ...(params.excludeSkuId ? { id: { not: params.excludeSkuId } } : {}),
      },
      select: { id: true },
    }),
    params.barcode
      ? prisma.bookSku.findFirst({
          where: {
            organizationId: params.organizationId,
            barcode: params.barcode,
            deletedAt: null,
            ...(params.excludeSkuId ? { id: { not: params.excludeSkuId } } : {}),
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (byCode) {
    throw new BookCatalogError("این کد داخلی قبلاً ثبت شده است.", "DUPLICATE_INTERNAL_CODE");
  }
  if (byBarcode) {
    throw new BookCatalogError("این بارکد قبلاً برای کتاب دیگری ثبت شده است.", "DUPLICATE_BARCODE");
  }
}

export async function createBookSku(params: {
  organizationId: string;
  actorUserId: string;
  input: BookSkuFormInput;
}): Promise<{ id: string }> {
  const { organizationId, actorUserId, input } = params;
  const internalCode = input.internalCode.trim();
  const barcode = input.barcode?.trim() || null;

  await assertCodesAvailable({ organizationId, internalCode, barcode });

  const titleId = await findOrCreateTitleForSku({ organizationId, input });
  const publisherName = input.publisherId
    ? (await prisma.bookPublisher.findUnique({ where: { id: input.publisherId }, select: { name: true } }))?.name
    : null;

  const now = new Date();
  const sku = await prisma.bookSku.create({
    data: {
      organizationId,
      titleId,
      internalCode,
      barcode,
      editionLabel: input.editionLabel?.trim() || null,
      editionYear: input.editionYear?.trim() || null,
      status: input.status ?? BookSkuStatus.ACTIVE,
      searchText: buildSkuSearchText({
        internalCode,
        barcode,
        title: input.title,
        editionLabel: input.editionLabel,
        keywords: input.keywords,
        publisherName,
      }),
    },
    select: { id: true },
  });

  await prisma.bookSkuPrice.createMany({
    data: [
      {
        organizationId,
        skuId: sku.id,
        kind: BookPriceKind.LIST,
        amountRials: input.listPriceRials,
        effectiveFrom: now,
        source: "MANUAL",
        createdByUserId: actorUserId,
      },
      ...(input.salePriceRials != null
        ? [
            {
              organizationId,
              skuId: sku.id,
              kind: BookPriceKind.SALE,
              amountRials: input.salePriceRials,
              effectiveFrom: now,
              source: "MANUAL",
              createdByUserId: actorUserId,
            },
          ]
        : []),
    ],
  });

  if (input.tagNames?.length) {
    const tagIds = await resolveOrCreateTags({ organizationId, names: input.tagNames });
    await replaceSkuTags({ organizationId, skuId: sku.id, tagIds });
  }

  return sku;
}

/** Never mutates amountRials in place — closes the open row and inserts a new one. */
async function applyPriceChange(params: {
  organizationId: string;
  skuId: string;
  kind: BookPriceKind;
  nextAmountRials: number | null;
  actorUserId: string;
}): Promise<boolean> {
  const now = new Date();
  const open = await prisma.bookSkuPrice.findFirst({
    where: {
      organizationId: params.organizationId,
      skuId: params.skuId,
      kind: params.kind,
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (params.nextAmountRials == null) {
    if (!open) return false;
    await prisma.bookSkuPrice.update({
      where: { id: open.id },
      data: { effectiveTo: now },
    });
    return true;
  }

  if (open && open.amountRials === params.nextAmountRials) return false;

  await prisma.$transaction([
    ...(open
      ? [
          prisma.bookSkuPrice.update({
            where: { id: open.id },
            data: { effectiveTo: now },
          }),
        ]
      : []),
    prisma.bookSkuPrice.create({
      data: {
        organizationId: params.organizationId,
        skuId: params.skuId,
        kind: params.kind,
        amountRials: params.nextAmountRials,
        effectiveFrom: now,
        source: "MANUAL",
        createdByUserId: params.actorUserId,
      },
    }),
  ]);
  return true;
}

export async function updateBookSku(params: {
  organizationId: string;
  actorUserId: string;
  skuId: string;
  input: BookSkuFormInput;
}): Promise<{ priceChanged: boolean }> {
  const { organizationId, actorUserId, skuId, input } = params;
  const existing = await prisma.bookSku.findFirst({
    where: { organizationId, id: skuId, deletedAt: null },
    select: { id: true, titleId: true },
  });
  if (!existing) {
    throw new BookCatalogError("این کتاب یافت نشد.", "NOT_FOUND");
  }

  const internalCode = input.internalCode.trim();
  const barcode = input.barcode?.trim() || null;
  await assertCodesAvailable({ organizationId, internalCode, barcode, excludeSkuId: skuId });

  await prisma.bookTitle.update({
    where: { id: existing.titleId },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      keywords: input.keywords?.trim() || null,
      publisherId: input.publisherId ?? null,
      bookTypeId: input.bookTypeId ?? null,
      gradeId: input.gradeId ?? null,
      subjectId: input.subjectId ?? null,
      majorId: input.majorId ?? null,
    },
  });

  const publisherName = input.publisherId
    ? (await prisma.bookPublisher.findUnique({ where: { id: input.publisherId }, select: { name: true } }))?.name
    : null;

  await prisma.bookSku.update({
    where: { id: skuId },
    data: {
      internalCode,
      barcode,
      editionLabel: input.editionLabel?.trim() || null,
      editionYear: input.editionYear?.trim() || null,
      status: input.status ?? BookSkuStatus.ACTIVE,
      searchText: buildSkuSearchText({
        internalCode,
        barcode,
        title: input.title,
        editionLabel: input.editionLabel,
        keywords: input.keywords,
        publisherName,
      }),
    },
  });

  const listChanged = await applyPriceChange({
    organizationId,
    skuId,
    kind: BookPriceKind.LIST,
    nextAmountRials: input.listPriceRials,
    actorUserId,
  });
  const saleChanged = await applyPriceChange({
    organizationId,
    skuId,
    kind: BookPriceKind.SALE,
    nextAmountRials: input.salePriceRials ?? null,
    actorUserId,
  });

  if (input.tagNames) {
    const tagIds = await resolveOrCreateTags({ organizationId, names: input.tagNames });
    await replaceSkuTags({ organizationId, skuId, tagIds });
  }

  return { priceChanged: listChanged || saleChanged };
}
