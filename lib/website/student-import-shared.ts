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
  "kanoonStudentId",
  "studentMobile",
  "guardianFirstName",
  "guardianLastName",
  "guardianMobile",
  "guardianRelation",
] as const;

export type StudentImportField = (typeof STUDENT_IMPORT_FIELDS)[number];

export type StudentColumnMapping = Record<string, StudentImportField>;

export type StudentImportMode = "create_only" | "create_and_update";

export type StudentWorkbookHeader = {
  column: number;
  label: string;
  suggestedField: StudentImportField;
};

/** Raw cells for one data row (column index → text). Serializable. */
export type StudentImportRawRow = {
  excelRow: number;
  values: Record<number, string>;
};

/** Parsed workbook session retained on the client after step 1. */
export type StudentImportSession = {
  filename: string;
  sheets: string[];
  selectedSheet: string;
  headerRowNumber: number;
  headers: StudentWorkbookHeader[];
  /** All data sheets keyed by sheet name (so sheet switch does not need File). */
  sheetsData: Record<
    string,
    {
      headerRowNumber: number;
      headers: StudentWorkbookHeader[];
      rows: StudentImportRawRow[];
    }
  >;
  parseWarnings: string[];
};

export type StudentWorkbookInspection = {
  sheets: string[];
  selectedSheet: string;
  headerRowNumber: number;
  headers: StudentWorkbookHeader[];
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
  kanoonStudentIdRaw?: string;
  studentMobileRaw?: string;
  guardianFirstName?: string;
  guardianLastName?: string;
  guardianMobileRaw?: string;
  guardianRelationRaw?: string;
};

export type StudentImportRowClassification =
  | "create"
  | "update"
  | "duplicate_skip"
  | "error";

export type GuardianImportStatus =
  | "none"
  | "new"
  | "existing"
  | "linked"
  | "already_linked"
  | "skipped_no_permission"
  | "skipped_incomplete"
  | "conflict_warning";

export type PortalImportStatus =
  | "none"
  | "created"
  | "existing"
  | "restored"
  | "skipped_no_permission"
  | "skipped_no_mobile"
  | "failed";

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
      kanoonStudentId: string | null;
      studentMobile: string | null;
      guardianFirstName: string | null;
      guardianLastName: string | null;
      guardianMobile: string | null;
      guardianRelation: string | null;
      guardianStatusPreview: GuardianImportStatus;
      studentPortalStatusPreview: PortalImportStatus;
      guardianPortalStatusPreview: PortalImportStatus;
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

export type StudentImportRowResult = {
  excelRow: number;
  studentName: string;
  studentMobile: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  guardianRelation: string | null;
  studentStatus: string;
  guardianStatus: GuardianImportStatus;
  studentPortalStatus: PortalImportStatus;
  guardianPortalStatus: PortalImportStatus;
  warnings: string[];
  error?: string;
};

export type StudentImportResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  created: number;
  updated: number;
  skipped: number;
  duplicateRows: number;
  guardiansCreated: number;
  guardiansReused: number;
  guardianLinksCreated: number;
  studentPortalsCreated: number;
  guardianPortalsCreated: number;
  errors: Array<{
    excelRow: number;
    error: string;
    column?: string;
    value?: string;
  }>;
  rowResults: StudentImportRowResult[];
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
  parentName: "نام ولی (متن آزاد CMS)",
  schoolYear: "سال تحصیلی",
  biography: "توضیحات",
  isActive: "وضعیت",
  isFeatured: "ویژه",
  displayOrder: "ترتیب نمایش",
  kanoonStudentId: "شناسه قلم‌چی",
  studentMobile: "شماره موبایل دانش‌آموز",
  guardianFirstName: "نام ولی",
  guardianLastName: "نام خانوادگی ولی",
  guardianMobile: "شماره موبایل ولی",
  guardianRelation: "نسبت با دانش‌آموز",
};
