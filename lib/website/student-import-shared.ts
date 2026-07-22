/**
 * Client-safe Student bulk-import constants and types.
 * Keep Node/ExcelJS/Prisma out of this module.
 */

export const STUDENT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const STUDENT_IMPORT_MAX_ROWS = 5000;
export const STUDENT_IMPORT_PREVIEW_LIMIT = 80;

export const STUDENT_IMPORT_ALLOWED_EXTENSIONS = [".xlsx", ".csv"] as const;

export const STUDENT_IMPORT_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
] as const;

export const STUDENT_IMPORT_FIELDS = [
  "IGNORE",
  "firstName",
  "lastName",
  "grade",
  "major",
  "slug",
  "parentName",
  "schoolYear",
  "biography",
  "isActive",
  "isFeatured",
  "displayOrder",
] as const;

export type StudentImportField = (typeof STUDENT_IMPORT_FIELDS)[number];

export type StudentColumnMapping = Record<string, StudentImportField>;

export type StudentImportMode = "create_only" | "create_and_update";

export type StudentWorkbookInspection = {
  sheets: string[];
  selectedSheet: string;
  headerRowNumber: number;
  headers: Array<{
    column: number;
    label: string;
    suggestedField: StudentImportField;
  }>;
  previewRows: string[][];
  rowCount: number;
};

export type ParsedStudentImportRow = {
  excelRow: number;
  firstName?: string;
  lastName?: string;
  grade?: string;
  major?: string;
  slug?: string;
  parentName?: string;
  schoolYear?: string;
  biography?: string;
  isActiveRaw?: string;
  isFeaturedRaw?: string;
  displayOrderRaw?: string;
};

export type StudentImportRowClassification =
  | "create"
  | "update"
  | "duplicate_skip"
  | "error";

export type ValidatedStudentImportRow =
  | {
      ok: true;
      excelRow: number;
      classification: Exclude<StudentImportRowClassification, "error">;
      existingStudentId?: string;
      firstName: string;
      lastName: string;
      fullName: string;
      gradeId: string;
      gradeName: string;
      majorId: string | null;
      majorName: string | null;
      slug: string;
      parentName: string | null;
      schoolYear: string | null;
      biography: string;
      isActive: boolean;
      isFeatured: boolean;
      displayOrder: number;
      warning?: string;
      data: ParsedStudentImportRow;
    }
  | {
      ok: false;
      excelRow: number;
      classification: "error";
      error: string;
      column?: string;
      value?: string;
      data: ParsedStudentImportRow;
    };

export type StudentImportResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  updated: number;
  skipped: number;
  duplicateRows: number;
  errors: Array<{
    excelRow: number;
    error: string;
    column?: string;
    value?: string;
  }>;
};

export function isAllowedStudentImportFile(file: {
  name?: string;
  type?: string;
  size: number;
}): { ok: true } | { ok: false; reason: "FILE_TOO_LARGE" | "INVALID_TYPE" } {
  if (file.size > STUDENT_IMPORT_MAX_BYTES) {
    return { ok: false, reason: "FILE_TOO_LARGE" };
  }
  const name = (file.name || "").toLowerCase();
  const extOk = STUDENT_IMPORT_ALLOWED_EXTENSIONS.some((ext) =>
    name.endsWith(ext),
  );
  const mime = (file.type || "").toLowerCase();
  const mimeOk =
    !mime ||
    (STUDENT_IMPORT_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
  if (!extOk && !mimeOk) {
    return { ok: false, reason: "INVALID_TYPE" };
  }
  if (!extOk) {
    return { ok: false, reason: "INVALID_TYPE" };
  }
  return { ok: true };
}

export const STUDENT_IMPORT_FIELD_LABELS: Record<StudentImportField, string> = {
  IGNORE: "نادیده گرفتن",
  firstName: "نام",
  lastName: "نام خانوادگی",
  grade: "پایه",
  major: "رشته",
  slug: "اسلاگ",
  parentName: "نام ولی (متن آزاد)",
  schoolYear: "سال تحصیلی",
  biography: "توضیحات",
  isActive: "وضعیت",
  isFeatured: "ویژه",
  displayOrder: "ترتیب نمایش",
};
