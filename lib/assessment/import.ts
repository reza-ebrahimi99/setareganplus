/**
 * Reusable Assessment result import pipeline.
 * Steps: Upload → Column Mapping → Validation → Preview → Import
 *
 * Default import mode is all-or-nothing inside a Prisma transaction.
 * Client UI must import types/constants from `import-shared.ts` only.
 *
 * Future: import history / audit table can record batch checksums without
 * changing this public API (document only — not implemented this sprint).
 */

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { AssessmentImportError } from "@/lib/assessment/import-errors";
import { logServerError, logServerInfo } from "@/lib/observability/server-log";
import { normalizeKanoonStudentId } from "@/lib/website/kanoon-student-id";
import {
  ASSESSMENT_IMPORT_MAX_BYTES,
  isAllowedAssessmentImportFile,
  isValidNonNegative,
  isValidPercentage,
  isValidRank,
  type AssessmentColumnMapping,
  type AssessmentImportField,
  type AssessmentImportResult,
  type AssessmentStudentMatchMethod,
  type ParsedImportRow,
  type ValidatedImportRow,
  type WorkbookInspection,
} from "@/lib/assessment/import-shared";

export {
  ASSESSMENT_IMPORT_FIELDS,
  ASSESSMENT_IMPORT_MAX_BYTES,
  ASSESSMENT_IMPORT_ALLOWED_EXTENSIONS,
  ASSESSMENT_IMPORT_ALLOWED_MIME_TYPES,
  isAllowedAssessmentImportFile,
  isValidNonNegative,
  isValidPercentage,
  isValidRank,
  type AssessmentColumnMapping,
  type AssessmentImportField,
  type AssessmentImportResult,
  type AssessmentStudentMatchMethod,
  type ParsedImportRow,
  type ValidatedImportRow,
  type WorkbookInspection,
} from "@/lib/assessment/import-shared";

const FIELD_ALIASES: Record<string, AssessmentImportField> = {
  counter: "kanoonStudentId",
  شمارنده: "kanoonStudentId",
  "شناسه قلم‌چی": "kanoonStudentId",
  "کد قلم‌چی": "kanoonStudentId",
  "kanoon id": "kanoonStudentId",
  "kanoon student id": "kanoonStudentId",
  kanoonstudentid: "kanoonStudentId",
  kanoon: "kanoonStudentId",
  slug: "studentSlug",
  "student slug": "studentSlug",
  اسلاگ: "studentSlug",
  "نام کامل": "fullName",
  fullname: "fullName",
  name: "fullName",
  نام: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  "نام خانوادگی": "lastName",
  lastname: "lastName",
  "last name": "lastName",
  score: "score",
  نمره: "score",
  تراز: "scaledScore",
  scaled: "scaledScore",
  "رتبه مدرسه": "rankSchool",
  "رتبه شهر": "rankCity",
  "رتبه استان": "rankProvince",
  "رتبه کشور": "rankCountry",
  percentile: "percentile",
  درصد: "percentile",
  growth: "growth",
  رشد: "growth",
};

function suggestField(label: string): AssessmentImportField {
  const key = label.trim().toLocaleLowerCase("fa");
  return FIELD_ALIASES[key] ?? "IGNORE";
}

