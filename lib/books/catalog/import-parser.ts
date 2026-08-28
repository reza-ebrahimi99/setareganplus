import ExcelJS from "exceljs";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import {
  BOOKS_IMPORT_MAX_BYTES,
  BOOKS_IMPORT_MAX_COLUMNS,
  BOOKS_IMPORT_MAX_ROWS,
  BOOKS_IMPORT_PREVIEW_ROWS,
} from "@/lib/books/constants";

// Client-safe mapping fields live in ./import-mapping so client components can
// import them without pulling this server-only module (exceljs + node:crypto)
// into the client bundle. Re-exported here for existing server-side importers.
import {
  CATALOG_IMPORT_MAPPING_FIELDS,
  type CatalogImportColumnMapping,
  type CatalogImportMappingField,
} from "./import-mapping";

export {
  CATALOG_IMPORT_MAPPING_FIELDS,
  type CatalogImportColumnMapping,
  type CatalogImportMappingField,
};

const FIELD_ALIASES: Readonly<
  Record<Exclude<CatalogImportMappingField, "IGNORE">, readonly string[]>
> = {
  internalCode: ["کد داخلی", "کد کتاب", "internal code", "code", "sku"],
  title: ["عنوان", "نام کتاب", "title", "book title"],
  publisherName: ["ناشر", "publisher"],
  bookTypeName: ["نوع کتاب", "گروه", "book type", "type"],
  gradeName: ["پایه", "پایه تحصیلی", "grade"],
  subjectName: ["درس", "موضوع", "subject"],
  majorName: ["رشته", "رشته تحصیلی", "field", "major"],
  editionLabel: ["چاپ", "ویرایش", "edition"],
  editionYear: ["سال چاپ", "سال", "edition year", "year"],
  barcode: ["بارکد", "شابک", "barcode", "isbn"],
  listPriceRials: ["قیمت", "قیمت فهرست", "list price", "price"],
  salePriceRials: ["قیمت فروش ویژه", "قیمت ویژه", "sale price"],
  keywords: ["کلیدواژه", "کلمات کلیدی", "keywords", "tags description"],
  tags: ["برچسب", "برچسب‌ها", "tags"],
};

function cleanText(value: string): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeImportHeader(value: string): string {
  return cleanText(toLatinDigits(value))
    .toLocaleLowerCase("fa")
    .replace(/[_./\\()[\]{}:؛،,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCatalogHeaderAlias(value: string): CatalogImportMappingField {
  const normalized = normalizeImportHeader(value);
  if (!normalized) return "IGNORE";
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [Exclude<CatalogImportMappingField, "IGNORE">, readonly string[]]
  >) {
    if (aliases.some((alias) => normalizeImportHeader(alias) === normalized)) {
      return field;
    }
  }
  return "IGNORE";
}

export type CatalogWorkbookInspection = {
  fileName: string;
  checksum: string;
  totalRows: number;
  headers: Array<{ column: number; label: string; suggestedField: CatalogImportMappingField }>;
  preview: Array<{ excelRowNumber: number; cells: string[] }>;
};

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function cellDisplay(cell: ExcelJS.Cell): { text: string; formula: boolean } {
  const formula =
    cell.type === ExcelJS.ValueType.Formula ||
    (typeof cell.value === "object" && cell.value !== null && "formula" in cell.value);
  return { text: cleanText(cell.text ?? ""), formula };
}

async function checksumOf(buffer: Buffer): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buffer).digest("hex");
}

export async function loadCatalogWorkbook(file: File): Promise<{
  workbook: ExcelJS.Workbook;
  worksheet: ExcelJS.Worksheet;
  checksum: string;
}> {
  if (file.size <= 0) throw new Error("فایل خالی است.");
  if (file.size > BOOKS_IMPORT_MAX_BYTES) {
    throw new Error("حجم فایل نباید بیشتر از ۸ مگابایت باشد.");
  }
  const extension = extensionOf(file.name);
  if (extension !== ".xlsx") {
    throw new Error("فقط فایل XLSX پشتیبانی می‌شود.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("محتوای فایل XLSX معتبر نیست.");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("فایل شیت قابل خواندن ندارد.");
  if (worksheet.columnCount > BOOKS_IMPORT_MAX_COLUMNS) {
    throw new Error("تعداد ستون‌ها نباید بیشتر از ۴۰ باشد.");
  }
  let nonEmptyRows = 0;
  worksheet.eachRow({ includeEmpty: false }, () => {
    nonEmptyRows += 1;
  });
  if (nonEmptyRows > BOOKS_IMPORT_MAX_ROWS + 1) {
    throw new Error("تعداد ردیف‌ها نباید بیشتر از ۵٬۰۰۰ باشد.");
  }
  const checksum = await checksumOf(buffer);
  return { workbook, worksheet, checksum };
}

function findHeaderRow(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  let header: ExcelJS.Row | null = null;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (header) return;
    let hasValue = false;
    for (let column = 1; column <= Math.min(row.cellCount, BOOKS_IMPORT_MAX_COLUMNS + 1); column += 1) {
      if (cellDisplay(row.getCell(column)).text !== "") {
        hasValue = true;
        break;
      }
    }
    if (hasValue) header = row;
  });
  if (!header) throw new Error("ردیف عنوان در شیت پیدا نشد.");
  return header;
}

/** Public: the actual header row number, safe even when the header is row 1. */
export function findCatalogHeaderRowNumber(worksheet: ExcelJS.Worksheet): number {
  return findHeaderRow(worksheet).number;
}

