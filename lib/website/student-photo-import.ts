/**
 * Bulk student photo import — client-safe types and pure helpers.
 * Filename → Kanoon ID: strip extension, drop non-digits, match Student.kanoonStudentId.
 */

import { toLatinDigits } from "@/lib/forms/latin-digits";

/** Max files accepted in one wizard session (client-side guard). */
export const STUDENT_PHOTO_IMPORT_MAX_FILES = 200;

/**
 * Files per Server Action call — stay under experimental.serverActions.bodySizeLimit (9mb)
 * with TEAM_PORTRAIT_MAX_BYTES = 2MB per file.
 */
export const STUDENT_PHOTO_IMPORT_BATCH_SIZE = 3;

export const STUDENT_PHOTO_IMPORT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const STUDENT_PHOTO_IMPORT_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type StudentPhotoImportPreviewStatus =
  | "matched"
  | "not_found"
  | "duplicate"
  | "invalid"
  | "already_has_photo";

export type StudentPhotoImportRowOutcome =
  | "imported"
  | "replaced"
  | "skipped"
  | "not_found"
  | "invalid"
  | "failed"
  | "duplicate";

export type StudentPhotoImportMatchedStudent = {
  id: string;
  fullName: string;
  gradeName: string;
  kanoonStudentId: string;
  hasPortrait: boolean;
};

export type StudentPhotoImportFileMeta = {
  /** Stable client key for batching / report rows */
  clientKey: string;
  filename: string;
  extractedId: string | null;
};

export type StudentPhotoImportPreviewRow = {
  clientKey: string;
  filename: string;
  extractedId: string | null;
  status: StudentPhotoImportPreviewStatus;
  student: StudentPhotoImportMatchedStudent | null;
};

export type StudentPhotoImportReport = {
  imported: number;
  replaced: number;
  skipped: number;
  notFound: number;
  invalid: number;
  failed: number;
};

export type StudentPhotoImportBatchItemResult = {
  clientKey: string;
  filename: string;
  outcome: StudentPhotoImportRowOutcome;
  error?: string;
};

export const STUDENT_PHOTO_IMPORT_STATUS_LABELS: Record<
  StudentPhotoImportPreviewStatus,
  string
> = {
  matched: "تطبیق‌شده",
  not_found: "یافت نشد",
  duplicate: "نام فایل تکراری",
  invalid: "نام فایل نامعتبر",
  already_has_photo: "دارای تصویر",
};

export const STUDENT_PHOTO_IMPORT_OUTCOME_LABELS: Record<
  StudentPhotoImportRowOutcome,
  string
> = {
  imported: "وارد شد",
  replaced: "جایگزین شد",
  skipped: "رد شد",
  not_found: "یافت نشد",
  invalid: "نامعتبر",
  failed: "ناموفق",
  duplicate: "تکراری",
};

export function emptyStudentPhotoImportReport(): StudentPhotoImportReport {
  return {
    imported: 0,
    replaced: 0,
    skipped: 0,
    notFound: 0,
    invalid: 0,
    failed: 0,
  };
}

export function accumulatePhotoImportOutcome(
  report: StudentPhotoImportReport,
  outcome: StudentPhotoImportRowOutcome,
): void {
  switch (outcome) {
    case "imported":
      report.imported += 1;
      break;
    case "replaced":
      report.replaced += 1;
      break;
    case "skipped":
    case "duplicate":
      report.skipped += 1;
      break;
    case "not_found":
      report.notFound += 1;
      break;
    case "invalid":
      report.invalid += 1;
      break;
    case "failed":
      report.failed += 1;
      break;
  }
}

/**
 * Remove extension, Latinize digits, strip every non-digit character.
 * `D537770001.jpg` / `student_D537770001.png` → `537770001`
 */
export function extractKanoonIdFromFilename(filename: string): string | null {
  const base = filename.trim().split(/[/\\]/).pop() ?? "";
  if (!base) return null;

  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const digits = toLatinDigits(stem).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length > 32) return null;
  return digits;
}

export function isAllowedStudentPhotoFilename(filename: string): boolean {
  const lower = filename.trim().toLowerCase();
  return STUDENT_PHOTO_IMPORT_ALLOWED_EXTENSIONS.some((ext) =>
    lower.endsWith(ext),
  );
}

/**
 * Build preview rows from file metas + org student lookup by kanoonStudentId.
 * First file per extracted ID wins; later files with the same ID are `duplicate`.
 */
export function buildStudentPhotoImportPreviewRows(
  files: StudentPhotoImportFileMeta[],
  studentsByKanoonId: Map<string, StudentPhotoImportMatchedStudent>,
): StudentPhotoImportPreviewRow[] {
  const seenIds = new Map<string, string>();
  const rows: StudentPhotoImportPreviewRow[] = [];

  for (const file of files) {
    if (!isAllowedStudentPhotoFilename(file.filename) || !file.extractedId) {
      rows.push({
        clientKey: file.clientKey,
        filename: file.filename,
        extractedId: file.extractedId,
        status: "invalid",
        student: null,
      });
      continue;
    }

    const previousKey = seenIds.get(file.extractedId);
    if (previousKey) {
      rows.push({
        clientKey: file.clientKey,
        filename: file.filename,
        extractedId: file.extractedId,
        status: "duplicate",
        student: studentsByKanoonId.get(file.extractedId) ?? null,
      });
      continue;
    }
    seenIds.set(file.extractedId, file.clientKey);

    const student = studentsByKanoonId.get(file.extractedId) ?? null;
    if (!student) {
      rows.push({
        clientKey: file.clientKey,
        filename: file.filename,
        extractedId: file.extractedId,
        status: "not_found",
        student: null,
      });
      continue;
    }

    rows.push({
      clientKey: file.clientKey,
      filename: file.filename,
      extractedId: file.extractedId,
      status: student.hasPortrait ? "already_has_photo" : "matched",
      student,
    });
  }

  return rows;
}

/** Rows that may be uploaded (respecting replaceExisting). */
export function isStudentPhotoImportRowUploadable(
  row: StudentPhotoImportPreviewRow,
  replaceExisting: boolean,
): boolean {
  if (row.status === "matched") return true;
  if (row.status === "already_has_photo" && replaceExisting) return true;
  return false;
}