export function parseImportNumber(raw: string): number | null {
  const normalized = toLatinDigits(raw)
    .trim()
    .replace(/,/g, "")
    .replace(/\u066C/g, "") // Arabic thousands separator
    .replace(/\u066B/g, ".") // Arabic decimal separator
    .replace(/٫/g, ".")
    .replace(/٬/g, "");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseBool(raw: string): boolean {
  const value = toLatinDigits(raw).trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "بله";
}

function assertAllowedFile(file: File): void {
  const check = isAllowedAssessmentImportFile(file);
  if (!check.ok) {
    if (check.reason === "FILE_TOO_LARGE") {
      throw new AssessmentImportError(
        "FILE_TOO_LARGE",
        "حجم فایل نباید بیشتر از ۵ مگابایت باشد.",
      );
    }
    throw new AssessmentImportError(
      "INVALID_MIME",
      "فقط فایل‌های Excel یا CSV مجاز هستند.",
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
    throw new AssessmentImportError(
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
    throw new AssessmentImportError(
      "HEADER_NOT_FOUND",
      "ردیف عنوان یافت نشد.",
    );
  }
  return found;
}

export async function inspectAssessmentImportFile(
  file: File,
  sheetName?: string,
): Promise<WorkbookInspection> {
  const workbook = await loadWorkbook(file);
  const sheets = workbook.worksheets.map((sheet) => sheet.name);
  if (sheets.length === 0) {
    throw new AssessmentImportError(
      "EMPTY_WORKBOOK",
      "فایل کاربرگ معتبری ندارد.",
    );
  }

  const selectedSheet =
    sheetName && sheets.includes(sheetName) ? sheetName : sheets[0]!;
  const worksheet = workbook.getWorksheet(selectedSheet);
  if (!worksheet) {
    throw new AssessmentImportError(
      "SHEET_NOT_FOUND",
      "برگه انتخاب‌شده یافت نشد.",
    );
  }

  const headerRow = findHeaderRow(worksheet);
  const headers: WorkbookInspection["headers"] = [];
  headerRow.eachCell(
    { includeEmpty: false },
    (cell: ExcelJS.Cell, colNumber: number) => {
      const label = String(cell.text || cell.value || "").trim();
      if (!label) return;
      headers.push({
        column: colNumber,
        label,
        suggestedField: suggestField(label),
      });
    },
  );

  const previewRows: string[][] = [];
  let rowCount = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow.number) return;
    const values = headers.map((header) => {
      const cell = row.getCell(header.column);
      return String(cell.text || cell.value || "").trim();
    });
    if (values.every((value) => !value)) return;
    rowCount += 1;
    if (previewRows.length < 8) previewRows.push(values);
  });

  return {
    sheets,
    selectedSheet,
    headerRowNumber: headerRow.number,
    headers,
    previewRows,
    rowCount,
  };
}

function mapRow(
  values: Record<number, string>,
  mapping: AssessmentColumnMapping,
): ParsedImportRow {
  const data: ParsedImportRow = { excelRow: 0, subjects: [] };
  const subjectBuckets = new Map<
    string,
    ParsedImportRow["subjects"][number]
  >();

  for (const [column, field] of Object.entries(mapping)) {
    const raw = values[Number(column)] ?? "";
    if (!field || field === "IGNORE" || !raw.trim()) continue;

    if (field.startsWith("subject:")) {
      const subjectId = field.slice("subject:".length);
      const bucket = subjectBuckets.get(subjectId) ?? { subjectId };
      bucket.percentage = parseImportNumber(raw);
      subjectBuckets.set(subjectId, bucket);
      continue;
    }

    switch (field as AssessmentImportField) {
      case "kanoonStudentId":
        data.kanoonStudentId = raw.trim();
        break;
      case "studentSlug":
        data.studentSlug = raw.trim();
        break;
      case "fullName":
        data.fullName = raw.trim();
        break;
      case "firstName":
        data.firstName = raw.trim();
        break;
      case "lastName":
        data.lastName = raw.trim();
        break;
      case "score":
        data.score = parseImportNumber(raw);
        break;
      case "scaledScore":
        data.scaledScore = parseImportNumber(raw);
        break;
      case "rankSchool":
        data.rankSchool = parseImportNumber(raw);
        break;
      case "rankCity":
        data.rankCity = parseImportNumber(raw);
        break;
      case "rankProvince":
        data.rankProvince = parseImportNumber(raw);
        break;
      case "rankCountry":
        data.rankCountry = parseImportNumber(raw);
        break;
      case "percentile":
        data.percentile = parseImportNumber(raw);
        break;
      case "growth":
        data.growth = parseImportNumber(raw);
        break;
      case "averageClass":
        data.averageClass = parseImportNumber(raw);
        break;
      case "averageGrade":
        data.averageGrade = parseImportNumber(raw);
        break;
      case "notes":
        data.notes = raw.trim().slice(0, 2000);
        break;
      case "isFeatured":
        data.isFeatured = parseBool(raw);
        break;
      default:
        break;
    }
  }

  data.subjects = Array.from(subjectBuckets.values());
  return data;
}

export async function parseAssessmentImportFile(
  file: File,
  mapping: AssessmentColumnMapping,
  sheetName?: string,
): Promise<ParsedImportRow[]> {
  const inspection = await inspectAssessmentImportFile(file, sheetName);
  const workbook = await loadWorkbook(file);
  const worksheet = workbook.getWorksheet(inspection.selectedSheet);
  if (!worksheet) {
    throw new AssessmentImportError(
      "SHEET_NOT_FOUND",
      "برگه انتخاب‌شده یافت نشد.",
    );
  }

  const headerRowNumber = inspection.headerRowNumber;
  const rows: ParsedImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const values: Record<number, string> = {};
    let empty = true;
    for (const header of inspection.headers) {
      const cell = row.getCell(header.column);
      const text = String(cell.text || cell.value || "").trim();
      values[header.column] = text;
      if (text) empty = false;
    }
    if (empty) return;
    const mapped = mapRow(values, mapping);
    mapped.excelRow = rowNumber;
    rows.push(mapped);
  });

  return rows;
}

