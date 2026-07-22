/**
 * Student bulk import pipeline (Excel/CSV).
 * Mirrors assessment import patterns; create/update rules align with students/actions.ts.
 *
 * Guardian/portal linking is intentionally out of scope for this phase
 * (requires students.portal.manage and a separate domain workflow).
 */

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { StudentImportError } from "@/lib/website/student-import-errors";
import {
  ensureDefaultStudentGrades,
  gradeRequiresMajor,
} from "@/lib/website/student-grades";
import { ensureDefaultStudentMajors } from "@/lib/website/student-majors";
import {
  composeStudentFullName,
  normalizeStudentSlug,
  slugFromStudentName,
} from "@/lib/website/student-slug";
import {
  STUDENT_IMPORT_MAX_ROWS,
  STUDENT_IMPORT_PREVIEW_LIMIT,
  isAllowedStudentImportFile,
  type ParsedStudentImportRow,
  type StudentColumnMapping,
  type StudentImportField,
  type StudentImportMode,
  type StudentImportResult,
  type StudentImportRowClassification,
  type StudentWorkbookInspection,
  type ValidatedStudentImportRow,
} from "@/lib/website/student-import-shared";

const FIELD_ALIASES: Record<string, StudentImportField> = {
  نام: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  "نام خانوادگی": "lastName",
  lastname: "lastName",
  "last name": "lastName",
  پایه: "grade",
  grade: "grade",
  "نام پایه": "grade",
  رشته: "major",
  major: "major",
  اسلاگ: "slug",
  slug: "slug",
  "کد اسلاگ": "slug",
  "نام ولی": "parentName",
  "نام والد": "parentName",
  parentname: "parentName",
  "سال تحصیلی": "schoolYear",
  schoolyear: "schoolYear",
  year: "schoolYear",
  توضیحات: "biography",
  biography: "biography",
  بیوگرافی: "biography",
  وضعیت: "isActive",
  status: "isActive",
  فعال: "isActive",
  ویژه: "isFeatured",
  featured: "isFeatured",
  "ترتیب نمایش": "displayOrder",
  displayorder: "displayOrder",
  order: "displayOrder",
};

function suggestField(label: string): StudentImportField {
  const key = label.trim().toLocaleLowerCase("fa");
  return FIELD_ALIASES[key] ?? "IGNORE";
}

function parseBool(raw: string): boolean | null {
  const value = toLatinDigits(raw).trim().toLowerCase();
  if (!value) return null;
  if (
    value === "1" ||
    value === "true" ||
    value === "yes" ||
    value === "بله" ||
    value === "فعال"
  ) {
    return true;
  }
  if (
    value === "0" ||
    value === "false" ||
    value === "no" ||
    value === "خیر" ||
    value === "غیرفعال" ||
    value === "غيرفعال"
  ) {
    return false;
  }
  return null;
}

function parseOptionalInt(raw: string): number | null {
  const normalized = toLatinDigits(raw).trim();
  if (!normalized) return null;
  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? value : null;
}

function cellToString(cell: ExcelJS.Cell): string {
  if (cell.value == null) return "";
  if (typeof cell.value === "object" && "text" in cell && cell.text) {
    return String(cell.text).trim();
  }
  if (cell.value instanceof Date) {
    return cell.value.toISOString().slice(0, 10);
  }
  return String(cell.text || cell.value || "").trim();
}

