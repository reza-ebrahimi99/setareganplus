"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { logServerError } from "@/lib/observability/server-log";
import {
  buildStudentImportInvalidRowsWorkbook,
  buildStudentImportResultWorkbook,
  buildStudentImportTemplateWorkbook,
  importStudents,
  mapRawRowsToParsed,
  parseStudentImportSession,
  sessionToInspection,
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
  type StudentImportSession,
  type StudentWorkbookInspection,
  type ValidatedStudentImportRow,
} from "@/lib/website/student-import-shared";

export type ImportActionError = { ok: false; error: string };

export type ParseStudentImportResult =
  | {
      ok: true;
      session: StudentImportSession;
      inspection: StudentWorkbookInspection;
    }
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
      canManagePortal: boolean;
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

function readMode(raw: string): StudentImportMode {
  if (raw === "create_and_update") return "create_and_update";
  return "create_only";
}

function readMapping(raw: string): StudentColumnMapping {
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

function readSession(raw: string): StudentImportSession {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("نشست واردسازی نامعتبر است. فایل را دوباره بارگذاری کنید.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("نشست واردسازی نامعتبر است. فایل را دوباره بارگذاری کنید.");
  }
  const session = parsed as StudentImportSession;
  if (
    !session.filename ||
    !session.selectedSheet ||
    !session.sheetsData ||
    typeof session.sheetsData !== "object"
  ) {
    throw new Error("نشست واردسازی ناقص است. فایل را دوباره بارگذاری کنید.");
  }
  return session;
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

function resolveSheet(session: StudentImportSession, sheetName?: string) {
  const selected =
    sheetName && session.sheetsData[sheetName]
      ? sheetName
      : session.selectedSheet;
  const sheet = session.sheetsData[selected];
  if (!sheet) {
    throw new Error("برگه انتخاب‌شده در نشست یافت نشد.");
  }
  return { selected, sheet };
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

/** Step 1: parse file once into a serializable session. */
export async function parseStudentImportAction(
  formData: FormData,
): Promise<ParseStudentImportResult> {
  const admin = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const preferredSheet = readString(formData, "sheetName").trim() || undefined;
    const session = await parseStudentImportSession(file, preferredSheet);
    const inspection = sessionToInspection(session);
    return { ok: true, session, inspection };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "parse",
        category: "import",
        organizationId: admin.organization.id,
        userId: admin.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

/** @deprecated Prefer parseStudentImportAction */
export async function inspectStudentImportAction(
  formData: FormData,
): Promise<ParseStudentImportResult> {
  return parseStudentImportAction(formData);
}

export async function validateStudentImportAction(
  formData: FormData,
): Promise<ValidateStudentImportResult> {
  const admin = await requirePermission("website.manage");
  try {
    const importSession = readSession(readString(formData, "session"));
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mapping = readMapping(readString(formData, "mapping"));
    const mode = readMode(readString(formData, "mode"));
    const canManagePortal = hasPermission(admin, "students.portal.manage");

    const { sheet } = resolveSheet(importSession, sheetName);
    const parsed = mapRawRowsToParsed(sheet.rows, mapping);
    const rows = await validateStudentImportRows({
      organizationId: admin.organization.id,
      rows: parsed,
      mode,
      canManagePortal,
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
      canManagePortal,
    };
  } catch (error) {
    logServerError(
      {
        module: "website.student-import",
        action: "validate",
        category: "import",
        organizationId: admin.organization.id,
        userId: admin.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function downloadStudentImportInvalidRowsAction(
  formData: FormData,
): Promise<DownloadWorkbookResult> {
  const admin = await requirePermission("website.manage");
  try {
    const importSession = readSession(readString(formData, "session"));
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mapping = readMapping(readString(formData, "mapping"));
    const mode = readMode(readString(formData, "mode"));
    const canManagePortal = hasPermission(admin, "students.portal.manage");
    const { sheet } = resolveSheet(importSession, sheetName);
    const parsed = mapRawRowsToParsed(sheet.rows, mapping);
    const rows = await validateStudentImportRows({
      organizationId: admin.organization.id,
      rows: parsed,
      mode,
      canManagePortal,
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
        organizationId: admin.organization.id,
        userId: admin.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}

export async function executeStudentImportAction(
  formData: FormData,
): Promise<ExecuteStudentImportResult> {
  const admin = await requirePermission("website.manage");
  const startedAt = new Date();
  try {
    const importSession = readSession(readString(formData, "session"));
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const mapping = readMapping(readString(formData, "mapping"));
    const mode = readMode(readString(formData, "mode"));
    const confirmUpdate = readString(formData, "confirmUpdate") === "true";
    const canManagePortal = hasPermission(admin, "students.portal.manage");

    if (mode === "create_and_update" && !confirmUpdate) {
      return {
        ok: false,
        error: "برای حالت به‌روزرسانی باید هشدار تأیید را بپذیرید.",
      };
    }

    const { sheet } = resolveSheet(importSession, sheetName);
    const parsed = mapRawRowsToParsed(sheet.rows, mapping);
    const rows = await validateStudentImportRows({
      organizationId: admin.organization.id,
      rows: parsed,
      mode,
      canManagePortal,
    });
    const result = await importStudents({
      organizationId: admin.organization.id,
      rows,
      mode,
      canManagePortal,
    });
    const finishedAt = new Date();
    const reportWorkbook = await buildStudentImportResultWorkbook({
      filename: importSession.filename,
      importedBy: admin.user.email ?? admin.user.id,
      organizationName: admin.organization.name,
      startedAt,
      finishedAt,
      result,
    });
    const reportBase64 = await workbookToBase64(reportWorkbook);

    revalidatePath("/admin/website/students");
    revalidatePath("/admin/website/students/import");
    revalidatePath("/admin/website/guardians");
    revalidatePath("/admin/website/portal-access");

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
        organizationId: admin.organization.id,
        userId: admin.user.id,
      },
      error,
    );
    return { ok: false, error: importErrorMessage(error) };
  }
}
