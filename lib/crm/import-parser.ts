import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { jalaliToGregorian, parseJalaliDateInput } from "@/lib/datetime/jalali";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";

export const CRM_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const CRM_IMPORT_MAX_WORKSHEETS = 20;
export const CRM_IMPORT_MAX_ROWS = 10_000;
export const CRM_IMPORT_MAX_COLUMNS = 100;
export const CRM_IMPORT_MAX_CELL_LENGTH = 5_000;
export const CRM_IMPORT_PREVIEW_ROWS = 20;

export const IMPORT_MAPPING_FIELDS = [
  "IGNORE",
  "firstName",
  "lastName",
  "fullName",
  "fatherName",
  "mobile",
  "nationalCode",
  "school",
  "gradeLevel",
  "studyField",
  "city",
  "province",
  "gender",
  "birthDate",
  "source",
  "description",
  "email",
] as const;

export type ImportMappingField = (typeof IMPORT_MAPPING_FIELDS)[number];
export type ImportColumnMapping = Record<string, ImportMappingField>;
export type ImportDuplicateStrategy = "SKIP" | "UPDATE_EMPTY_FIELDS";

export type ImportProfile = {
  firstName: string;
  lastName: string;
  fatherName: string | null;
  mobile: string;
  mobileRaw: string;
  nationalCode: string | null;
  school: string | null;
  gradeLevel: string | null;
  studyField: string | null;
  city: string | null;
  province: string | null;
  gender: "MALE" | "FEMALE" | "UNSPECIFIED" | null;
  birthDate: Date | null;
  description: string | null;
  importedEmail: string | null;
  importedSource: string | null;
};

export type ValidImportRow = {
  excelRowNumber: number;
  profile: ImportProfile;
};

export type InvalidImportRow = {
  excelRowNumber: number;
  mobile: string;
  name: string;
  errors: string[];
};

export type ParsedLeadImport = {
  validRows: ValidImportRow[];
  invalidRows: InvalidImportRow[];
  totalRows: number;
};

export type WorkbookInspection = {
  fileName: string;
  worksheets: Array<{ name: string; rowCount: number; columnCount: number }>;
  selectedSheet: string;
  headers: Array<{
    column: number;
    label: string;
    suggestedField: ImportMappingField;
  }>;
  preview: Array<{ excelRowNumber: number; cells: string[] }>;
  totalRows: number;
};

export type RawMappedImportRow = {
  excelRowNumber: number;
  values: Partial<Record<Exclude<ImportMappingField, "IGNORE">, string | Date>>;
  formulaColumns?: number[];
};

const FIELD_ALIASES: Readonly<Record<Exclude<ImportMappingField, "IGNORE">, readonly string[]>> = {
  firstName: ["نام", "first name", "firstname", "given name"],
  lastName: ["نام خانوادگی", "نام‌خانوادگی", "فامیل", "last name", "lastname", "surname"],
  fullName: ["نام کامل", "نام و نام خانوادگی", "full name", "fullname", "name"],
  fatherName: ["نام پدر", "father name", "fathername"],
  mobile: ["موبایل", "شماره موبایل", "تلفن همراه", "mobile", "mobile number", "phone"],
  nationalCode: ["کد ملی", "کدملی", "national code", "national id"],
  school: ["مدرسه", "نام مدرسه", "school"],
  gradeLevel: ["پایه", "پایه تحصیلی", "grade", "grade level"],
  studyField: ["رشته", "رشته تحصیلی", "study field", "major"],
  city: ["شهر", "city"],
  province: ["استان", "province", "state"],
  gender: ["جنسیت", "gender", "sex"],
  birthDate: ["تاریخ تولد", "تولد", "birth date", "birthdate", "date of birth"],
  source: ["منبع", "منبع ورود", "source"],
  description: ["توضیحات", "شرح", "یادداشت", "description", "notes", "note"],
  email: ["ایمیل", "پست الکترونیکی", "email", "e-mail"],
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

export function detectImportHeaderAlias(value: string): ImportMappingField {
  const normalized = normalizeImportHeader(value);
  if (!normalized) return "IGNORE";
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [Exclude<ImportMappingField, "IGNORE">, readonly string[]]
  >) {
    if (aliases.some((alias) => normalizeImportHeader(alias) === normalized)) {
      return field;
    }
  }
  return "IGNORE";
}

