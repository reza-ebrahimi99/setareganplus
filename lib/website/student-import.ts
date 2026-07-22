/**
 * Student bulk import pipeline (Excel/CSV).
 * Step 1 parses the workbook into a serializable session; later steps never need File.
 */

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import {
  GuardianRelationshipType,
  PortalAccountType,
} from "@/generated/prisma/enums";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import {
  ensureGuardianStudentRelation,
  ensurePortalAccessLink,
  findOrCreateGuardianByMobile,
} from "@/lib/portal/admin/access";
import { prisma } from "@/lib/prisma";
import { StudentImportError } from "@/lib/website/student-import-errors";
import { normalizeKanoonStudentId } from "@/lib/website/kanoon-student-id";
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
  type GuardianImportStatus,
  type ParsedStudentImportRow,
  type PortalImportStatus,
  type StudentColumnMapping,
  type StudentImportField,
  type StudentImportMode,
  type StudentImportRawRow,
  type StudentImportResult,
  type StudentImportRowResult,
  type StudentImportSession,
  type StudentImportRowClassification,
  type StudentWorkbookHeader,
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
  "نام ولی (متن آزاد)": "parentName",
  "نام ولی cms": "parentName",
  parentname: "parentName",
  "سال تحصیلی": "schoolYear",
  schoolyear: "schoolYear",
  year: "schoolYear",
  توضیحات: "biography",
  biography: "biography",
  بیوگرافی: "biography",
  وضعیت: "isActive",
  status: "isActive",
  ویژه: "isFeatured",
  featured: "isFeatured",
  "ترتیب نمایش": "displayOrder",
  displayorder: "displayOrder",
  "شناسه قلم‌چی": "kanoonStudentId",
  شمارنده: "kanoonStudentId",
  "کد قلم‌چی": "kanoonStudentId",
  "kanoon id": "kanoonStudentId",
  counter: "kanoonStudentId",
  kanoonstudentid: "kanoonStudentId",
  "شماره موبایل دانش‌آموز": "studentMobile",
  "موبایل دانش‌آموز": "studentMobile",
  "تلفن دانش‌آموز": "studentMobile",
  "student mobile": "studentMobile",
  "student phone": "studentMobile",
  studentmobile: "studentMobile",
  "نام ولی": "guardianFirstName",
  "نام والد": "guardianFirstName",
  "guardian first name": "guardianFirstName",
  "نام خانوادگی ولی": "guardianLastName",
  "نام خانوادگی والد": "guardianLastName",
  "guardian last name": "guardianLastName",
  "شماره موبایل ولی": "guardianMobile",
  "موبایل ولی": "guardianMobile",
  "موبایل والد": "guardianMobile",
  "شماره تماس والد": "guardianMobile",
  "guardian mobile": "guardianMobile",
  "parent mobile": "guardianMobile",
  "parent phone": "guardianMobile",
  "نسبت با دانش‌آموز": "guardianRelation",
  نسبت: "guardianRelation",
  "نوع ولی": "guardianRelation",
  "guardian relation": "guardianRelation",
  relationship: "guardianRelation",
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

function parseGuardianRelation(
  raw: string,
): GuardianRelationshipType | null {
  const value = toLatinDigits(raw).trim().toLowerCase();
  if (!value) return GuardianRelationshipType.GUARDIAN;
  if (
    value === "father" ||
    value === "پدر" ||
    value === GuardianRelationshipType.FATHER.toLowerCase()
  ) {
    return GuardianRelationshipType.FATHER;
  }
  if (
    value === "mother" ||
    value === "مادر" ||
    value === GuardianRelationshipType.MOTHER.toLowerCase()
  ) {
    return GuardianRelationshipType.MOTHER;
  }
  if (
    value === "guardian" ||
    value === "ولی" ||
    value === "سرپرست" ||
    value === GuardianRelationshipType.GUARDIAN.toLowerCase()
  ) {
    return GuardianRelationshipType.GUARDIAN;
  }
  if (
    value === "other" ||
    value === "سایر" ||
    value === "دیگر" ||
    value === GuardianRelationshipType.OTHER.toLowerCase()
  ) {
    return GuardianRelationshipType.OTHER;
  }
  return null;
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

function parseSheetData(worksheet: ExcelJS.Worksheet): {
  headerRowNumber: number;
  headers: StudentWorkbookHeader[];
  rows: StudentImportRawRow[];
} {
  const headerRow = findHeaderRow(worksheet);
  const headers: StudentWorkbookHeader[] = [];
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

  const rows: StudentImportRawRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const values: Record<number, string> = {};
    let empty = true;
    for (const header of headers) {
      const text = cellToString(row.getCell(header.column));
      values[header.column] = text;
      if (text) empty = false;
    }
    if (empty) return;
    rows.push({ excelRow: rowNumber, values });
  });

  if (rows.length > STUDENT_IMPORT_MAX_ROWS) {
    throw new StudentImportError(
      "TOO_MANY_ROWS",
      `تعداد ردیف‌ها از سقف مجاز (${STUDENT_IMPORT_MAX_ROWS}) بیشتر است.`,
    );
  }

  return {
    headerRowNumber: headerRow.number,
    headers,
    rows,
  };
}