function assertAllowedFile(file: File): void {
  const check = isAllowedStudentImportFile(file);
  if (!check.ok) {
    if (check.reason === "FILE_TOO_LARGE") {
      throw new StudentImportError(
        "FILE_TOO_LARGE",
        "حجم فایل نباید بیشتر از ۵ مگابایت باشد.",
      );
    }
    throw new StudentImportError(
      "INVALID_MIME",
      "فقط فایل‌های Excel (.xlsx) یا CSV مجاز هستند.",
    );
  }
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  assertAllowedFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  const name = (file.name || "").toLowerCase();
  try {
    if (name.endsWith(".csv") || file.type.includes("csv")) {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    throw new StudentImportError(
      "INVALID_FILE",
      "خواندن فایل ممکن نشد. قالب Excel یا CSV را بررسی کنید.",
    );
  }
  return workbook;
}

function findHeaderRow(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  let found: ExcelJS.Row | undefined;
  worksheet.eachRow((row, rowNumber) => {
    if (found || rowNumber > 20) return;
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (values.some((cell) => String(cell ?? "").trim())) {
      found = row;
    }
  });
  if (!found) {
    throw new StudentImportError("HEADER_NOT_FOUND", "ردیف عنوان یافت نشد.");
  }
  return found;
}

function normalizeLookupKey(raw: string): string {
  return toLatinDigits(raw)
    .trim()
    .toLocaleLowerCase("fa")
    .replace(/\s+/g, " ");
}

function mapRow(
  values: Record<number, string>,
  mapping: StudentColumnMapping,
  excelRow: number,
): ParsedStudentImportRow {
  const data: ParsedStudentImportRow = { excelRow };

  for (const [column, field] of Object.entries(mapping)) {
    const raw = values[Number(column)] ?? "";
    if (!field || field === "IGNORE") continue;

    switch (field) {
      case "firstName":
        data.firstName = raw;
        break;
      case "lastName":
        data.lastName = raw;
        break;
      case "grade":
        data.grade = raw;
        break;
      case "major":
        data.major = raw;
        break;
      case "slug":
        data.slug = raw;
        break;
      case "parentName":
        data.parentName = raw;
        break;
      case "schoolYear":
        data.schoolYear = raw;
        break;
      case "biography":
        data.biography = raw;
        break;
      case "isActive":
        data.isActiveRaw = raw;
        break;
      case "isFeatured":
        data.isFeaturedRaw = raw;
        break;
      case "displayOrder":
        data.displayOrderRaw = raw;
        break;
      default:
        break;
    }
  }

  return data;
}

export async function inspectStudentImportFile(
  file: File,
  sheetName?: string,
): Promise<StudentWorkbookInspection> {
  const workbook = await loadWorkbook(file);
  const sheets = workbook.worksheets
    .map((sheet) => sheet.name)
    .filter((name) => name !== "راهنما");
  if (sheets.length === 0) {
    throw new StudentImportError(
      "EMPTY_WORKBOOK",
      "فایل کاربرگ معتبری ندارد.",
    );
  }

  const selectedSheet =
    sheetName && sheets.includes(sheetName) ? sheetName : sheets[0]!;
  const worksheet = workbook.getWorksheet(selectedSheet);
  if (!worksheet) {
    throw new StudentImportError("SHEET_NOT_FOUND", "برگه انتخاب‌شده یافت نشد.");
  }

  const headerRow = findHeaderRow(worksheet);
  const headers: StudentWorkbookInspection["headers"] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = cellToString(cell);
    if (!label) return;
    headers.push({
      column: colNumber,
      label,
      suggestedField: suggestField(label),
    });
  });

  if (headers.length === 0) {
    throw new StudentImportError("HEADER_NOT_FOUND", "ستون عنوانی یافت نشد.");
  }

  const previewRows: string[][] = [];
  let dataRowCount = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const values = headers.map((header) => {
      const cell = row.getCell(header.column);
      return cellToString(cell);
    });
    if (!values.some((value) => value.trim())) return;
    dataRowCount += 1;
    if (previewRows.length < 8) previewRows.push(values);
  });

  if (dataRowCount > STUDENT_IMPORT_MAX_ROWS) {
    throw new StudentImportError(
      "TOO_MANY_ROWS",
      `تعداد ردیف‌ها از سقف مجاز (${STUDENT_IMPORT_MAX_ROWS}) بیشتر است.`,
    );
  }

  return {
    sheets,
    selectedSheet,
    headerRowNumber: headerRow.number,
    headers,
    previewRows,
    rowCount: dataRowCount,
  };
}