export function splitImportFullName(value: string): {
  firstName: string;
  lastName: string;
} | null {
  const parts = cleanText(value).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function isValidImportEmail(value: string): boolean {
  const email = value.trim();
  return (
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)
  );
}

function parseGender(value: string): ImportProfile["gender"] | "INVALID" {
  const normalized = normalizeImportHeader(value);
  if (!normalized) return null;
  if (["مرد", "پسر", "male", "m"].includes(normalized)) return "MALE";
  if (["زن", "دختر", "female", "f"].includes(normalized)) return "FEMALE";
  if (["نامشخص", "سایر", "unspecified", "other"].includes(normalized)) {
    return "UNSPECIFIED";
  }
  return "INVALID";
}

function parseBirthDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const latin = toLatinDigits(cleanText(value));
  const jalali = parseJalaliDateInput(latin);
  if (jalali && jalali.jy >= 1200 && jalali.jy <= 1600) {
    const gregorian = jalaliToGregorian(jalali.jy, jalali.jm, jalali.jd);
    return new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd));
  }
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(latin);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(Date.UTC(year, month - 1, day));
  return result.getUTCFullYear() === year &&
    result.getUTCMonth() === month - 1 &&
    result.getUTCDate() === day
    ? result
    : null;
}

function optionalText(
  value: string | Date | undefined,
  maxLength: number,
  label: string,
  errors: string[],
): string | null {
  if (value === undefined || value instanceof Date) return null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  if (cleaned.length > maxLength) {
    errors.push(`${label} نباید بیشتر از ${maxLength} کاراکتر باشد.`);
    return null;
  }
  return cleaned;
}

export function validateMappedImportRows(rows: readonly RawMappedImportRow[]): ParsedLeadImport {
  const validRows: ValidImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];
  const seenMobiles = new Map<string, number>();

  for (const row of rows) {
    const errors: string[] = [];
    const values = row.values;
    let firstName = optionalText(values.firstName, 100, "نام", errors) ?? "";
    let lastName = optionalText(values.lastName, 100, "نام خانوادگی", errors) ?? "";
    const fullName = optionalText(values.fullName, 200, "نام کامل", errors);

    if (!firstName && !lastName && fullName) {
      const split = splitImportFullName(fullName);
      if (split) {
        firstName = split.firstName;
        lastName = split.lastName;
      }
    }
    if (!firstName) errors.push("نام الزامی است.");
    if (!lastName) {
      errors.push("نام خانوادگی از داده‌های ردیف قابل استخراج نیست.");
    }

    const rawMobile =
      values.mobile instanceof Date ? "" : cleanText(String(values.mobile ?? ""));
    const mobile = normalizeIranianMobile(rawMobile);
    if (!mobile.ok) errors.push(mobile.error);

    let nationalCode: string | null = null;
    const rawNationalCode =
      values.nationalCode instanceof Date
        ? ""
        : cleanText(String(values.nationalCode ?? ""));
    if (rawNationalCode) {
      const national = validateIranianNationalId(rawNationalCode);
      if (!national.ok) errors.push(national.error);
      else nationalCode = national.normalized;
    }

    const rawEmail =
      values.email instanceof Date ? "" : cleanText(String(values.email ?? ""));
    if (rawEmail && !isValidImportEmail(rawEmail)) {
      errors.push("ایمیل واردشده معتبر نیست.");
    }

    const rawGender =
      values.gender instanceof Date ? "" : cleanText(String(values.gender ?? ""));
    const gender = parseGender(rawGender);
    if (gender === "INVALID") errors.push("جنسیت واردشده معتبر نیست.");

    let birthDate: Date | null = null;
    if (values.birthDate !== undefined && String(values.birthDate).trim()) {
      birthDate = parseBirthDate(values.birthDate);
      if (!birthDate) errors.push("تاریخ تولد معتبر نیست.");
    }

    if (row.formulaColumns?.length) {
      errors.push("سلول فرمول‌دار در ستون‌های انتخاب‌شده مجاز نیست.");
    }

    if (mobile.ok) {
      const firstRow = seenMobiles.get(mobile.normalized);
      if (firstRow !== undefined) {
        errors.push(`موبایل در همین فایل تکراری است (ردیف ${firstRow}).`);
      } else {
        seenMobiles.set(mobile.normalized, row.excelRowNumber);
      }
    }

    const fatherName = optionalText(values.fatherName, 100, "نام پدر", errors);
    const school = optionalText(values.school, 255, "مدرسه", errors);
    const gradeLevel = optionalText(values.gradeLevel, 100, "پایه", errors);
    const studyField = optionalText(values.studyField, 100, "رشته", errors);
    const city = optionalText(values.city, 100, "شهر", errors);
    const province = optionalText(values.province, 100, "استان", errors);
    const description = optionalText(values.description, 1_000, "توضیحات", errors);
    const importedSource = optionalText(values.source, 100, "منبع", errors);
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || fullName || "";
    if (errors.length > 0 || !mobile.ok) {
      invalidRows.push({
        excelRowNumber: row.excelRowNumber,
        mobile: mobile.ok ? mobile.normalized : rawMobile,
        name: displayName,
        errors,
      });
      continue;
    }

    validRows.push({
      excelRowNumber: row.excelRowNumber,
      profile: {
        firstName,
        lastName,
        fatherName,
        mobile: mobile.normalized,
        mobileRaw: mobile.raw,
        nationalCode,
        school,
        gradeLevel,
        studyField,
        city,
        province,
        gender: gender === "INVALID" ? null : gender,
        birthDate,
        description,
        importedEmail: rawEmail || null,
        importedSource,
      },
    });
  }

  return { validRows, invalidRows, totalRows: rows.length };
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  if (file.size <= 0) throw new Error("فایل خالی است.");
  if (file.size > CRM_IMPORT_MAX_BYTES) {
    throw new Error("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");
  }
  const extension = extensionOf(file.name);
  if (extension !== ".xlsx" && extension !== ".csv") {
    throw new Error("فقط فایل‌های XLSX و CSV پشتیبانی می‌شوند.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  if (extension === ".xlsx") {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new Error("محتوای فایل XLSX معتبر نیست.");
    }
    // ExcelJS's bundled Buffer declaration is incompatible with newer
    // @types/node generic Buffer declarations, although the runtime value is valid.
    await workbook.xlsx.load(buffer as never);
  } else {
    await workbook.csv.read(Readable.from(buffer));
  }
  if (workbook.worksheets.length === 0) throw new Error("فایل شیت قابل خواندن ندارد.");
  if (workbook.worksheets.length > CRM_IMPORT_MAX_WORKSHEETS) {
    throw new Error("تعداد شیت‌ها نباید بیشتر از ۲۰ باشد.");
  }
  for (const worksheet of workbook.worksheets) {
    validateWorksheetBounds(worksheet);
  }
  return workbook;
}

