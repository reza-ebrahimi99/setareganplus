"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { logServerError } from "@/lib/observability/server-log";
import {
  buildStudentImportInvalidRowsWorkbook,
  buildStudentImportResultWorkbook,
  buildStudentImportTemplateWorkbook,
  importStudents,
  inspectStudentImportFile,
  parseStudentImportFile,
  summarizeStudentImportRows,
  validateStudentImportRows,
} from "@/lib/website/student-import";
import { isStudentImportError } from "@/lib/website/student-import-errors";
import {
  STUDENT_IMPORT_FIELDS,
  type StudentColumnMapping,
  type StudentImportField,
  type StudentImportMode,
  type StudentImportResult,
  type StudentWorkbookInspection,
  type ValidatedStudentImportRow,
} from "@/lib/website/student-import-shared";

export type ImportActionError = { ok: false; error: string };

export type InspectStudentImportResult =
  | { ok: true; inspection: StudentWorkbookInspection }
  | ImportActionError;

export type ValidateStudentImportResult =
  | {
      ok: true;
      rows: ValidatedStudentImportRow[];
      totalRows: number;
      validCount: number;
      invalidCount: number;
      createCount: number;
      updateCount: number;
      duplicateCount: number;
      previewRows: ValidatedStudentImportRow[];
    }
  | ImportActionError;

export type ExecuteStudentImportResult =
  | {
      ok: true;
      result: StudentImportResult;
      reportBase64: string;
      reportFilename: string;
    }
  | ImportActionError;

export type DownloadWorkbookResult =
  | { ok: true; base64: string; filename: string }
  | ImportActionError;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("لطفاً فایل را دوباره انتخاب کنید.");
  }
  return file;
}

function readMode(formData: FormData): StudentImportMode {
  const raw = readString(formData, "mode").trim();
  if (raw === "create_and_update") return "create_and_update";
  return "create_only";
}

function readMapping(formData: FormData): StudentColumnMapping {
  const raw = formData.get("mapping");
  if (typeof raw !== "string") throw new Error("تطبیق ستون‌ها نامعتبر است.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("تطبیق ستون‌ها قابل خواندن نیست.");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("تطبیق ستون‌ها نامعتبر است.");
  }

  const mapping: StudentColumnMapping = {};
  const used = new Set<string>();
  for (const [column, field] of Object.entries(parsed)) {
    if (!/^[1-9]\d*$/.test(column) || typeof field !== "string") {
      throw new Error("یکی از تطبیق‌های ستون نامعتبر است.");
    }
    if (!(STUDENT_IMPORT_FIELDS as readonly string[]).includes(field)) {
      throw new Error("یکی از تطبیق‌های ستون نامعتبر است.");
    }
    if (field !== "IGNORE") {
      if (used.has(field)) {
        throw new Error("هر فیلد فقط می‌تواند به یک ستون متصل شود.");
      }
      used.add(field);
    }
    mapping[column] = field as StudentImportField;
  }
  return mapping;
}

function importErrorMessage(error: unknown): string {
  if (isStudentImportError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "پردازش فایل انجام نشد.";
}

async function workbookToBase64(
  workbook: Awaited<ReturnType<typeof buildStudentImportTemplateWorkbook>>,
): Promise<string> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function downloadStudentImportTemplateAction(): Promise<DownloadWorkbookResult> {
  const session = await requirePermission("website.manage");
  try {
    const workbook = await buildStudentImportTemplateWorkbook(
      session.organization.id,
    );
    const base64 = await workbookToBase64(workbook);
    return {
      ok: true,
      base64,
      filename: "student-import-template.xlsx",
    };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "template",
        category: "import",
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function inspectStudentImportAction(
  formData: FormData,
): Promise<InspectStudentImportResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const inspection = await inspectStudentImportFile(file, sheetName);
    return { ok: true, inspection };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "inspect",
        category: "import",
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function validateStudentImportAction(
  formData: FormData,
): Promise<ValidateStudentImportResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const mapping = readMapping(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mode = readMode(formData);
    const parsed = await parseStudentImportFile(file, mapping, sheetName);
    const rows = await validateStudentImportRows({
      organizationId: session.organization.id,
      rows: parsed,
      mode,
    });
    const summary = summarizeStudentImportRows(rows);
    return {
      ok: true,
      rows,
      totalRows: summary.totalRows,
      validCount: summary.validCount,
      invalidCount: summary.invalidCount,
      createCount: summary.createCount,
      updateCount: summary.updateCount,
      duplicateCount: summary.duplicateCount,
      previewRows: summary.previewRows,
    };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "validate",
        category: "import",
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function downloadStudentImportInvalidRowsAction(
  formData: FormData,
): Promise<DownloadWorkbookResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const mapping = readMapping(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mode = readMode(formData);
    const parsed = await parseStudentImportFile(file, mapping, sheetName);
    const rows = await validateStudentImportRows({
      organizationId: session.organization.id,
      rows: parsed,
      mode,
    });
    const workbook = await buildStudentImportInvalidRowsWorkbook(rows);
    const base64 = await workbookToBase64(workbook);
    return {
      ok: true,
      base64,
      filename: "student-import-errors.xlsx",
    };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "invalid-rows",
        category: "import",
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function executeStudentImportAction(
  formData: FormData,
): Promise<ExecuteStudentImportResult> {
  const session = await requirePermission("website.manage");
  const startedAt = new Date();
  try {
    const file = readFile(formData);
    const mapping = readMapping(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mode = readMode(formData);
    const confirmUpdate = readString(formData, "confirmUpdate") === "true";

    if (mode === "create_and_update" && !confirmUpdate) {
      return {
        ok: false,
        error:
          "برای حالت به‌روزرسانی باید هشدار تأیید را بپذیرید.",
      };
    }

    const parsed = await parseStudentImportFile(file, mapping, sheetName);
    const rows = await validateStudentImportRows({
      organizationId: session.organization.id,
      rows: parsed,
      mode,
    });
    const result = await importStudents({
      organizationId: session.organization.id,
      rows,
      mode,
    });
    const finishedAt = new Date();
    const reportWorkbook = await buildStudentImportResultWorkbook({
      filename: file.name || "import.xlsx",
      importedBy: session.user.email ?? session.user.id,
      organizationName: session.organization.name ?? session.organization.id,
      startedAt,
      finishedAt,
      result,
    });
    const reportBase64 = await workbookToBase64(reportWorkbook);

    revalidatePath("/admin/website/students");
    revalidatePath("/admin/website/students/import");

    return {
      ok: true,
      result,
      reportBase64,
      reportFilename: `student-import-report-${startedAt
        .toISOString()
        .slice(0, 10)}.xlsx`,
    };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "execute",
        category: "import",
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}
