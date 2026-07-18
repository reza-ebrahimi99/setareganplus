/**
 * Client-safe Assessment import constants and types.
 * Keep Node/ExcelJS/Prisma out of this module.
 */

export const ASSESSMENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export const ASSESSMENT_IMPORT_ALLOWED_EXTENSIONS = [
  ".xlsx",
  ".xls",
  ".csv",
] as const;

export const ASSESSMENT_IMPORT_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
] as const;

export const ASSESSMENT_IMPORT_FIELDS = [
  "IGNORE",
  "studentSlug",
  "fullName",
  "firstName",
  "lastName",
  "score",
  "scaledScore",
  "rankSchool",
  "rankCity",
  "rankProvince",
  "rankCountry",
  "percentile",
  "growth",
  "averageClass",
  "averageGrade",
  "notes",
  "isFeatured",
] as const;

export type AssessmentImportField = (typeof ASSESSMENT_IMPORT_FIELDS)[number];

export type AssessmentColumnMapping = Record<
  string,
  AssessmentImportField | string
>;

export type WorkbookInspection = {
  sheets: string[];
  selectedSheet: string;
  headerRowNumber: number;
  headers: Array<{
    column: number;
    label: string;
    suggestedField: AssessmentImportField;
  }>;
  previewRows: string[][];
  rowCount: number;
};

export type ParsedImportRow = {
  excelRow: number;
  studentSlug?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  score?: number | null;
  scaledScore?: number | null;
  rankSchool?: number | null;
  rankCity?: number | null;
  rankProvince?: number | null;
  rankCountry?: number | null;
  percentile?: number | null;
  growth?: number | null;
  averageClass?: number | null;
  averageGrade?: number | null;
  notes?: string | null;
  isFeatured?: boolean;
  subjects: Array<{
    subjectId: string;
    percentage?: number | null;
    correctAnswers?: number | null;
    wrongAnswers?: number | null;
    blankAnswers?: number | null;
  }>;
};

export type ValidatedImportRow =
  | {
      ok: true;
      excelRow: number;
      studentId: string;
      studentName: string;
      data: ParsedImportRow;
      isDuplicateInFile?: boolean;
      restoresSoftDeleted?: boolean;
    }
  | {
      ok: false;
      excelRow: number;
      error: string;
      data: ParsedImportRow;
      code?: string;
    };

export type AssessmentImportResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  imported: number;
  updated: number;
  restored: number;
  skipped: number;
  duplicateRows: number;
  errors: Array<{ excelRow: number; error: string }>;
};

/** Pure helpers exported for unit tests / client-safe reuse. */
export function isAllowedAssessmentImportFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; reason: "FILE_TOO_LARGE" | "INVALID_MIME" } {
  if (file.size > ASSESSMENT_IMPORT_MAX_BYTES) {
    return { ok: false, reason: "FILE_TOO_LARGE" };
  }
  const name = (file.name || "").toLowerCase();
  const hasExtension = ASSESSMENT_IMPORT_ALLOWED_EXTENSIONS.some((ext) =>
    name.endsWith(ext),
  );
  if (!hasExtension) return { ok: false, reason: "INVALID_MIME" };

  const mime = (file.type || "").toLowerCase().trim();
  if (
    mime &&
    !(ASSESSMENT_IMPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
  ) {
    return { ok: false, reason: "INVALID_MIME" };
  }
  return { ok: true };
}

export function isValidPercentage(value: number | null | undefined): boolean {
  if (value == null) return true;
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function isValidNonNegative(
  value: number | null | undefined,
): boolean {
  if (value == null) return true;
  return Number.isFinite(value) && value >= 0;
}

export function isValidRank(value: number | null | undefined): boolean {
  if (value == null) return true;
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1;
}