export function inspectCatalogWorksheet(params: {
  fileName: string;
  checksum: string;
  worksheet: ExcelJS.Worksheet;
}): CatalogWorkbookInspection {
  const header = findHeaderRow(params.worksheet);
  const headerRowNumber = header.number;
  const headers: CatalogWorkbookInspection["headers"] = [];
  for (let column = 1; column <= Math.min(header.cellCount, BOOKS_IMPORT_MAX_COLUMNS); column += 1) {
    const { text } = cellDisplay(header.getCell(column));
    if (!text) continue;
    headers.push({ column, label: text, suggestedField: detectCatalogHeaderAlias(text) });
  }

  const preview: CatalogWorkbookInspection["preview"] = [];
  let totalRows = 0;
  params.worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number <= headerRowNumber) return;
    totalRows += 1;
    if (preview.length < BOOKS_IMPORT_PREVIEW_ROWS) {
      const cells = headers.map((h) => cellDisplay(row.getCell(h.column)).text);
      preview.push({ excelRowNumber: row.number, cells });
    }
  });

  return { fileName: params.fileName, checksum: params.checksum, totalRows, headers, preview };
}

export type RawCatalogRow = {
  excelRowNumber: number;
  values: Partial<Record<Exclude<CatalogImportMappingField, "IGNORE">, string>>;
  hasFormula: boolean;
};

export function buildMappedCatalogRows(params: {
  worksheet: ExcelJS.Worksheet;
  mapping: CatalogImportColumnMapping;
  headerRowNumber: number;
}): RawCatalogRow[] {
  const columns = Object.entries(params.mapping)
    .filter(([, field]) => field !== "IGNORE")
    .map(([column, field]) => ({ column: Number(column), field }));

  const rows: RawCatalogRow[] = [];
  params.worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number <= params.headerRowNumber) return;
    const values: RawCatalogRow["values"] = {};
    let hasFormula = false;
    for (const { column, field } of columns) {
      const { text, formula } = cellDisplay(row.getCell(column));
      if (formula) hasFormula = true;
      if (text) values[field as Exclude<CatalogImportMappingField, "IGNORE">] = text;
    }
    if (Object.keys(values).length === 0) return;
    rows.push({ excelRowNumber: row.number, values, hasFormula });
  });
  return rows;
}

export type ValidCatalogRow = {
  excelRowNumber: number;
  internalCode: string;
  title: string;
  publisherName: string | null;
  bookTypeName: string | null;
  gradeName: string | null;
  subjectName: string | null;
  majorName: string | null;
  editionLabel: string | null;
  editionYear: string | null;
  barcode: string | null;
  listPriceRials: number;
  salePriceRials: number | null;
  keywords: string | null;
  tagNames: string[];
};

export type InvalidCatalogRow = {
  excelRowNumber: number;
  internalCode: string;
  errors: string[];
};

function parsePriceRials(raw: string | undefined, label: string, errors: string[]): number | null {
  if (!raw) return null;
  const latin = toLatinDigits(raw).replace(/[,٬\s]/g, "");
  const value = Number(latin);
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} باید عددی نامنفی باشد.`);
    return null;
  }
  return Math.round(value);
}

export function validateMappedCatalogRows(rows: readonly RawCatalogRow[]): {
  validRows: ValidCatalogRow[];
  invalidRows: InvalidCatalogRow[];
} {
  const validRows: ValidCatalogRow[] = [];
  const invalidRows: InvalidCatalogRow[] = [];
  const seenCodes = new Map<string, number>();

  for (const row of rows) {
    const errors: string[] = [];
    const internalCode = cleanText(row.values.internalCode ?? "");
    const title = cleanText(row.values.title ?? "");

    if (!internalCode) errors.push("کد داخلی الزامی است.");
    if (!title) errors.push("عنوان کتاب الزامی است.");
    if (row.hasFormula) errors.push("سلول فرمول‌دار در ستون‌های انتخاب‌شده مجاز نیست.");

    if (internalCode) {
      const firstSeenAt = seenCodes.get(internalCode.toLocaleLowerCase("fa"));
      if (firstSeenAt != null) {
        errors.push(`کد داخلی تکراری در همین فایل (ردیف ${firstSeenAt}).`);
      } else {
        seenCodes.set(internalCode.toLocaleLowerCase("fa"), row.excelRowNumber);
      }
    }

    const listPriceRaw = row.values.listPriceRials;
    let listPriceRials = 0;
    if (!listPriceRaw) {
      errors.push("قیمت فهرست الزامی است.");
    } else {
      const parsed = parsePriceRials(listPriceRaw, "قیمت فهرست", errors);
      if (parsed != null) listPriceRials = parsed;
    }
    const salePriceRials = parsePriceRials(row.values.salePriceRials, "قیمت فروش ویژه", errors);

    if (errors.length > 0) {
      invalidRows.push({ excelRowNumber: row.excelRowNumber, internalCode, errors });
      continue;
    }

    validRows.push({
      excelRowNumber: row.excelRowNumber,
      internalCode,
      title,
      publisherName: cleanText(row.values.publisherName ?? "") || null,
      bookTypeName: cleanText(row.values.bookTypeName ?? "") || null,
      gradeName: cleanText(row.values.gradeName ?? "") || null,
      subjectName: cleanText(row.values.subjectName ?? "") || null,
      majorName: cleanText(row.values.majorName ?? "") || null,
      editionLabel: cleanText(row.values.editionLabel ?? "") || null,
      editionYear: cleanText(row.values.editionYear ?? "") || null,
      barcode: cleanText(row.values.barcode ?? "") || null,
      listPriceRials,
      salePriceRials,
      keywords: cleanText(row.values.keywords ?? "") || null,
      tagNames: cleanText(row.values.tags ?? "")
        .split(/[,،]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  return { validRows, invalidRows };
}