function rangeError(row: ParsedImportRow): string | null {
  if (!isValidPercentage(row.percentile)) {
    return "صدک باید بین ۰ تا ۱۰۰ باشد.";
  }
  for (const subject of row.subjects) {
    if (!isValidPercentage(subject.percentage)) {
      return "درصد درس باید بین ۰ تا ۱۰۰ باشد.";
    }
    if (
      !isValidNonNegative(subject.correctAnswers) ||
      !isValidNonNegative(subject.wrongAnswers) ||
      !isValidNonNegative(subject.blankAnswers)
    ) {
      return "تعداد پاسخ‌ها نمی‌تواند منفی باشد.";
    }
  }
  for (const [label, value] of [
    ["رتبه مدرسه", row.rankSchool],
    ["رتبه شهر", row.rankCity],
    ["رتبه استان", row.rankProvince],
    ["رتبه کشور", row.rankCountry],
  ] as const) {
    if (!isValidRank(value)) {
      return `${label} باید عدد صحیح بزرگ‌تر از صفر باشد.`;
    }
  }
  if (
    !isValidNonNegative(row.score) ||
    !isValidNonNegative(row.scaledScore) ||
    !isValidNonNegative(row.averageClass) ||
    !isValidNonNegative(row.averageGrade)
  ) {
    return "نمره و میانگین نمی‌توانند منفی باشند.";
  }
  return null;
}