export async function parseStudentImportFile(
  file: File,
  mapping: StudentColumnMapping,
  sheetName?: string,
): Promise<ParsedStudentImportRow[]> {
  const inspection = await inspectStudentImportFile(file, sheetName);
  const workbook = await loadWorkbook(file);
  const worksheet = workbook.getWorksheet(inspection.selectedSheet);
  if (!worksheet) {
    throw new StudentImportError("SHEET_NOT_FOUND", "برگه انتخاب‌شده یافت نشد.");
  }

  const mappedFields = new Set(
    Object.values(mapping).filter((field) => field !== "IGNORE"),
  );
  if (!mappedFields.has("firstName") || !mappedFields.has("lastName")) {
    throw new StudentImportError(
      "MISSING_REQUIRED_COLUMNS",
      "ستون‌های «نام» و «نام خانوادگی» باید تطبیق داده شوند.",
    );
  }
  if (!mappedFields.has("grade")) {
    throw new StudentImportError(
      "MISSING_REQUIRED_COLUMNS",
      "ستون «پایه» باید تطبیق داده شود.",
    );
  }

  const rows: ParsedStudentImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= inspection.headerRowNumber) return;
    const values: Record<number, string> = {};
    let empty = true;
    for (const header of inspection.headers) {
      const text = cellToString(row.getCell(header.column));
      values[header.column] = text;
      if (text) empty = false;
    }
    if (empty) return;
    rows.push(mapRow(values, mapping, rowNumber));
  });

  if (rows.length > STUDENT_IMPORT_MAX_ROWS) {
    throw new StudentImportError(
      "TOO_MANY_ROWS",
      `تعداد ردیف‌ها از سقف مجاز (${STUDENT_IMPORT_MAX_ROWS}) بیشتر است.`,
    );
  }

  return rows;
}

/**
 * Allocate a slug unique against the DB unique constraint
 * (organizationId, slug) — includes soft-deleted rows.
 */
