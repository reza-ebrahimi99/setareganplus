"use server";

import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  IMPORT_MAPPING_FIELDS,
  inspectLeadImportFile,
  parseLeadImportFile,
  type ImportColumnMapping,
  type ImportDuplicateStrategy,
  type ImportMappingField,
  type WorkbookInspection,
} from "@/lib/crm/import-parser";
import {
  importCrmLeads,
  preflightCrmImport,
  type CrmImportPreflight,
  type CrmImportResult,
} from "@/lib/crm/import-service";
import {
  parseImportAssignmentConfig,
  type ImportAssignmentConfig,
} from "@/lib/crm/import-assignment";
import { prisma } from "@/lib/prisma";

export type ImportActionError = { ok: false; error: string };
export type InspectImportActionResult =
  | { ok: true; inspection: WorkbookInspection }
  | ImportActionError;
export type ValidateImportActionResult =
  | {
      ok: true;
      summary: CrmImportPreflight;
    }
  | ImportActionError;
export type ExecuteImportActionResult =
  | {
      ok: true;
      result: CrmImportResult;
      reportId: string | null;
      reportWarning: string | null;
    }
  | ImportActionError;

function readFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("لطفاً فایل را دوباره انتخاب کنید.");
  return file;
}

function readMapping(formData: FormData): ImportColumnMapping {
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
  const mapping: ImportColumnMapping = {};
  const used = new Set<ImportMappingField>();
  for (const [column, field] of Object.entries(parsed)) {
    if (
      !/^[1-9]\d*$/.test(column) ||
      typeof field !== "string" ||
      !(IMPORT_MAPPING_FIELDS as readonly string[]).includes(field)
    ) {
      throw new Error("یکی از تطبیق‌های ستون نامعتبر است.");
    }
    const typedField = field as ImportMappingField;
    if (typedField !== "IGNORE" && used.has(typedField)) {
      throw new Error("هر فیلد فقط می‌تواند به یک ستون متصل شود.");
    }
    if (typedField !== "IGNORE") used.add(typedField);
    mapping[column] = typedField;
  }
  return mapping;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "پردازش فایل انجام نشد.";
}

function readBoolean(formData: FormData, key: string): boolean {
  return String(formData.get(key) ?? "") === "true";
}

function readAssignment(formData: FormData): ImportAssignmentConfig {
  const raw = formData.get("assignment");
  if (typeof raw !== "string") return { method: "NONE" };
  try {
    const parsed = parseImportAssignmentConfig(JSON.parse(raw));
    if (!parsed) throw new Error("INVALID");
    return parsed;
  } catch {
    throw new Error("روش تخصیص مسئول نامعتبر است.");
  }
}

export async function inspectCrmImportAction(
  formData: FormData,
): Promise<InspectImportActionResult> {
  await requirePermission("crm.import_leads");
  try {
    const selectedSheet = String(formData.get("sheetName") ?? "").trim() || undefined;
    return {
      ok: true,
      inspection: await inspectLeadImportFile(readFile(formData), selectedSheet),
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function validateCrmImportAction(
  formData: FormData,
): Promise<ValidateImportActionResult> {
  const session = await requirePermission("crm.import_leads");
  try {
    const parsed = await parseLeadImportFile({
      file: readFile(formData),
      sheetName: String(formData.get("sheetName") ?? ""),
      mapping: readMapping(formData),
    });
    return {
      ok: true,
      summary: await preflightCrmImport({
        organizationId: session.organization.id,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        matchParentName: readBoolean(formData, "matchParentName"),
      }),
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function executeCrmImportAction(
  formData: FormData,
): Promise<ExecuteImportActionResult> {
  const session = await requirePermission("crm.import_leads");
  try {
    const strategyRaw = String(formData.get("strategy") ?? "");
    if (
      strategyRaw !== "SKIP" &&
      strategyRaw !== "UPDATE_EMPTY_FIELDS" &&
      strategyRaw !== "IMPORT_ANYWAY"
    ) {
      throw new Error("راهبرد برخورد با تکراری‌ها نامعتبر است.");
    }
    const strategy = strategyRaw as ImportDuplicateStrategy;
    const branchId = String(formData.get("branchId") ?? "").trim();
    if (!branchId) throw new Error("شعبه باید انتخاب شود.");
    const file = readFile(formData);
    const parsed = await parseLeadImportFile({
      file,
      sheetName: String(formData.get("sheetName") ?? ""),
      mapping: readMapping(formData),
    });
    const result = await importCrmLeads({
      actor: {
        organizationId: session.organization.id,
        membershipId: session.membership.id,
        userId: session.user.id,
        isPlatformAdmin: session.user.isPlatformAdmin,
      },
      branchId,
      strategy,
      validRows: parsed.validRows,
      invalidRows: parsed.invalidRows,
      assignment: readAssignment(formData),
      matchParentName: readBoolean(formData, "matchParentName"),
    });
    let reportId: string | null = null;
    let reportWarning: string | null = null;
    try {
      const report = await prisma.crmLeadImportReport.create({
        data: {
          organizationId: session.organization.id,
          branchId,
          importedByUserId: session.user.id,
          sourceFileName: file.name.trim().slice(0, 255) || "crm-import",
          totalRows: result.total,
          createdCount: result.created,
          updatedCount: result.updated,
          skippedCount: result.skipped,
          invalidCount: result.invalid,
          failedCount: result.failed,
          duplicateCount: result.duplicates,
          ownerDistribution:
            result.ownerDistribution as Prisma.InputJsonValue,
          resultCsv: result.csv,
        },
        select: { id: true },
      });
      reportId = report.id;
    } catch (error) {
      console.error("Failed to persist CRM import report", error);
      reportWarning =
        "ورود لیدها انجام شد، اما ذخیره گزارش مدیریتی ممکن نبود.";
    }
    revalidatePath("/admin/leads");
    revalidatePath("/admin/crm");
    revalidatePath("/admin/workspace");
    revalidatePath("/admin");
    return { ok: true, result, reportId, reportWarning };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
