"use server";

import { revalidatePath } from "next/cache";
import { BookImportJobStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  buildMappedCatalogRows,
  findCatalogHeaderRowNumber,
  inspectCatalogWorksheet,
  loadCatalogWorkbook,
  validateMappedCatalogRows,
  type CatalogImportColumnMapping,
  type CatalogWorkbookInspection,
  type InvalidCatalogRow,
  type ValidCatalogRow,
} from "@/lib/books/catalog/import-parser";
import {
  buildCatalogImportReportCsv,
  commitCatalogImport,
  type CatalogImportDuplicateStrategy,
  type CatalogImportSummary,
} from "@/lib/books/catalog/import-service";
import { requireBookCommerceAccess } from "@/lib/books/require";

function readFile(formData: FormData): File {
  const value = formData.get("file");
  if (!(value instanceof File)) throw new Error("فایلی انتخاب نشده است.");
  return value;
}

function readMapping(formData: FormData): CatalogImportColumnMapping {
  const raw = String(formData.get("mapping") ?? "{}");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as CatalogImportColumnMapping;
  } catch {
    return {};
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "خطای غیرمنتظره رخ داد.";
}

export type InspectImportActionResult =
  | { ok: true; inspection: CatalogWorkbookInspection }
  | { ok: false; error: string };

export async function inspectCatalogImportAction(
  formData: FormData,
): Promise<InspectImportActionResult> {
  await requireBookCommerceAccess("books.import");
  try {
    const file = readFile(formData);
    const { worksheet, checksum } = await loadCatalogWorkbook(file);
    const inspection = inspectCatalogWorksheet({ fileName: file.name, checksum, worksheet });
    return { ok: true, inspection };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export type ValidateImportActionResult =
  | {
      ok: true;
      validCount: number;
      invalidRows: InvalidCatalogRow[];
      priceSampleRials: number | null;
    }
  | { ok: false; error: string };

export async function validateCatalogImportAction(
  formData: FormData,
): Promise<ValidateImportActionResult> {
  await requireBookCommerceAccess("books.import");
  try {
    const file = readFile(formData);
    const mapping = readMapping(formData);
    const { worksheet } = await loadCatalogWorkbook(file);
    const headerRowNumber = findCatalogHeaderRowNumber(worksheet);
    const rawRows = buildMappedCatalogRows({ worksheet, mapping, headerRowNumber });
    const { validRows, invalidRows } = validateMappedCatalogRows(rawRows);
    return {
      ok: true,
      validCount: validRows.length,
      invalidRows: invalidRows.slice(0, 50),
      priceSampleRials: validRows[0]?.listPriceRials ?? null,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export type CommitImportActionResult =
  | { ok: true; jobId: string; summary: CatalogImportSummary }
  | { ok: false; error: string };

async function reparseValidRows(
  file: File,
  mapping: CatalogImportColumnMapping,
): Promise<ValidCatalogRow[]> {
  const { worksheet } = await loadCatalogWorkbook(file);
  const headerRowNumber = findCatalogHeaderRowNumber(worksheet);
  const rawRows = buildMappedCatalogRows({ worksheet, mapping, headerRowNumber });
  return validateMappedCatalogRows(rawRows).validRows;
}

export async function commitCatalogImportAction(
  formData: FormData,
): Promise<CommitImportActionResult> {
  const session = await requireBookCommerceAccess("books.import");
  try {
    const file = readFile(formData);
    const mapping = readMapping(formData);
    const strategyRaw = String(formData.get("strategy") ?? "UPDATE_EXISTING");
    const duplicateStrategy: CatalogImportDuplicateStrategy =
      strategyRaw === "SKIP_EXISTING" ? "SKIP_EXISTING" : "UPDATE_EXISTING";
    const createMissingTaxonomies = formData.get("createMissingTaxonomies") === "on";

    const { checksum } = await loadCatalogWorkbook(file);
    const validRows = await reparseValidRows(file, mapping);
    if (validRows.length === 0) {
      throw new Error("هیچ ردیف معتبری برای ورود وجود ندارد.");
    }

    const job = await prisma.bookImportJob.create({
      data: {
        organizationId: session.organization.id,
        fileName: file.name.slice(0, 255) || "catalog-import.xlsx",
        checksum,
        totalRows: validRows.length,
        createdByUserId: session.user.id,
        status: BookImportJobStatus.VALIDATED,
      },
      select: { id: true },
    });

    const summary = await commitCatalogImport({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      jobId: job.id,
      validRows,
      duplicateStrategy,
      createMissingTaxonomies,
    });

    revalidatePath("/admin/books/catalog");
    revalidatePath("/admin/books/catalog/import");
    revalidatePath("/admin/books");

    return { ok: true, jobId: job.id, summary };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function downloadImportReportCsvAction(jobId: string): Promise<string> {
  const session = await requireBookCommerceAccess("books.export");
  const job = await prisma.bookImportJob.findFirst({
    where: { id: jobId, organizationId: session.organization.id },
  });
  if (!job) throw new Error("گزارش یافت نشد.");

  const rows = await prisma.bookImportRowResult.findMany({
    where: { organizationId: session.organization.id, jobId },
    orderBy: { rowNumber: "asc" },
  });

  const summary: CatalogImportSummary = {
    total: job.totalRows,
    inserted: job.insertedCount,
    updated: job.updatedCount,
    skipped: job.skippedCount,
    errors: job.errorCount,
    priceChanges: job.priceChangeCount,
    rows: rows.map((row) => ({
      excelRowNumber: row.rowNumber,
      internalCode: row.internalCode ?? "",
      action: row.action,
      message: row.message,
      skuId: row.skuId,
    })),
  };

  return buildCatalogImportReportCsv(summary);
}