async function allocateUniqueSlug(
  organizationId: string,
  desired: string,
  excludeId?: string,
  reserved?: Set<string>,
): Promise<string> {
  let base = normalizeStudentSlug(desired);
  if (base.length < 2) base = `student-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 0; i < 40; i += 1) {
    if (reserved?.has(candidate)) {
      candidate = `${base}-${i + 2}`;
      continue;
    }
    const hit = await prisma.student.findFirst({
      where: {
        organizationId,
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) {
      reserved?.add(candidate);
      return candidate;
    }
    candidate = `${base}-${i + 2}`;
  }
  const fallback = `${base}-${Date.now().toString(36)}`;
  reserved?.add(fallback);
  return fallback;
}

export async function validateStudentImportRows(params: {
  organizationId: string;
  rows: ParsedStudentImportRow[];
  mode: StudentImportMode;
}): Promise<ValidatedStudentImportRow[]> {
  const { organizationId, rows, mode } = params;
  await Promise.all([
    ensureDefaultStudentGrades(organizationId),
    ensureDefaultStudentMajors(organizationId),
  ]);

  const [grades, majors, liveStudents] = await Promise.all([
    prisma.studentGrade.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        archivedAt: true,
      },
    }),
    prisma.studentMajor.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        archivedAt: true,
      },
    }),
    prisma.student.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        gradeId: true,
      },
    }),
  ]);

  const gradeByKey = new Map<string, (typeof grades)[number]>();
  for (const grade of grades) {
    gradeByKey.set(normalizeLookupKey(grade.name), grade);
    gradeByKey.set(normalizeLookupKey(grade.slug), grade);
  }
  const majorByKey = new Map<string, (typeof majors)[number]>();
  for (const major of majors) {
    majorByKey.set(normalizeLookupKey(major.name), major);
    majorByKey.set(normalizeLookupKey(major.slug), major);
  }

  const studentBySlug = new Map(
    liveStudents.map((student) => [student.slug, student]),
  );
  const nameGradeKeys = new Map<string, string[]>();
  for (const student of liveStudents) {
    const key = `${normalizeLookupKey(student.firstName)}|${normalizeLookupKey(student.lastName)}|${student.gradeId}`;
    const list = nameGradeKeys.get(key) ?? [];
    list.push(student.id);
    nameGradeKeys.set(key, list);
  }

  const seenSlugsInFile = new Map<string, number>();
  const validated: ValidatedStudentImportRow[] = [];

  for (const row of rows) {
    const firstName = toLatinDigits(row.firstName ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const lastName = toLatinDigits(row.lastName ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    if (!firstName) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: "نام الزامی است.",
        column: "نام",
        value: row.firstName ?? "",
        data: row,
      });
      continue;
    }
    if (!lastName) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: "نام خانوادگی الزامی است.",
        column: "نام خانوادگی",
        value: row.lastName ?? "",
        data: row,
      });
      continue;
    }

    const gradeRaw = (row.grade ?? "").trim();
    if (!gradeRaw) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: "پایه الزامی است.",
        column: "پایه",
        value: "",
        data: row,
      });
      continue;
    }

    const grade = gradeByKey.get(normalizeLookupKey(gradeRaw));
    if (!grade || grade.archivedAt || !grade.isActive) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: "پایه واردشده در سامانه تعریف نشده است.",
        column: "پایه",
        value: gradeRaw,
        data: row,
      });
      continue;
    }

    let majorId: string | null = null;
    let majorName: string | null = null;
    const majorRaw = (row.major ?? "").trim();
    if (gradeRequiresMajor(grade.slug)) {
      if (!majorRaw) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "رشته تحصیلی برای پایه‌های دهم تا دوازدهم الزامی است.",
          column: "رشته",
          value: "",
          data: row,
        });
        continue;
      }
      const major = majorByKey.get(normalizeLookupKey(majorRaw));
      if (!major || major.archivedAt || !major.isActive) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "رشته واردشده در سامانه تعریف نشده است.",
          column: "رشته",
          value: majorRaw,
          data: row,
        });
        continue;
      }
      majorId = major.id;
      majorName = major.name;
    } else if (majorRaw) {
      const major = majorByKey.get(normalizeLookupKey(majorRaw));
      if (!major || major.archivedAt || !major.isActive) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "رشته واردشده در سامانه تعریف نشده است.",
          column: "رشته",
          value: majorRaw,
          data: row,
        });
        continue;
      }
      majorId = major.id;
      majorName = major.name;
    }

    const isActiveRaw = (row.isActiveRaw ?? "").trim();
    let isActive = true;
    if (isActiveRaw) {
      const parsed = parseBool(isActiveRaw);
      if (parsed == null) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "وضعیت نامعتبر است. مقادیر مجاز: فعال / غیرفعال.",
          column: "وضعیت",
          value: isActiveRaw,
          data: row,
        });
        continue;
      }
      isActive = parsed;
    }

    const isFeaturedRaw = (row.isFeaturedRaw ?? "").trim();
    let isFeatured = false;
    if (isFeaturedRaw) {
      const parsed = parseBool(isFeaturedRaw);
      if (parsed == null) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "مقدار ویژه نامعتبر است. مقادیر مجاز: بله / خیر.",
          column: "ویژه",
          value: isFeaturedRaw,
          data: row,
        });
        continue;
      }
      isFeatured = parsed;
    }

    const displayOrderRaw = (row.displayOrderRaw ?? "").trim();
    let displayOrder = 0;
    if (displayOrderRaw) {
      const parsed = parseOptionalInt(displayOrderRaw);
      if (parsed == null || parsed < 0) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "ترتیب نمایش باید عدد صحیح غیرمنفی باشد.",
          column: "ترتیب نمایش",
          value: displayOrderRaw,
          data: row,
        });
        continue;
      }
      displayOrder = parsed;
    }

    const fullName = composeStudentFullName(firstName, lastName);
    const slugInput = (row.slug ?? "").trim();
    let slug = slugInput
      ? normalizeStudentSlug(toLatinDigits(slugInput))
      : slugFromStudentName(fullName);
    if (slug.length < 2) {
      slug = `student-${row.excelRow}`;
    }

    const priorExcelRow = seenSlugsInFile.get(slug);
    if (priorExcelRow != null) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: `اسلاگ تکراری در فایل (هم‌ردیف با ردیف ${priorExcelRow}).`,
        column: "اسلاگ",
        value: slug,
        data: row,
      });
      continue;
    }
    seenSlugsInFile.set(slug, row.excelRow);

    const existingBySlug = studentBySlug.get(slug);
    const nameKey = `${normalizeLookupKey(firstName)}|${normalizeLookupKey(lastName)}|${grade.id}`;
    const nameMatches = nameGradeKeys.get(nameKey) ?? [];

    let classification: Exclude<StudentImportRowClassification, "error"> =
      "create";
    let existingStudentId: string | undefined;
    let warning: string | undefined;

    if (existingBySlug) {
      if (mode === "create_and_update") {
        classification = "update";
        existingStudentId = existingBySlug.id;
      } else {
        classification = "duplicate_skip";
        existingStudentId = existingBySlug.id;
        warning = "دانش‌آموزی با این اسلاگ از قبل وجود دارد.";
      }
    } else if (nameMatches.length > 0 && !slugInput) {
      warning =
        "دانش‌آموز دیگری با همین نام و پایه وجود دارد؛ به‌دلیل نبود اسلاگ یکتا، به‌عنوان رکورد جدید در نظر گرفته می‌شود مگر اینکه اسلاگ مشخص کنید.";
    }

    validated.push({
      ok: true,
      excelRow: row.excelRow,
      classification,
      existingStudentId,
      firstName,
      lastName,
      fullName,
      gradeId: grade.id,
      gradeName: grade.name,
      majorId,
      majorName,
      slug,
      parentName: (row.parentName ?? "").trim().slice(0, 120) || null,
      schoolYear: (row.schoolYear ?? "").trim().slice(0, 40) || null,
      biography: (row.biography ?? "").trim().slice(0, 5000),
      isActive,
      isFeatured,
      displayOrder,
      warning,
      data: row,
    });
  }

  return validated;
}

export async function importStudents(params: {
  organizationId: string;
  rows: ValidatedStudentImportRow[];
  mode: StudentImportMode;
}): Promise<StudentImportResult> {
  const okRows = params.rows.filter(
    (row): row is Extract<ValidatedStudentImportRow, { ok: true }> => row.ok,
  );
  const errorRows = params.rows.filter((row) => !row.ok);

  const toCreate = okRows.filter((row) => row.classification === "create");
  const toUpdate =
    params.mode === "create_and_update"
      ? okRows.filter((row) => row.classification === "update")
      : [];
  const toSkip = okRows.filter(
    (row) => row.classification === "duplicate_skip",
  );

  let created = 0;
  let updated = 0;
  const CHUNK = 50;
  const reservedSlugs = new Set<string>();

  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const chunk = toCreate.slice(i, i + CHUNK);
    const prepared = [];
    for (const row of chunk) {
      const slug = await allocateUniqueSlug(
        params.organizationId,
        row.slug,
        undefined,
        reservedSlugs,
      );
      prepared.push({ row, slug });
    }

    await prisma.$transaction(
      prepared.map(({ row, slug }) =>
        prisma.student.create({
          data: {
            organizationId: params.organizationId,
            firstName: row.firstName,
            lastName: row.lastName,
            fullName: row.fullName,
            gradeId: row.gradeId,
            majorId: row.majorId,
            slug,
            parentName: row.parentName,
            schoolYear: row.schoolYear,
            biography: row.biography,
            isActive: row.isActive,
            isFeatured: row.isFeatured,
            displayOrder: row.displayOrder,
            featuredPriority: 0,
          },
        }),
      ),
    );
    created += prepared.length;
  }

  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.student.update({
          where: { id: row.existingStudentId! },
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            fullName: row.fullName,
            gradeId: row.gradeId,
            majorId: row.majorId,
            // Keep existing slug on update to avoid accidental unique conflicts
            parentName: row.parentName,
            schoolYear: row.schoolYear,
            biography: row.biography,
            isActive: row.isActive,
            isFeatured: row.isFeatured,
            displayOrder: row.displayOrder,
          },
        }),
      ),
    );
    updated += chunk.length;
  }

  return {
    totalRows: params.rows.length,
    validRows: okRows.length,
    invalidRows: errorRows.length,
    created,
    updated,
    skipped: toSkip.length,
    duplicateRows: toSkip.length,
    errors: errorRows.map((row) => ({
      excelRow: row.excelRow,
      error: row.ok ? "" : row.error,
      column: row.ok ? undefined : row.column,
      value: row.ok ? undefined : row.value,
    })),
  };
}

export function summarizeStudentImportRows(
  rows: ValidatedStudentImportRow[],
): {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  createCount: number;
  updateCount: number;
  duplicateCount: number;
  previewRows: ValidatedStudentImportRow[];
} {
  const ok = rows.filter((row) => row.ok);
  return {
    totalRows: rows.length,
    validCount: ok.length,
    invalidCount: rows.length - ok.length,
    createCount: ok.filter((row) => row.classification === "create").length,
    updateCount: ok.filter((row) => row.classification === "update").length,
    duplicateCount: ok.filter((row) => row.classification === "duplicate_skip")
      .length,
    previewRows: rows.slice(0, STUDENT_IMPORT_PREVIEW_LIMIT),
  };
}

export async function buildStudentImportTemplateWorkbook(
  organizationId: string,
): Promise<ExcelJS.Workbook> {
  await Promise.all([
    ensureDefaultStudentGrades(organizationId),
    ensureDefaultStudentMajors(organizationId),
  ]);
  const [grades, majors] = await Promise.all([
    prisma.studentGrade.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }],
      select: { name: true, slug: true },
    }),
    prisma.studentMajor.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }],
      select: { name: true, slug: true },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SetareganPlus";
  const sheet = workbook.addWorksheet("دانش‌آموزان");
  const headers = [
    "نام",
    "نام خانوادگی",
    "پایه",
    "رشته",
    "اسلاگ",
    "نام ولی",
    "سال تحصیلی",
    "توضیحات",
    "وضعیت",
    "ویژه",
    "ترتیب نمایش",
  ];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow([
    "علی",
    "محمدی",
    grades[0]?.name ?? "پایه اول",
    "",
    "ali-mohammadi",
    "رضا محمدی",
    "۱۴۰۴-۱۴۰۵",
    "",
    "فعال",
    "خیر",
    "0",
  ]);
  sheet.columns = headers.map(() => ({ width: 18 }));

  const guide = workbook.addWorksheet("راهنما");
  guide.addRow(["راهنمای ورود گروهی دانش‌آموزان"]);
  guide.addRow([]);
  guide.addRow(["ستون", "الزامی؟", "توضیح"]);
  guide.addRow(["نام", "بله", "حداکثر ۸۰ نویسه؛ ارقام فارسی/عربی نرمال می‌شوند"]);
  guide.addRow([
    "نام خانوادگی",
    "بله",
    "حداکثر ۸۰ نویسه؛ ارقام فارسی/عربی نرمال می‌شوند",
  ]);
  guide.addRow([
    "پایه",
    "بله",
    "نام یا اسلاگ پایه فعال موجود در سامانه (لیست پایین)",
  ]);
  guide.addRow([
    "رشته",
    "برای دهم تا دوازدهم بله",
    "نام یا اسلاگ رشته فعال؛ برای سایر پایه‌ها اختیاری",
  ]);
  guide.addRow([
    "اسلاگ",
    "خیر (پیشنهادی)",
    "کلید یکتای تشخیص تکراری؛ در صورت خالی بودن از نام ساخته می‌شود",
  ]);
  guide.addRow([
    "نام ولی",
    "خیر",
    "متن آزاد روی رکورد دانش‌آموز — ولی پرتال ساخته نمی‌شود",
  ]);
  guide.addRow(["سال تحصیلی", "خیر", "مثلاً ۱۴۰۴-۱۴۰۵"]);
  guide.addRow(["توضیحات", "خیر", "حداکثر ۵۰۰۰ نویسه"]);
  guide.addRow(["وضعیت", "خیر", "فعال یا غیرفعال (پیش‌فرض: فعال)"]);
  guide.addRow(["ویژه", "خیر", "بله یا خیر (پیش‌فرض: خیر)"]);
  guide.addRow(["ترتیب نمایش", "خیر", "عدد صحیح غیرمنفی"]);
  guide.addRow([]);
  guide.addRow([
    "توجه",
    "",
    "کد ملی، موبایل، تاریخ تولد و جنسیت در مدل دانش‌آموز فعلی وجود ندارد و وارد نمی‌شود.",
  ]);
  guide.addRow([
    "توجه",
    "",
    "ساخت/اتصال ولی پرتال فاز جداگانه است و نیاز به مجوز students.portal.manage دارد.",
  ]);
  guide.addRow([
    "سیاست تکرار",
    "",
    "پیش‌فرض: ایجاد جدید و رد کردن اسلاگ تکراری. حالت به‌روزرسانی فقط با تطبیق اسلاگ زنده.",
  ]);
  guide.addRow([]);
  guide.addRow(["پایه‌های فعال"]);
  for (const grade of grades) {
    guide.addRow([grade.name, grade.slug]);
  }
  guide.addRow([]);
  guide.addRow(["رشته‌های فعال"]);
  for (const major of majors) {
    guide.addRow([major.name, major.slug]);
  }
  guide.columns = [{ width: 28 }, { width: 28 }, { width: 64 }];

  return workbook;
}

export async function buildStudentImportInvalidRowsWorkbook(
  rows: ValidatedStudentImportRow[],
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("خطاها");
  sheet.addRow([
    "ردیف اکسل",
    "ستون",
    "مقدار دریافتی",
    "پیام خطا",
    "نام",
    "نام خانوادگی",
    "پایه",
    "اسلاگ",
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    if (row.ok) continue;
    sheet.addRow([
      row.excelRow,
      row.column ?? "",
      row.value ?? "",
      row.error,
      row.data.firstName ?? "",
      row.data.lastName ?? "",
      row.data.grade ?? "",
      row.data.slug ?? "",
    ]);
  }
  sheet.columns = [
    { width: 12 },
    { width: 16 },
    { width: 22 },
    { width: 48 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 18 },
  ];
  return workbook;
}

export async function buildStudentImportResultWorkbook(params: {
  filename: string;
  importedBy: string;
  organizationName: string;
  startedAt: Date;
  finishedAt: Date;
  result: StudentImportResult;
}): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("گزارش");
  sheet.addRow(["گزارش ورود گروهی دانش‌آموزان"]);
  sheet.addRow(["نام فایل", params.filename]);
  sheet.addRow(["واردکننده", params.importedBy]);
  sheet.addRow(["سازمان", params.organizationName]);
  sheet.addRow(["شروع", params.startedAt.toISOString()]);
  sheet.addRow(["پایان", params.finishedAt.toISOString()]);
  sheet.addRow(["کل ردیف‌ها", params.result.totalRows]);
  sheet.addRow(["معتبر", params.result.validRows]);
  sheet.addRow(["نامعتبر", params.result.invalidRows]);
  sheet.addRow(["ایجاد شده", params.result.created]);
  sheet.addRow(["به‌روزرسانی شده", params.result.updated]);
  sheet.addRow(["رد شده (تکراری)", params.result.skipped]);
  sheet.addRow([]);
  sheet.addRow(["ردیف", "ستون", "مقدار", "خطا"]);
  for (const error of params.result.errors) {
    sheet.addRow([
      error.excelRow,
      error.column ?? "",
      error.value ?? "",
      error.error,
    ]);
  }
  sheet.columns = [{ width: 24 }, { width: 36 }, { width: 24 }, { width: 48 }];
  return workbook;
}