export async function validateAssessmentImportRows(params: {
  organizationId: string;
  assessmentId: string;
  rows: ParsedImportRow[];
}): Promise<ValidatedImportRow[]> {
  if (!params.organizationId.trim()) {
    throw new AssessmentImportError(
      "INVALID_ARGUMENT",
      "شناسه سازمان نامعتبر است.",
    );
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: params.assessmentId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, gradeId: true },
  });
  if (!assessment) {
    throw new AssessmentImportError(
      "ASSESSMENT_NOT_FOUND",
      "آزمون یافت نشد.",
    );
  }

  const subjectIds = Array.from(
    new Set(
      params.rows.flatMap((row) =>
        row.subjects.map((subject) => subject.subjectId),
      ),
    ),
  );

  const [students, subjects, existingResults] = await Promise.all([
    prisma.student.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        fullName: true,
        firstName: true,
        lastName: true,
        gradeId: true,
        kanoonStudentId: true,
      },
    }),
    subjectIds.length > 0
      ? prisma.subject.findMany({
          where: {
            organizationId: params.organizationId,
            id: { in: subjectIds },
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
    prisma.assessmentResult.findMany({
      where: {
        organizationId: params.organizationId,
        assessmentId: assessment.id,
      },
      select: { studentId: true, deletedAt: true },
    }),
  ]);

  const allowedSubjects = new Set(subjects.map((subject) => subject.id));
  const byKanoon = new Map<string, (typeof students)[number]>();
  for (const student of students) {
    if (student.kanoonStudentId) {
      byKanoon.set(student.kanoonStudentId, student);
    }
  }
  const bySlug = new Map(
    students.map((student) => [student.slug.toLowerCase(), student]),
  );

  const nameGradeCounts = new Map<string, number>();
  const byNameGrade = new Map<string, (typeof students)[number]>();
  const fullNameCounts = new Map<string, number>();
  const byFullName = new Map<string, (typeof students)[number]>();
  for (const student of students) {
    const nameKey = `${student.firstName.trim().toLocaleLowerCase("fa")}|${student.lastName.trim().toLocaleLowerCase("fa")}|${student.gradeId}`;
    nameGradeCounts.set(nameKey, (nameGradeCounts.get(nameKey) ?? 0) + 1);
    byNameGrade.set(nameKey, student);

    const fullKey = student.fullName.trim().toLocaleLowerCase("fa");
    fullNameCounts.set(fullKey, (fullNameCounts.get(fullKey) ?? 0) + 1);
    byFullName.set(fullKey, student);
  }

  const existingByStudent = new Map(
    existingResults.map((row) => [row.studentId, row]),
  );

  const preliminary = params.rows.map((row): ValidatedImportRow => {
    const range = rangeError(row);
    if (range) {
      return {
        ok: false,
        excelRow: row.excelRow,
        error: range,
        data: row,
        code: "RANGE",
      };
    }

    for (const subject of row.subjects) {
      if (!allowedSubjects.has(subject.subjectId)) {
        return {
          ok: false,
          excelRow: row.excelRow,
          error: "درس انتخاب‌شده در این سازمان معتبر نیست.",
          data: row,
          code: "SUBJECT_SCOPE",
        };
      }
    }

    let student: (typeof students)[number] | null = null;
    let matchedBy: AssessmentStudentMatchMethod | null = null;
    let rowKanoonId: string | null = null;

    if (row.kanoonStudentId?.trim()) {
      const parsed = normalizeKanoonStudentId(row.kanoonStudentId);
      if (!parsed.ok) {
        return {
          ok: false,
          excelRow: row.excelRow,
          error: parsed.error,
          data: row,
          code: "INVALID_KANOON_ID",
          matchedBy: "not_found",
          kanoonStudentId: row.kanoonStudentId.trim(),
        };
      }
      rowKanoonId = parsed.value;
      if (rowKanoonId) {
        student = byKanoon.get(rowKanoonId) ?? null;
        if (student) {
          matchedBy = "kanoon";
        }
      }
    }

    if (!student) {
      const firstName = row.firstName?.trim() ?? "";
      const lastName = row.lastName?.trim() ?? "";
      if (firstName && lastName) {
        const nameKey = `${firstName.toLocaleLowerCase("fa")}|${lastName.toLocaleLowerCase("fa")}|${assessment.gradeId}`;
        if ((nameGradeCounts.get(nameKey) ?? 0) > 1) {
          return {
            ok: false,
            excelRow: row.excelRow,
            error:
              "نام و نام خانوادگی در این پایه مبهم است؛ شناسه قلم‌چی یا اسلاگ وارد کنید.",
            data: row,
            code: "AMBIGUOUS_NAME",
            matchedBy: "not_found",
            kanoonStudentId: rowKanoonId,
          };
        }
        const hit = byNameGrade.get(nameKey);
        if (hit && hit.gradeId === assessment.gradeId) {
          student = hit;
          matchedBy = "name_grade";
        }
      }
    }

    if (!student && row.studentSlug) {
      student = bySlug.get(row.studentSlug.toLowerCase()) ?? null;
      if (student) matchedBy = "slug";
    }

    if (!student) {
      const fullName =
        row.fullName?.trim() ||
        [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
      if (fullName) {
        const key = fullName.toLocaleLowerCase("fa");
        if ((fullNameCounts.get(key) ?? 0) > 1) {
          return {
            ok: false,
            excelRow: row.excelRow,
            error: "نام دانش‌آموز مبهم است؛ از شناسه قلم‌چی یا اسلاگ استفاده کنید.",
            data: row,
            code: "AMBIGUOUS_NAME",
            matchedBy: "not_found",
            kanoonStudentId: rowKanoonId,
          };
        }
        student = byFullName.get(key) ?? null;
        if (student) matchedBy = "name";
      }
    }

    if (!student || !matchedBy) {
      return {
        ok: false,
        excelRow: row.excelRow,
        error: "دانش‌آموز متناظر یافت نشد.",
        data: row,
        code: "STUDENT_NOT_FOUND",
        matchedBy: "not_found",
        kanoonStudentId: rowKanoonId,
      };
    }

    if (
      row.score == null &&
      row.scaledScore == null &&
      row.subjects.length === 0
    ) {
      return {
        ok: false,
        excelRow: row.excelRow,
        error: "حداقل یک نمره یا نتیجه درس لازم است.",
        data: row,
        code: "MISSING_SCORE",
        kanoonStudentId: rowKanoonId ?? student.kanoonStudentId,
      };
    }

    const existing = existingByStudent.get(student.id);
    return {
      ok: true,
      excelRow: row.excelRow,
      studentId: student.id,
      studentName: student.fullName,
      kanoonStudentId: student.kanoonStudentId,
      matchedBy,
      data: row,
      restoresSoftDeleted: Boolean(existing?.deletedAt),
    };
  });

  const seenStudents = new Map<string, number>();
  return preliminary.map((row) => {
    if (!row.ok) return row;
    const prior = seenStudents.get(row.studentId);
    if (prior != null) {
      return {
        ok: false,
        excelRow: row.excelRow,
        error: `ردیف تکراری برای همین دانش‌آموز (هم‌پوشانی با ردیف ${prior}).`,
        data: row.data,
        code: "DUPLICATE_IN_FILE",
      };
    }
    seenStudents.set(row.studentId, row.excelRow);
    return row;
  });
}

export async function importAssessmentResults(params: {
  organizationId: string;
  assessmentId: string;
  rows: ValidatedImportRow[];
  /** When true (default), commit all valid rows in one transaction or none. */
  allOrNothing?: boolean;
}): Promise<AssessmentImportResult> {
  const allOrNothing = params.allOrNothing !== false;
  const totalRows = params.rows.length;
  const validRows = params.rows.filter((row) => row.ok);
  const invalidRows = params.rows.filter((row) => !row.ok);
  const duplicateRows = invalidRows.filter(
    (row) => !row.ok && row.code === "DUPLICATE_IN_FILE",
  ).length;

  const baseSummary = {
    totalRows,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    duplicateRows,
  };

  if (validRows.length === 0) {
    return {
      ...baseSummary,
      imported: 0,
      updated: 0,
      restored: 0,
      skipped: invalidRows.length,
      errors: invalidRows.map((row) => ({
        excelRow: row.excelRow,
        error: row.ok ? "نامشخص" : row.error,
      })),
    };
  }

  // allOrNothing (default): commit every valid row in one transaction, or none.
  // Invalid rows are reported as skipped and never written.
  void allOrNothing;

  try {
    const summary = await prisma.$transaction(async (tx) => {
      let imported = 0;
      let updated = 0;
      let restored = 0;

      const existing = await tx.assessmentResult.findMany({
        where: {
          organizationId: params.organizationId,
          assessmentId: params.assessmentId,
          studentId: { in: validRows.map((row) => row.studentId) },
        },
        select: { id: true, studentId: true, deletedAt: true },
      });
      const existingMap = new Map(
        existing.map((row) => [row.studentId, row]),
      );

      for (const row of validRows) {
        if (!row.ok) continue;

        const payload = {
          score: row.data.score ?? null,
          scaledScore: row.data.scaledScore ?? null,
          rankSchool: row.data.rankSchool ?? null,
          rankCity: row.data.rankCity ?? null,
          rankProvince: row.data.rankProvince ?? null,
          rankCountry: row.data.rankCountry ?? null,
          percentile: row.data.percentile ?? null,
          growth: row.data.growth ?? null,
          averageClass: row.data.averageClass ?? null,
          averageGrade: row.data.averageGrade ?? null,
          notes: row.data.notes ?? null,
          isFeatured: row.data.isFeatured ?? false,
          deletedAt: null as Date | null,
        };

        const prior = existingMap.get(row.studentId);
        let resultId: string;

        if (prior) {
          const updatedRow = await tx.assessmentResult.update({
            where: { id: prior.id },
            data: payload,
            select: { id: true },
          });
          resultId = updatedRow.id;
          if (prior.deletedAt) restored += 1;
          else updated += 1;
        } else {
          const created = await tx.assessmentResult.create({
            data: {
              organizationId: params.organizationId,
              assessmentId: params.assessmentId,
              studentId: row.studentId,
              ...payload,
            },
            select: { id: true },
          });
          resultId = created.id;
          imported += 1;
        }

        for (const subject of row.data.subjects) {
          await tx.assessmentSubjectResult.upsert({
            where: {
              assessmentResultId_subjectId: {
                assessmentResultId: resultId,
                subjectId: subject.subjectId,
              },
            },
            create: {
              assessmentResultId: resultId,
              subjectId: subject.subjectId,
              percentage: subject.percentage ?? null,
              correctAnswers: subject.correctAnswers ?? null,
              wrongAnswers: subject.wrongAnswers ?? null,
              blankAnswers: subject.blankAnswers ?? null,
            },
            update: {
              percentage: subject.percentage ?? null,
              correctAnswers: subject.correctAnswers ?? null,
              wrongAnswers: subject.wrongAnswers ?? null,
              blankAnswers: subject.blankAnswers ?? null,
            },
          });
        }
      }

      return { imported, updated, restored };
    });

    logServerInfo({
      module: "assessment.import",
      action: "importAssessmentResults",
      category: "import",
      organizationId: params.organizationId,
      recordId: params.assessmentId,
      meta: {
        imported: summary.imported,
        updated: summary.updated,
        restored: summary.restored,
        validRows: validRows.length,
      },
    });

    return {
      ...baseSummary,
      imported: summary.imported,
      updated: summary.updated,
      restored: summary.restored,
      skipped: invalidRows.length,
      errors: invalidRows.map((row) => ({
        excelRow: row.excelRow,
        error: row.ok ? "نامشخص" : row.error,
      })),
    };
  } catch (error) {
    logServerError(
      {
        module: "assessment.import",
        action: "importAssessmentResults",
        category: "import",
        organizationId: params.organizationId,
        recordId: params.assessmentId,
        message: "assessment_import_transaction_failed",
      },
      error,
    );
    if (error instanceof AssessmentImportError) throw error;
    throw new AssessmentImportError(
      "IMPORT_FAILED",
      "ورود نتایج انجام نشد؛ هیچ تغییری ذخیره نشد.",
    );
  }
}
