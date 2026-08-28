import { BookImportRowAction, BookImportJobStatus, BookPriceKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { BOOKS_IMPORT_CHUNK_SIZE } from "@/lib/books/constants";
import { buildSkuSearchText } from "@/lib/books/catalog/search";
import { resolveOrCreateTags, replaceSkuTags } from "@/lib/books/catalog/tags";
import type { ValidCatalogRow } from "@/lib/books/catalog/import-parser";

export type CatalogImportDuplicateStrategy = "UPDATE_EXISTING" | "SKIP_EXISTING";

export type CatalogRowOutcome = {
  excelRowNumber: number;
  internalCode: string;
  action: BookImportRowAction;
  message: string | null;
  skuId: string | null;
};

export type CatalogImportSummary = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  priceChanges: number;
  rows: CatalogRowOutcome[];
};

async function resolveTaxonomyIds(params: {
  organizationId: string;
  row: ValidCatalogRow;
  createMissingTaxonomies: boolean;
}): Promise<{
  publisherId: string | null;
  bookTypeId: string | null;
  gradeId: string | null;
  subjectId: string | null;
  majorId: string | null;
  error: string | null;
}> {
  const { organizationId, row, createMissingTaxonomies } = params;

  let publisherId: string | null = null;
  if (row.publisherName) {
    const found = await prisma.bookPublisher.findFirst({
      where: { organizationId, name: { equals: row.publisherName, mode: "insensitive" } },
      select: { id: true },
    });
    if (found) publisherId = found.id;
    else if (createMissingTaxonomies) {
      publisherId = (
        await prisma.bookPublisher.create({
          data: { organizationId, name: row.publisherName },
          select: { id: true },
        })
      ).id;
    } else {
      return {
        publisherId: null,
        bookTypeId: null,
        gradeId: null,
        subjectId: null,
        majorId: null,
        error: `ناشر «${row.publisherName}» یافت نشد.`,
      };
    }
  }

  let bookTypeId: string | null = null;
  if (row.bookTypeName) {
    const found = await prisma.bookType.findFirst({
      where: {
        organizationId,
        OR: [
          { code: { equals: row.bookTypeName, mode: "insensitive" } },
          { label: { equals: row.bookTypeName, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (found) bookTypeId = found.id;
    else if (createMissingTaxonomies) {
      bookTypeId = (
        await prisma.bookType.create({
          data: {
            organizationId,
            code: row.bookTypeName.toUpperCase().replace(/\s+/g, "_").slice(0, 40),
            label: row.bookTypeName,
          },
          select: { id: true },
        })
      ).id;
    } else {
      return {
        publisherId,
        bookTypeId: null,
        gradeId: null,
        subjectId: null,
        majorId: null,
        error: `نوع کتاب «${row.bookTypeName}» یافت نشد.`,
      };
    }
  }

  const grade = row.gradeName
    ? await prisma.studentGrade.findFirst({
        where: { organizationId, name: { equals: row.gradeName, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  if (row.gradeName && !grade) {
    return {
      publisherId,
      bookTypeId,
      gradeId: null,
      subjectId: null,
      majorId: null,
      error: `پایه «${row.gradeName}» در سامانه یافت نشد.`,
    };
  }

  const subject = row.subjectName
    ? await prisma.subject.findFirst({
        where: { organizationId, name: { equals: row.subjectName, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  if (row.subjectName && !subject) {
    return {
      publisherId,
      bookTypeId,
      gradeId: grade?.id ?? null,
      subjectId: null,
      majorId: null,
      error: `درس «${row.subjectName}» در سامانه یافت نشد.`,
    };
  }

  const major = row.majorName
    ? await prisma.studentMajor.findFirst({
        where: { organizationId, name: { equals: row.majorName, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  if (row.majorName && !major) {
    return {
      publisherId,
      bookTypeId,
      gradeId: grade?.id ?? null,
      subjectId: subject?.id ?? null,
      majorId: null,
      error: `رشته «${row.majorName}» در سامانه یافت نشد.`,
    };
  }

  return {
    publisherId,
    bookTypeId,
    gradeId: grade?.id ?? null,
    subjectId: subject?.id ?? null,
    majorId: major?.id ?? null,
    error: null,
  };
}

async function processOneRow(params: {
  organizationId: string;
  actorUserId: string;
  row: ValidCatalogRow;
  duplicateStrategy: CatalogImportDuplicateStrategy;
  createMissingTaxonomies: boolean;
}): Promise<CatalogRowOutcome> {
  const { organizationId, actorUserId, row, duplicateStrategy, createMissingTaxonomies } = params;

  const existingByCode = await prisma.bookSku.findFirst({
    where: { organizationId, internalCode: row.internalCode, deletedAt: null },
    select: { id: true, titleId: true, barcode: true },
  });

  if (row.barcode) {
    const barcodeOwner = await prisma.bookSku.findFirst({
      where: {
        organizationId,
        barcode: row.barcode,
        deletedAt: null,
        ...(existingByCode ? { id: { not: existingByCode.id } } : {}),
      },
      select: { id: true, internalCode: true },
    });
    if (barcodeOwner) {
      return {
        excelRowNumber: row.excelRowNumber,
        internalCode: row.internalCode,
        action: BookImportRowAction.ERROR,
        message: `بارکد قبلاً برای کد داخلی ${barcodeOwner.internalCode} ثبت شده است.`,
        skuId: null,
      };
    }
  }

  const taxonomy = await resolveTaxonomyIds({ organizationId, row, createMissingTaxonomies });
  if (taxonomy.error) {
    return {
      excelRowNumber: row.excelRowNumber,
      internalCode: row.internalCode,
      action: BookImportRowAction.ERROR,
      message: taxonomy.error,
      skuId: null,
    };
  }

  if (existingByCode && duplicateStrategy === "SKIP_EXISTING") {
    return {
      excelRowNumber: row.excelRowNumber,
      internalCode: row.internalCode,
      action: BookImportRowAction.DUPLICATE_FLAG,
      message: "کد داخلی از قبل موجود بود؛ طبق انتخاب شما نادیده گرفته شد.",
      skuId: existingByCode.id,
    };
  }

  const tagIds = row.tagNames.length
    ? await resolveOrCreateTags({ organizationId, names: row.tagNames })
    : [];

  if (!existingByCode) {
    const titleId = (
      await prisma.bookTitle.create({
        data: {
          organizationId,
          title: row.title,
          keywords: row.keywords,
          publisherId: taxonomy.publisherId,
          bookTypeId: taxonomy.bookTypeId,
          gradeId: taxonomy.gradeId,
          subjectId: taxonomy.subjectId,
          majorId: taxonomy.majorId,
        },
        select: { id: true },
      })
    ).id;

    const publisherName = row.publisherName;
    const sku = await prisma.bookSku.create({
      data: {
        organizationId,
        titleId,
        internalCode: row.internalCode,
        barcode: row.barcode,
        editionLabel: row.editionLabel,
        editionYear: row.editionYear,
        searchText: buildSkuSearchText({
          internalCode: row.internalCode,
          barcode: row.barcode,
          title: row.title,
          editionLabel: row.editionLabel,
          keywords: row.keywords,
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
          amountRials: row.listPriceRials,
          source: "IMPORT",
          createdByUserId: actorUserId,
        },
        ...(row.salePriceRials != null
          ? [
              {
                organizationId,
                skuId: sku.id,
                kind: BookPriceKind.SALE,
                amountRials: row.salePriceRials,
                source: "IMPORT",
                createdByUserId: actorUserId,
              },
            ]
          : []),
      ],
    });

    if (tagIds.length) await replaceSkuTags({ organizationId, skuId: sku.id, tagIds });

    return {
      excelRowNumber: row.excelRowNumber,
      internalCode: row.internalCode,
      action: BookImportRowAction.INSERT,
      message: null,
      skuId: sku.id,
    };
  }

  // UPDATE_EXISTING path — descriptive fields update; price only inserts a new
  // history row when the amount actually changed (never mutate in place).
  await prisma.bookTitle.update({
    where: { id: existingByCode.titleId },
    data: {
      title: row.title,
      keywords: row.keywords,
      publisherId: taxonomy.publisherId,
      bookTypeId: taxonomy.bookTypeId,
      gradeId: taxonomy.gradeId,
      subjectId: taxonomy.subjectId,
      majorId: taxonomy.majorId,
    },
  });

  const publisherName = row.publisherName;
  await prisma.bookSku.update({
    where: { id: existingByCode.id },
    data: {
      barcode: row.barcode,
      editionLabel: row.editionLabel,
      editionYear: row.editionYear,
      searchText: buildSkuSearchText({
        internalCode: row.internalCode,
        barcode: row.barcode,
        title: row.title,
        editionLabel: row.editionLabel,
        keywords: row.keywords,
        publisherName,
      }),
    },
  });

  if (tagIds.length) await replaceSkuTags({ organizationId, skuId: existingByCode.id, tagIds });

  let priceChanged = false;
  const openList = await prisma.bookSkuPrice.findFirst({
    where: { organizationId, skuId: existingByCode.id, kind: BookPriceKind.LIST, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!openList || openList.amountRials !== row.listPriceRials) {
    const now = new Date();
    await prisma.$transaction([
      ...(openList
        ? [prisma.bookSkuPrice.update({ where: { id: openList.id }, data: { effectiveTo: now } })]
        : []),
      prisma.bookSkuPrice.create({
        data: {
          organizationId,
          skuId: existingByCode.id,
          kind: BookPriceKind.LIST,
          amountRials: row.listPriceRials,
          effectiveFrom: now,
          source: "IMPORT",
          createdByUserId: actorUserId,
        },
      }),
    ]);
    priceChanged = true;
  }

  return {
    excelRowNumber: row.excelRowNumber,
    internalCode: row.internalCode,
    action: BookImportRowAction.UPDATE,
    message: priceChanged ? "قیمت تغییر کرد و در تاریخچه ثبت شد." : null,
    skuId: existingByCode.id,
  };
}

export async function commitCatalogImport(params: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  validRows: readonly ValidCatalogRow[];
  duplicateStrategy: CatalogImportDuplicateStrategy;
  createMissingTaxonomies: boolean;
}): Promise<CatalogImportSummary> {
  const { organizationId, jobId } = params;

  await prisma.bookImportJob.update({
    where: { id: jobId },
    data: { status: BookImportJobStatus.COMMITTING, totalRows: params.validRows.length },
  });

  const summary: CatalogImportSummary = {
    total: params.validRows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    priceChanges: 0,
    rows: [],
  };

  const chunks: ValidCatalogRow[][] = [];
  for (let i = 0; i < params.validRows.length; i += BOOKS_IMPORT_CHUNK_SIZE) {
    chunks.push(params.validRows.slice(i, i + BOOKS_IMPORT_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    for (const row of chunk) {
      let outcome: CatalogRowOutcome;
      try {
        outcome = await processOneRow({
          organizationId,
          actorUserId: params.actorUserId,
          row,
          duplicateStrategy: params.duplicateStrategy,
          createMissingTaxonomies: params.createMissingTaxonomies,
        });
      } catch (error) {
        outcome = {
          excelRowNumber: row.excelRowNumber,
          internalCode: row.internalCode,
          action: BookImportRowAction.ERROR,
          message: error instanceof Error ? error.message.slice(0, 300) : "خطای ناشناخته",
          skuId: null,
        };
      }

      summary.rows.push(outcome);
      if (outcome.action === BookImportRowAction.INSERT) summary.inserted += 1;
      else if (outcome.action === BookImportRowAction.UPDATE) {
        summary.updated += 1;
        if (outcome.message) summary.priceChanges += 1;
      } else if (outcome.action === BookImportRowAction.DUPLICATE_FLAG) summary.skipped += 1;
      else if (outcome.action === BookImportRowAction.ERROR) summary.errors += 1;
    }

    await prisma.bookImportRowResult.createMany({
      data: chunk.map((row) => {
        const outcome = summary.rows.find((r) => r.excelRowNumber === row.excelRowNumber)!;
        return {
          organizationId,
          jobId,
          rowNumber: outcome.excelRowNumber,
          action: outcome.action,
          internalCode: outcome.internalCode,
          skuId: outcome.skuId,
          message: outcome.message,
        };
      }),
    });

    await prisma.bookImportJob.update({
      where: { id: jobId },
      data: { processedRows: { increment: chunk.length } },
    });
  }

  await prisma.bookImportJob.update({
    where: { id: jobId },
    data: {
      status: BookImportJobStatus.DONE,
      insertedCount: summary.inserted,
      updatedCount: summary.updated,
      skippedCount: summary.skipped,
      errorCount: summary.errors,
      priceChangeCount: summary.priceChanges,
      completedAt: new Date(),
    },
  });

  return summary;
}

/** Sanitizes leading =+-@ so re-opening the report in Excel cannot execute a formula. */
function sanitizeCsvCell(value: string): string {
  const needsGuard = /^[=+\-@]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return `"${needsGuard ? `'${escaped}` : escaped}"`;
}

export function buildCatalogImportReportCsv(summary: CatalogImportSummary): string {
  const header = ["ردیف", "کد داخلی", "نتیجه", "پیام"].map(sanitizeCsvCell).join(",");
  const actionLabels: Record<BookImportRowAction, string> = {
    INSERT: "افزوده شد",
    UPDATE: "به‌روزرسانی شد",
    SKIP: "نادیده گرفته شد",
    DUPLICATE_FLAG: "تکراری",
    ERROR: "خطا",
  };
  const lines = summary.rows.map((row) =>
    [
      String(row.excelRowNumber),
      row.internalCode,
      actionLabels[row.action],
      row.message ?? "",
    ]
      .map(sanitizeCsvCell)
      .join(","),
  );
  return `\uFEFF${[header, ...lines].join("\n")}`;
}