function cellDisplay(cell: ExcelJS.Cell): { text: string; formula: boolean } {
  const formula =
    cell.type === ExcelJS.ValueType.Formula ||
    (typeof cell.value === "object" &&
      cell.value !== null &&
      "formula" in cell.value);
  const text = cleanText(cell.text ?? "");
  if (text.length > CRM_IMPORT_MAX_CELL_LENGTH) {
    throw new Error(
      `مقدار سلول ${cell.address} بیشتر از ۵۰۰۰ کاراکتر است.`,
    );
  }
  return { text, formula };
}

function findHeaderRow(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  let header: ExcelJS.Row | null = null;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (header) return;
    let hasValue = false;
    for (
      let column = 1;
      column <= Math.min(row.cellCount, CRM_IMPORT_MAX_COLUMNS + 1);
      column += 1
    ) {
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

function validateWorksheetBounds(worksheet: ExcelJS.Worksheet): void {
  if (worksheet.columnCount > CRM_IMPORT_MAX_COLUMNS) {
    throw new Error("تعداد ستون‌ها نباید بیشتر از ۱۰۰ باشد.");
  }
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      if (column > CRM_IMPORT_MAX_COLUMNS) {
        throw new Error("تعداد ستون‌ها نباید بیشتر از ۱۰۰ باشد.");
      }
      cellDisplay(cell);
    });
  });
}