/** Parse workbook once into a client-serializable session (all data sheets). */
export async function parseStudentImportSession(
  file: File,
  preferredSheet?: string,
): Promise<StudentImportSession> {
  const workbook = await loadWorkbook(file);
  const sheetNames = workbook.worksheets
    .map((sheet) => sheet.name)
    .filter((name) => name !== "راهنما");
  if (sheetNames.length === 0) {
    throw new StudentImportError(
      "EMPTY_WORKBOOK",
      "فایل کاربرگ معتبری ندارد.",
    );
  }

  const sheetsData: StudentImportSession["sheetsData"] = {};
  const parseWarnings: string[] = [];

  for (const name of sheetNames) {
    const worksheet = workbook.getWorksheet(name);
    if (!worksheet) continue;
    try {
      sheetsData[name] = parseSheetData(worksheet);
    } catch (error) {
      if (isStudentImportErrorLike(error)) {
        parseWarnings.push(`برگه «${name}»: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  const usableSheets = Object.keys(sheetsData);
  if (usableSheets.length === 0) {
    throw new StudentImportError(
      "HEADER_NOT_FOUND",
      parseWarnings[0] ?? "ردیف عنوان یافت نشد.",
    );
  }

  const selectedSheet =
    preferredSheet && sheetsData[preferredSheet]
      ? preferredSheet
      : usableSheets[0]!;
  const selected = sheetsData[selectedSheet]!;

  return {
    filename: file.name || "import.xlsx",
    sheets: usableSheets,
    selectedSheet,
    headerRowNumber: selected.headerRowNumber,
    headers: selected.headers,
    sheetsData,
    parseWarnings,
  };
}

function isStudentImportErrorLike(
  error: unknown,
): error is StudentImportError {
  return error instanceof StudentImportError;
}

export function sessionToInspection(
  session: StudentImportSession,
  sheetName?: string,
): StudentWorkbookInspection {
  const selectedSheet =
    sheetName && session.sheetsData[sheetName]
      ? sheetName
      : session.selectedSheet;
  const sheet = session.sheetsData[selectedSheet];
  if (!sheet) {
    throw new StudentImportError("SHEET_NOT_FOUND", "برگه انتخاب‌شده یافت نشد.");
  }
  const previewRows = sheet.rows.slice(0, 8).map((row) =>
    sheet.headers.map((header) => row.values[header.column] ?? ""),
  );
  return {
    sheets: session.sheets,
    selectedSheet,
    headerRowNumber: sheet.headerRowNumber,
    headers: sheet.headers,
    previewRows,
    rowCount: sheet.rows.length,
  };
}

export function mapRawRowsToParsed(
  rawRows: StudentImportRawRow[],
  mapping: StudentColumnMapping,
): ParsedStudentImportRow[] {
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

  return rawRows.map((raw) => {
    const data: ParsedStudentImportRow = { excelRow: raw.excelRow };
    for (const [column, field] of Object.entries(mapping)) {
      const value = raw.values[Number(column)] ?? "";
      if (!field || field === "IGNORE") continue;
      switch (field) {
        case "firstName":
          data.firstName = value;
          break;
        case "lastName":
          data.lastName = value;
          break;
        case "grade":
          data.grade = value;
          break;
        case "major":
          data.major = value;
          break;
        case "slug":
          data.slug = value;
          break;
        case "parentName":
          data.parentName = value;
          break;
        case "schoolYear":
          data.schoolYear = value;
          break;
        case "biography":
          data.biography = value;
          break;
        case "isActive":
          data.isActiveRaw = value;
          break;
        case "isFeatured":
          data.isFeaturedRaw = value;
          break;
        case "displayOrder":
          data.displayOrderRaw = value;
          break;
        case "kanoonStudentId":
          data.kanoonStudentIdRaw = value;
          break;
        case "studentMobile":
          data.studentMobileRaw = value;
          break;
        case "guardianFirstName":
          data.guardianFirstName = value;
          break;
        case "guardianLastName":
          data.guardianLastName = value;
          break;
        case "guardianMobile":
          data.guardianMobileRaw = value;
          break;
        case "guardianRelation":
          data.guardianRelationRaw = value;
          break;
        default:
          break;
      }
    }
    return data;
  });
}

/** @deprecated Prefer parseStudentImportSession + sessionToInspection */
export async function inspectStudentImportFile(
  file: File,
  sheetName?: string,
): Promise<StudentWorkbookInspection> {
  const session = await parseStudentImportSession(file, sheetName);
  return sessionToInspection(session, sheetName);
}

/** @deprecated Prefer mapRawRowsToParsed on session data */
export async function parseStudentImportFile(
  file: File,
  mapping: StudentColumnMapping,
  sheetName?: string,
): Promise<ParsedStudentImportRow[]> {
  const session = await parseStudentImportSession(file, sheetName);
  const sheet = session.sheetsData[session.selectedSheet];
  if (!sheet) {
    throw new StudentImportError("SHEET_NOT_FOUND", "برگه انتخاب‌شده یافت نشد.");
  }
  return mapRawRowsToParsed(sheet.rows, mapping);
}

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

function normalizeOptionalMobile(
  raw: string | undefined,
  column: string,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string; column: string; value: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: true, value: null };
  const parsed = normalizeIranianMobile(trimmed);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error || "شماره موبایل نامعتبر است.",
      column,
      value: trimmed,
    };
  }
  return { ok: true, value: parsed.normalized };
}

export async function validateStudentImportRows(params: {
  organizationId: string;
  rows: ParsedStudentImportRow[];
  mode: StudentImportMode;
  canManagePortal: boolean;
}): Promise<ValidatedStudentImportRow[]> {
  const { organizationId, rows, mode, canManagePortal } = params;
  await Promise.all([
    ensureDefaultStudentGrades(organizationId),
    ensureDefaultStudentMajors(organizationId),
  ]);

  const [grades, majors, liveStudents, liveGuardians] = await Promise.all([
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
        kanoonStudentId: true,
      },
    }),
    canManagePortal
      ? prisma.studentGuardian.findMany({
          where: { organizationId, deletedAt: null },
          select: {
            id: true,
            normalizedMobile: true,
            firstName: true,
            lastName: true,
          },
        })
      : Promise.resolve([]),
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
  const studentByKanoon = new Map<string, (typeof liveStudents)[number]>();
  for (const student of liveStudents) {
    if (student.kanoonStudentId) {
      studentByKanoon.set(student.kanoonStudentId, student);
    }
  }
  const nameGradeKeys = new Map<string, string[]>();
  for (const student of liveStudents) {
    const key = `${normalizeLookupKey(student.firstName)}|${normalizeLookupKey(student.lastName)}|${student.gradeId}`;
    const list = nameGradeKeys.get(key) ?? [];
    list.push(student.id);
    nameGradeKeys.set(key, list);
  }
  const guardianByMobile = new Map(
    liveGuardians.map((g) => [g.normalizedMobile, g]),
  );

  const seenSlugsInFile = new Map<string, number>();
  const seenKanoonInFile = new Map<string, number>();
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

    const studentMobileResult = normalizeOptionalMobile(
      row.studentMobileRaw,
      "شماره موبایل دانش‌آموز",
    );
    if (!studentMobileResult.ok) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: studentMobileResult.error,
        column: studentMobileResult.column,
        value: studentMobileResult.value,
        data: row,
      });
      continue;
    }

    const guardianFirstName = (row.guardianFirstName ?? "")
      .trim()
      .slice(0, 80);
    const guardianLastName = (row.guardianLastName ?? "").trim().slice(0, 80);
    const guardianMobileResult = normalizeOptionalMobile(
      row.guardianMobileRaw,
      "شماره موبایل ولی",
    );
    if (!guardianMobileResult.ok) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: guardianMobileResult.error,
        column: guardianMobileResult.column,
        value: guardianMobileResult.value,
        data: row,
      });
      continue;
    }

    const anyGuardianField =
      Boolean(guardianFirstName) ||
      Boolean(guardianLastName) ||
      Boolean(guardianMobileResult.value) ||
      Boolean((row.guardianRelationRaw ?? "").trim());

    let guardianRelationLabel: string | null = null;
    if (anyGuardianField) {
      if (!guardianMobileResult.value) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "برای ثبت ولی، شماره موبایل ولی الزامی است.",
          column: "شماره موبایل ولی",
          value: "",
          data: row,
        });
        continue;
      }
      if (!guardianFirstName || !guardianLastName) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "نام و نام خانوادگی ولی الزامی است.",
          column: !guardianFirstName ? "نام ولی" : "نام خانوادگی ولی",
          value: "",
          data: row,
        });
        continue;
      }
      const relation = parseGuardianRelation(row.guardianRelationRaw ?? "");
      if (relation == null) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: "نسبت ولی نامعتبر است. مقادیر مجاز: پدر، مادر، ولی، سایر.",
          column: "نسبت با دانش‌آموز",
          value: row.guardianRelationRaw ?? "",
          data: row,
        });
        continue;
      }
      guardianRelationLabel = relation;
    }

    const fullName = composeStudentFullName(firstName, lastName);
    const slugInput = (row.slug ?? "").trim();
    let slug = slugInput
      ? normalizeStudentSlug(toLatinDigits(slugInput))
      : slugFromStudentName(fullName);
    if (slug.length < 2) slug = `student-${row.excelRow}`;

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

    const kanoonParsed = normalizeKanoonStudentId(row.kanoonStudentIdRaw ?? "");
    if (!kanoonParsed.ok) {
      validated.push({
        ok: false,
        excelRow: row.excelRow,
        classification: "error",
        error: kanoonParsed.error,
        column: "شناسه قلم‌چی",
        value: row.kanoonStudentIdRaw ?? "",
        data: row,
      });
      continue;
    }
    const kanoonStudentId = kanoonParsed.value;
    if (kanoonStudentId) {
      const priorKanoonRow = seenKanoonInFile.get(kanoonStudentId);
      if (priorKanoonRow != null) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error: `شناسه قلم‌چی تکراری در فایل (هم‌ردیف با ردیف ${priorKanoonRow}).`,
          column: "شناسه قلم‌چی",
          value: kanoonStudentId,
          data: row,
        });
        continue;
      }
      seenKanoonInFile.set(kanoonStudentId, row.excelRow);

      const existingByKanoon = studentByKanoon.get(kanoonStudentId);
      if (existingByKanoon && existingBySlug && existingBySlug.id !== existingByKanoon.id) {
        validated.push({
          ok: false,
          excelRow: row.excelRow,
          classification: "error",
          error:
            "شناسه قلم‌چی متعلق به دانش‌آموز دیگری است (با اسلاگ واردشده هم‌خوان نیست).",
          column: "شناسه قلم‌چی",
          value: kanoonStudentId,
          data: row,
        });
        continue;
      }
      if (
        existingByKanoon &&
        !existingBySlug &&
        mode !== "create_and_update"
      ) {
        // Will classify as duplicate_skip below
      }
    }

    const nameKey = `${normalizeLookupKey(firstName)}|${normalizeLookupKey(lastName)}|${grade.id}`;
    const nameMatches = nameGradeKeys.get(nameKey) ?? [];

    let classification: Exclude<StudentImportRowClassification, "error"> =
      "create";
    let existingStudentId: string | undefined;
    const warnings: string[] = [];

    if (existingBySlug) {
      if (mode === "create_and_update") {
        classification = "update";
        existingStudentId = existingBySlug.id;
      } else {
        classification = "duplicate_skip";
        existingStudentId = existingBySlug.id;
        warnings.push("دانش‌آموزی با این اسلاگ از قبل وجود دارد.");
      }
    } else if (kanoonStudentId && studentByKanoon.get(kanoonStudentId)) {
      const byKanoon = studentByKanoon.get(kanoonStudentId)!;
      if (mode === "create_and_update") {
        classification = "update";
        existingStudentId = byKanoon.id;
      } else {
        classification = "duplicate_skip";
        existingStudentId = byKanoon.id;
        warnings.push("دانش‌آموزی با این شناسه قلم‌چی از قبل وجود دارد.");
      }
    } else if (nameMatches.length > 0 && !slugInput) {
      warnings.push(
        "دانش‌آموز دیگری با همین نام و پایه وجود دارد؛ به‌دلیل نبود اسلاگ یکتا، به‌عنوان رکورد جدید در نظر گرفته می‌شود.",
      );
    }

    let guardianStatusPreview: GuardianImportStatus = "none";
    let guardianPortalStatusPreview: PortalImportStatus = "none";
    let studentPortalStatusPreview: PortalImportStatus = "none";

    if (anyGuardianField) {
      if (!canManagePortal) {
        guardianStatusPreview = "skipped_no_permission";
        guardianPortalStatusPreview = "skipped_no_permission";
        warnings.push(
          "ساخت ولی و دسترسی پرتال به‌دلیل نبود مجوز students.portal.manage رد شد.",
        );
      } else if (guardianMobileResult.value) {
        const existingGuardian = guardianByMobile.get(
          guardianMobileResult.value,
        );
        guardianStatusPreview = existingGuardian ? "existing" : "new";
        if (
          existingGuardian &&
          (existingGuardian.firstName !== guardianFirstName ||
            existingGuardian.lastName !== guardianLastName)
        ) {
          guardianStatusPreview = "conflict_warning";
          warnings.push(
            `ولی با این موبایل از قبل وجود دارد (${existingGuardian.firstName} ${existingGuardian.lastName})؛ مشخصات موجود حفظ می‌شود.`,
          );
        }
        guardianPortalStatusPreview = "created";
      }
    }

    if (studentMobileResult.value) {
      if (!canManagePortal) {
        studentPortalStatusPreview = "skipped_no_permission";
        warnings.push(
          "دسترسی پرتال دانش‌آموز به‌دلیل نبود مجوز ایجاد نمی‌شود؛ موبایل روی مدل دانش‌آموز ذخیره نمی‌شود.",
        );
      } else {
        studentPortalStatusPreview = "created";
      }
    } else {
      studentPortalStatusPreview = "skipped_no_mobile";
    }

    const parentNameFree =
      (row.parentName ?? "").trim().slice(0, 120) ||
      (guardianFirstName && guardianLastName
        ? `${guardianFirstName} ${guardianLastName}`.trim()
        : null);

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
      parentName: parentNameFree,
      schoolYear: (row.schoolYear ?? "").trim().slice(0, 40) || null,
      biography: (row.biography ?? "").trim().slice(0, 5000),
      isActive,
      isFeatured,
      displayOrder,
      kanoonStudentId,
      studentMobile: studentMobileResult.value,
      guardianFirstName: guardianFirstName || null,
      guardianLastName: guardianLastName || null,
      guardianMobile: guardianMobileResult.value,
      guardianRelation: guardianRelationLabel,
      guardianStatusPreview,
      studentPortalStatusPreview,
      guardianPortalStatusPreview,
      warning: warnings.length > 0 ? warnings.join(" ") : undefined,
      data: row,
    });
  }

  return validated;
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

export async function importStudents(params: {
  organizationId: string;
  rows: ValidatedStudentImportRow[];
  mode: StudentImportMode;
  canManagePortal: boolean;
}): Promise<StudentImportResult> {
  const okRows = params.rows.filter(
    (row): row is Extract<ValidatedStudentImportRow, { ok: true }> => row.ok,
  );
  const errorRows = params.rows.filter((row) => !row.ok);
  const reservedSlugs = new Set<string>();
  const guardianCache = new Map<string, string>();

  let created = 0;
  let updated = 0;
  let guardiansCreated = 0;
  let guardiansReused = 0;
  let guardianLinksCreated = 0;
  let studentPortalsCreated = 0;
  let guardianPortalsCreated = 0;
  const rowResults: StudentImportRowResult[] = [];

  for (const row of errorRows) {
    rowResults.push({
      excelRow: row.excelRow,
      studentName: `${row.data.firstName ?? ""} ${row.data.lastName ?? ""}`.trim(),
      studentMobile: null,
      guardianName: null,
      guardianMobile: null,
      guardianRelation: null,
      studentStatus: "خطا",
      guardianStatus: "none",
      studentPortalStatus: "none",
      guardianPortalStatus: "none",
      warnings: [],
      error: row.error,
    });
  }

  for (const row of okRows) {
    if (row.classification === "duplicate_skip") {
      rowResults.push({
        excelRow: row.excelRow,
        studentName: row.fullName,
        studentMobile: row.studentMobile,
        guardianName:
          row.guardianFirstName && row.guardianLastName
            ? `${row.guardianFirstName} ${row.guardianLastName}`
            : null,
        guardianMobile: row.guardianMobile,
        guardianRelation: row.guardianRelation,
        studentStatus: "رد شده (تکراری)",
        guardianStatus: "none",
        studentPortalStatus: "none",
        guardianPortalStatus: "none",
        warnings: row.warning ? [row.warning] : [],
      });
      continue;
    }

    const warnings: string[] = row.warning ? [row.warning] : [];
    let guardianStatus: GuardianImportStatus = "none";
    let studentPortalStatus: PortalImportStatus = "none";
    let guardianPortalStatus: PortalImportStatus = "none";
    let deltaCreated = 0;
    let deltaUpdated = 0;
    let deltaGuardiansCreated = 0;
    let deltaGuardiansReused = 0;
    let deltaLinks = 0;
    let deltaStudentPortals = 0;
    let deltaGuardianPortals = 0;
    let studentStatus = "رد شده";

    try {
      await prisma.$transaction(async (tx) => {
        const db = tx as unknown as typeof prisma;
        let studentId = row.existingStudentId;
        studentStatus = "به‌روزرسانی شد";

        if (row.classification === "create") {
          const slug = await allocateUniqueSlug(
            params.organizationId,
            row.slug,
            undefined,
            reservedSlugs,
          );
          const createdStudent = await db.student.create({
            data: {
              organizationId: params.organizationId,
              firstName: row.firstName,
              lastName: row.lastName,
              fullName: row.fullName,
              gradeId: row.gradeId,
              majorId: row.majorId,
              slug,
              kanoonStudentId: row.kanoonStudentId,
              parentName: row.parentName,
              schoolYear: row.schoolYear,
              biography: row.biography,
              isActive: row.isActive,
              isFeatured: row.isFeatured,
              displayOrder: row.displayOrder,
              featuredPriority: 0,
            },
            select: { id: true },
          });
          studentId = createdStudent.id;
          studentStatus = "ایجاد شد";
          deltaCreated = 1;
        } else if (row.classification === "update" && studentId) {
          await db.student.update({
            where: { id: studentId },
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              fullName: row.fullName,
              gradeId: row.gradeId,
              majorId: row.majorId,
              kanoonStudentId: row.kanoonStudentId,
              parentName: row.parentName,
              schoolYear: row.schoolYear,
              biography: row.biography,
              isActive: row.isActive,
              isFeatured: row.isFeatured,
              displayOrder: row.displayOrder,
            },
          });
          deltaUpdated = 1;
        }

        if (!studentId) {
          throw new Error("شناسه دانش‌آموز نامعتبر است.");
        }

        if (
          params.canManagePortal &&
          row.guardianMobile &&
          row.guardianFirstName &&
          row.guardianLastName
        ) {
          const relationType =
            (row.guardianRelation as GuardianRelationshipType | null) ??
            GuardianRelationshipType.GUARDIAN;

          let guardianId = guardianCache.get(row.guardianMobile);
          if (!guardianId) {
            const guardian = await findOrCreateGuardianByMobile(
              {
                organizationId: params.organizationId,
                firstName: row.guardianFirstName,
                lastName: row.guardianLastName,
                normalizedMobile: row.guardianMobile,
                relationshipType: relationType,
                allowProfileUpdate: false,
              },
              db,
            );
            guardianId = guardian.guardianId;
            guardianCache.set(row.guardianMobile, guardianId);
            if (guardian.created) {
              deltaGuardiansCreated = 1;
              guardianStatus = "new";
            } else {
              deltaGuardiansReused = 1;
              guardianStatus = guardian.warning
                ? "conflict_warning"
                : "existing";
            }
            if (guardian.warning) warnings.push(guardian.warning);
          } else {
            deltaGuardiansReused = 1;
            guardianStatus = "existing";
          }

          const link = await ensureGuardianStudentRelation(
            {
              organizationId: params.organizationId,
              studentId,
              guardianId,
              relationshipType: relationType,
            },
            db,
          );
          if (link.created || link.restored) {
            deltaLinks = 1;
            guardianStatus = guardianStatus === "new" ? "new" : "linked";
          } else {
            guardianStatus = "already_linked";
          }

          const portal = await ensurePortalAccessLink(
            {
              organizationId: params.organizationId,
              accountType: PortalAccountType.GUARDIAN,
              normalizedMobile: row.guardianMobile,
              firstName: row.guardianFirstName,
              lastName: row.guardianLastName,
              guardianId,
            },
            db,
          );
          if (!portal.ok) {
            guardianPortalStatus = "failed";
            warnings.push(portal.error);
          } else if (portal.alreadyExisted) {
            guardianPortalStatus = "existing";
          } else if (portal.created) {
            guardianPortalStatus = "created";
            deltaGuardianPortals = 1;
          } else {
            guardianPortalStatus = "restored";
            deltaGuardianPortals = 1;
          }
        } else if (row.guardianMobile) {
          guardianStatus = "skipped_no_permission";
          guardianPortalStatus = "skipped_no_permission";
        }

        if (params.canManagePortal && row.studentMobile) {
          const portal = await ensurePortalAccessLink(
            {
              organizationId: params.organizationId,
              accountType: PortalAccountType.STUDENT,
              normalizedMobile: row.studentMobile,
              firstName: row.firstName,
              lastName: row.lastName,
              studentId,
            },
            db,
          );
          if (!portal.ok) {
            studentPortalStatus = "failed";
            warnings.push(portal.error);
          } else if (portal.alreadyExisted) {
            studentPortalStatus = "existing";
          } else if (portal.created) {
            studentPortalStatus = "created";
            deltaStudentPortals = 1;
          } else {
            studentPortalStatus = "restored";
            deltaStudentPortals = 1;
          }
        } else if (row.studentMobile) {
          studentPortalStatus = "skipped_no_permission";
        } else {
          studentPortalStatus = "skipped_no_mobile";
        }

        rowResults.push({
          excelRow: row.excelRow,
          studentName: row.fullName,
          studentMobile: row.studentMobile,
          guardianName:
            row.guardianFirstName && row.guardianLastName
              ? `${row.guardianFirstName} ${row.guardianLastName}`
              : null,
          guardianMobile: row.guardianMobile,
          guardianRelation: row.guardianRelation,
          studentStatus,
          guardianStatus,
          studentPortalStatus,
          guardianPortalStatus,
          warnings,
        });
      });

      created += deltaCreated;
      updated += deltaUpdated;
      guardiansCreated += deltaGuardiansCreated;
      guardiansReused += deltaGuardiansReused;
      guardianLinksCreated += deltaLinks;
      studentPortalsCreated += deltaStudentPortals;
      guardianPortalsCreated += deltaGuardianPortals;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطا در واردسازی ردیف.";
      rowResults.push({
        excelRow: row.excelRow,
        studentName: row.fullName,
        studentMobile: row.studentMobile,
        guardianName:
          row.guardianFirstName && row.guardianLastName
            ? `${row.guardianFirstName} ${row.guardianLastName}`
            : null,
        guardianMobile: row.guardianMobile,
        guardianRelation: row.guardianRelation,
        studentStatus: "خطا در نوشتن",
        guardianStatus: "none",
        studentPortalStatus: "failed",
        guardianPortalStatus: "failed",
        warnings,
        error: message,
      });
    }
  }

  rowResults.sort((a, b) => a.excelRow - b.excelRow);

  return {
    totalRows: params.rows.length,
    validRows: okRows.length,
    invalidRows: errorRows.length,
    created,
    updated,
    skipped: okRows.filter((row) => row.classification === "duplicate_skip")
      .length,
    duplicateRows: okRows.filter(
      (row) => row.classification === "duplicate_skip",
    ).length,
    guardiansCreated,
    guardiansReused,
    guardianLinksCreated,
    studentPortalsCreated,
    guardianPortalsCreated,
    errors: [
      ...errorRows.map((row) => ({
        excelRow: row.excelRow,
        error: row.error,
        column: row.column,
        value: row.value,
      })),
      ...rowResults
        .filter((row) => row.error)
        .map((row) => ({
          excelRow: row.excelRow,
          error: row.error!,
        })),
    ],
    rowResults,
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
    "شناسه قلم‌چی",
    "شماره موبایل دانش‌آموز",
    "نام ولی",
    "نام خانوادگی ولی",
    "شماره موبایل ولی",
    "نسبت با دانش‌آموز",
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
    "00123456",
    "09121234567",
    "رضا",
    "محمدی",
    "09120001122",
    "پدر",
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
  guide.addRow(["نام", "بله", "حداکثر ۸۰ نویسه"]);
  guide.addRow(["نام خانوادگی", "بله", "حداکثر ۸۰ نویسه"]);
  guide.addRow(["پایه", "بله", "نام یا اسلاگ پایه فعال"]);
  guide.addRow([
    "رشته",
    "دهم تا دوازدهم",
    "نام یا اسلاگ رشته؛ برای سایر پایه‌ها اختیاری",
  ]);
  guide.addRow(["اسلاگ", "پیشنهادی", "کلید تشخیص تکراری دانش‌آموز"]);
  guide.addRow([
    "شناسه قلم‌چی",
    "خیر (پیشنهادی برای آزمون)",
    "شمارنده قلم‌چی؛ فقط رقم؛ صفر اول حفظ می‌شود؛ یکتا در سازمان",
  ]);
  guide.addRow([
    "شماره موبایل دانش‌آموز",
    "خیر",
    "برای OTP دانش‌آموز؛ فرمت نهایی ۰۹xxxxxxxxx",
  ]);
  guide.addRow(["نام ولی / نام خانوادگی ولی / موبایل ولی", "با هم", "برای ساخت ولی پرتال"]);
  guide.addRow([
    "نسبت با دانش‌آموز",
    "خیر",
    "پدر، مادر، ولی، سایر (پیش‌فرض: ولی)",
  ]);
  guide.addRow([]);
  guide.addRow([
    "موبایل",
    "",
    "نمونه: 09121234567 ، 9121234567 ، +989121234567 ، ارقام فارسی",
  ]);
  guide.addRow([
    "خواهر/برادر",
    "",
    "یک موبایل ولی می‌تواند برای چند دانش‌آموز تکرار شود؛ یک رکورد ولی ساخته می‌شود.",
  ]);
  guide.addRow([
    "پرتال",
    "",
    "OTP هنگام ورود ارسال می‌شود؛ در واردسازی پیامک ارسال نمی‌شود. نیاز به مجوز students.portal.manage.",
  ]);
  guide.addRow([]);
  guide.addRow(["پایه‌های فعال"]);
  for (const grade of grades) guide.addRow([grade.name, grade.slug]);
  guide.addRow([]);
  guide.addRow(["رشته‌های فعال"]);
  for (const major of majors) guide.addRow([major.name, major.slug]);
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
    "شناسه قلم‌چی",
    "موبایل دانش‌آموز",
    "موبایل ولی",
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
      row.data.kanoonStudentIdRaw ?? "",
      row.data.studentMobileRaw ?? "",
      row.data.guardianMobileRaw ?? "",
    ]);
  }
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
  const summary = workbook.addWorksheet("خلاصه");
  summary.addRow(["گزارش ورود گروهی دانش‌آموزان"]);
  summary.addRow(["نام فایل", params.filename]);
  summary.addRow(["واردکننده", params.importedBy]);
  summary.addRow(["سازمان", params.organizationName]);
  summary.addRow(["شروع", params.startedAt.toISOString()]);
  summary.addRow(["پایان", params.finishedAt.toISOString()]);
  summary.addRow(["کل", params.result.totalRows]);
  summary.addRow(["ایجاد دانش‌آموز", params.result.created]);
  summary.addRow(["به‌روزرسانی", params.result.updated]);
  summary.addRow(["رد تکراری", params.result.skipped]);
  summary.addRow(["ولی جدید", params.result.guardiansCreated]);
  summary.addRow(["ولی بازاستفاده", params.result.guardiansReused]);
  summary.addRow(["ارتباط ولی", params.result.guardianLinksCreated]);
  summary.addRow(["پرتال دانش‌آموز", params.result.studentPortalsCreated]);
  summary.addRow(["پرتال ولی", params.result.guardianPortalsCreated]);

  const detail = workbook.addWorksheet("جزئیات");
  detail.addRow([
    "ردیف",
    "دانش‌آموز",
    "موبایل دانش‌آموز",
    "ولی",
    "موبایل ولی",
    "نسبت",
    "وضعیت دانش‌آموز",
    "وضعیت ولی",
    "پرتال دانش‌آموز",
    "پرتال ولی",
    "هشدارها",
    "خطا",
  ]);
  detail.getRow(1).font = { bold: true };
  for (const row of params.result.rowResults) {
    detail.addRow([
      row.excelRow,
      row.studentName,
      row.studentMobile ?? "",
      row.guardianName ?? "",
      row.guardianMobile ?? "",
      row.guardianRelation ?? "",
      row.studentStatus,
      row.guardianStatus,
      row.studentPortalStatus,
      row.guardianPortalStatus,
      row.warnings.join(" | "),
      row.error ?? "",
    ]);
  }
  return workbook;
}
