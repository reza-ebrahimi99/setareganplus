"use server";

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
import { importCrmLeads, type CrmImportResult } from "@/lib/crm/import-service";

export type ImportActionError = { ok: false; error: string };
export type InspectImportActionResult =
  | { ok: true; inspection: WorkbookInspection }
  | ImportActionError;
export type ValidateImportActionResult =
  | {
      ok: true;
      summary: {
        total: number;
        valid: number;
        invalid: number;
        errors: Array<{
          excelRowNumber: number;
          mobile: string;
          name: string;
          message: string;
        }>;
      };
    }
  | ImportActionError;
export type ExecuteImportActionResult =
  | { ok: true; result: CrmImportResult }
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
  await requirePermission("crm.import_leads");
  try {
    const parsed = await parseLeadImportFile({
      file: readFile(formData),
      sheetName: String(formData.get("sheetName") ?? ""),
      mapping: readMapping(formData),
    });
    return {
      ok: true,
      summary: {
        total: parsed.totalRows,
        valid: parsed.validRows.length,
        invalid: parsed.invalidRows.length,
        errors: parsed.invalidRows.slice(0, 100).map((row) => ({
          excelRowNumber: row.excelRowNumber,
          mobile: row.mobile,
          name: row.name,
          message: row.errors.join(" "),
        })),
      },
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
    if (strategyRaw !== "SKIP" && strategyRaw !== "UPDATE_EMPTY_FIELDS") {
      throw new Error("راهبرد برخورد با تکراری‌ها نامعتبر است.");
    }
    const strategy = strategyRaw as ImportDuplicateStrategy;
    const branchId = String(formData.get("branchId") ?? "").trim();
    if (!branchId) throw new Error("شعبه باید انتخاب شود.");
    const parsed = await parseLeadImportFile({
      file: readFile(formData),
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
    });
    revalidatePath("/admin/leads");
    revalidatePath("/admin/crm");
    revalidatePath("/admin/workspace");
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