export async function inspectLeadImportFile(
  file: File,
  selectedSheetName?: string,
): Promise<WorkbookInspection> {
  const workbook = await loadWorkbook(file);
  const worksheet =
    (selectedSheetName ? workbook.getWorksheet(selectedSheetName) : undefined) ??
    workbook.worksheets[0]!;
  const headerRow = findHeaderRow(worksheet);
  const columnCount = Math.max(headerRow.cellCount, worksheet.columnCount);
  if (columnCount > CRM_IMPORT_MAX_COLUMNS) {
    throw new Error("تعداد ستون‌ها نباید بیشتر از ۱۰۰ باشد.");
  }

  const headers = Array.from({ length: columnCount }, (_, index) => {
    const label = cellDisplay(headerRow.getCell(index + 1)).text;
    return {
      column: index + 1,
      label: label || `ستون ${index + 1}`,
      suggestedField: detectImportHeaderAlias(label),
    };
  });

  const preview: WorkbookInspection["preview"] = [];
  let totalRows = 0;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number <= headerRow.number) return;
    const cells = headers.map((header) => cellDisplay(row.getCell(header.column)).text);
    if (cells.every((value) => value === "")) return;
    totalRows += 1;
    if (totalRows > CRM_IMPORT_MAX_ROWS) {
      throw new Error("تعداد ردیف‌های اطلاعات نباید بیشتر از ۱۰٬۰۰۰ باشد.");
    }
    if (preview.length < CRM_IMPORT_PREVIEW_ROWS) {
      preview.push({ excelRowNumber: row.number, cells });
    }
  });

  return {
    fileName: file.name,
    worksheets: workbook.worksheets.map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.actualRowCount,
      columnCount: sheet.columnCount,
    })),
    selectedSheet: worksheet.name,
    headers,
    preview,
    totalRows,
  };
}

export async function parseLeadImportFile(params: {
  file: File;
  sheetName: string;
  mapping: ImportColumnMapping;
}): Promise<ParsedLeadImport> {
  const workbook = await loadWorkbook(params.file);
  const worksheet = workbook.getWorksheet(params.sheetName);
  if (!worksheet) throw new Error("شیت انتخاب‌شده پیدا نشد.");
  validateWorksheetBounds(worksheet);
  const headerRow = findHeaderRow(worksheet);

  const mappedColumns = Object.entries(params.mapping)
    .map(([column, field]) => ({ column: Number(column), field }))
    .filter(
      (
        item,
      ): item is {
        column: number;
        field: Exclude<ImportMappingField, "IGNORE">;
      } =>
        Number.isInteger(item.column) &&
        item.column >= 1 &&
        item.column <= CRM_IMPORT_MAX_COLUMNS &&
        item.field !== "IGNORE" &&
        (IMPORT_MAPPING_FIELDS as readonly string[]).includes(item.field),
    );
  if (!mappedColumns.some((item) => item.field === "mobile")) {
    throw new Error("ستون موبایل باید انتخاب شود.");
  }
  const identityFields = mappedColumns.map((item) => item.field);
  if (
    !identityFields.includes("fullName") &&
    (!identityFields.includes("firstName") || !identityFields.includes("lastName"))
  ) {
    throw new Error("نام کامل یا هر دو ستون نام و نام خانوادگی باید انتخاب شوند.");
  }

  const mappedRows: RawMappedImportRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number <= headerRow.number) return;
    const values: RawMappedImportRow["values"] = {};
    const formulaColumns: number[] = [];
    let hasValue = false;
    for (const item of mappedColumns) {
      const cell = row.getCell(item.column);
      const display = cellDisplay(cell);
      if (display.text) hasValue = true;
      if (display.formula) formulaColumns.push(item.column);
      values[item.field] =
        cell.value instanceof Date ? cell.value : display.text;
    }
    if (!hasValue) return;
    mappedRows.push({ excelRowNumber: row.number, values, formulaColumns });
    if (mappedRows.length > CRM_IMPORT_MAX_ROWS) {
      throw new Error("تعداد ردیف‌های اطلاعات نباید بیشتر از ۱۰٬۰۰۰ باشد.");
    }
  });

  return validateMappedImportRows(mappedRows);
}

export type ImportResultCsvRow = {
  excelRowNumber: number;
  status: string;
  mobile: string;
  name: string;
  message: string;
};

export function protectCsvFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const safe = protectCsvFormula(String(value)).replace(/"/g, '""');
  return `"${safe}"`;
}

export function buildImportResultCsv(rows: readonly ImportResultCsvRow[]): string {
  const header = [
    "شماره ردیف اکسل",
    "وضعیت",
    "موبایل",
    "نام",
    "پیام",
  ];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.excelRowNumber,
        row.status,
        row.mobile,
        row.name,
        row.message,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}
