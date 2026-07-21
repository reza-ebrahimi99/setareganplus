"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  importAssessmentResults,
  inspectAssessmentImportFile,
  parseAssessmentImportFile,
  validateAssessmentImportRows,
} from "@/lib/assessment/import";
import {
  ASSESSMENT_IMPORT_FIELDS,
  type AssessmentColumnMapping,
  type AssessmentImportField,
  type AssessmentImportResult,
  type ValidatedImportRow,
  type WorkbookInspection,
} from "@/lib/assessment/import-shared";
import { isAssessmentImportError } from "@/lib/assessment/import-errors";
import { logServerError } from "@/lib/observability/server-log";
import {
  isPrismaUniqueConflict,
  persianPrismaError,
} from "@/lib/prisma/user-facing-error";
import { prisma } from "@/lib/prisma";

export type ResultActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

export type ImportActionError = { ok: false; error: string };
export type InspectAssessmentImportResult =
  | { ok: true; inspection: WorkbookInspection }
  | ImportActionError;
export type ValidateAssessmentImportResult =
  | {
      ok: true;
      rows: ValidatedImportRow[];
      validCount: number;
      invalidCount: number;
      duplicateCount: number;
      totalRows: number;
    }
  | ImportActionError;
export type ExecuteAssessmentImportResult =
  | { ok: true; result: AssessmentImportResult }
  | ImportActionError;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseOptionalFloat(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function revalidateResults(assessmentSlug?: string) {
  revalidatePath("/admin/website/assessment-results");
  revalidatePath("/admin/website/assessments");
  revalidatePath("/assessments");
  if (assessmentSlug) revalidatePath(`/assessments/${assessmentSlug}`);
}

function validateMetricFields(formData: FormData): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const percentile = parseOptionalFloat(readString(formData, "percentile"));
  if (percentile != null && (percentile < 0 || percentile > 100)) {
    fieldErrors.percentile = "صدک باید بین ۰ تا ۱۰۰ باشد.";
  }
  for (const key of [
    "rankSchool",
    "rankCity",
    "rankProvince",
    "rankCountry",
  ] as const) {
    const value = parseOptionalInt(readString(formData, key));
    if (value != null && value < 1) {
      fieldErrors[key] = "رتبه باید عدد صحیح بزرگ‌تر از صفر باشد.";
    }
  }
  for (const key of ["score", "scaledScore", "averageClass", "averageGrade"] as const) {
    const value = parseOptionalFloat(readString(formData, key));
    if (value != null && value < 0) {
      fieldErrors[key] = "مقدار نمی‌تواند منفی باشد.";
    }
  }
  return fieldErrors;
}

export async function createAssessmentResult(
  _prev: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const studentId = readString(formData, "studentId").trim();
  const assessmentId = readString(formData, "assessmentId").trim();
  const fieldErrors: Record<string, string> = {
    ...validateMetricFields(formData),
  };
  if (!studentId) fieldErrors.studentId = "دانش‌آموز الزامی است.";
  if (!assessmentId) fieldErrors.assessmentId = "آزمون الزامی است.";

  const [student, assessment] = await Promise.all([
    studentId
      ? prisma.student.findFirst({
          where: {
            id: studentId,
            organizationId,
            deletedAt: null,
            archivedAt: null,
            isActive: true,
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve(null),
    assessmentId
      ? prisma.assessment.findFirst({
          where: { id: assessmentId, organizationId, deletedAt: null },
          select: { id: true, slug: true },
        })
      : Promise.resolve(null),
  ]);

  if (studentId && !student) fieldErrors.studentId = "دانش‌آموز معتبر نیست.";
  if (assessmentId && !assessment) {
    fieldErrors.assessmentId = "آزمون معتبر نیست.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const payload = {
    score: parseOptionalFloat(readString(formData, "score")),
    scaledScore: parseOptionalFloat(readString(formData, "scaledScore")),
    rankSchool: parseOptionalInt(readString(formData, "rankSchool")),
    rankCity: parseOptionalInt(readString(formData, "rankCity")),
    rankProvince: parseOptionalInt(readString(formData, "rankProvince")),
    rankCountry: parseOptionalInt(readString(formData, "rankCountry")),
    percentile: parseOptionalFloat(readString(formData, "percentile")),
    growth: parseOptionalFloat(readString(formData, "growth")),
    averageClass: parseOptionalFloat(readString(formData, "averageClass")),
    averageGrade: parseOptionalFloat(readString(formData, "averageGrade")),
    notes: readString(formData, "notes").trim().slice(0, 2000) || null,
    isFeatured: readString(formData, "isFeatured") === "true",
  };

  try {
    const existing = await prisma.assessmentResult.findFirst({
      where: {
        organizationId,
        studentId: student!.id,
        assessmentId: assessment!.id,
      },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      return {
        formError: "نتیجه این دانش‌آموز برای این آزمون قبلاً ثبت شده.",
        fieldErrors: {
          studentId: "نتیجه این دانش‌آموز برای این آزمون قبلاً ثبت شده.",
        },
      };
    }

    if (existing) {
      await prisma.assessmentResult.update({
        where: { id: existing.id },
        data: { ...payload, deletedAt: null },
      });
      revalidateResults(assessment!.slug);
      return { successMessage: "نتیجه بازیابی و به‌روزرسانی شد." };
    }

    await prisma.assessmentResult.create({
      data: {
        organizationId,
        studentId: student!.id,
        assessmentId: assessment!.id,
        ...payload,
      },
    });
  } catch (error) {
    logServerError(
      {
        module: "assessment.results",
        action: "createAssessmentResult",
        category: "mutation",
        organizationId,
        userId: session.user.id,
        recordId: assessmentId,
      },
      error,
    );
    if (isPrismaUniqueConflict(error)) {
      return {
        formError: "نتیجه این دانش‌آموز برای این آزمون قبلاً ثبت شده.",
      };
    }
    return { formError: persianPrismaError(error) };
  }

  revalidateResults(assessment!.slug);
  return { successMessage: "نتیجه آزمون ثبت شد." };
}

export async function updateAssessmentResult(
  _prev: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const resultId = readString(formData, "resultId").trim();
  const fieldErrors = validateMetricFields(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "لطفاً خطاهای فرم را برطرف کنید.", fieldErrors };
  }

  const existing = await prisma.assessmentResult.findFirst({
    where: { id: resultId, organizationId, deletedAt: null },
    select: {
      id: true,
      student: { select: { slug: true } },
      assessment: { select: { slug: true } },
    },
  });
  if (!existing) return { formError: "نتیجه یافت نشد." };

  try {
    await prisma.assessmentResult.update({
      where: { id: existing.id },
      data: {
        score: parseOptionalFloat(readString(formData, "score")),
        scaledScore: parseOptionalFloat(readString(formData, "scaledScore")),
        rankSchool: parseOptionalInt(readString(formData, "rankSchool")),
        rankCity: parseOptionalInt(readString(formData, "rankCity")),
        rankProvince: parseOptionalInt(readString(formData, "rankProvince")),
        rankCountry: parseOptionalInt(readString(formData, "rankCountry")),
        percentile: parseOptionalFloat(readString(formData, "percentile")),
        growth: parseOptionalFloat(readString(formData, "growth")),
        averageClass: parseOptionalFloat(readString(formData, "averageClass")),
        averageGrade: parseOptionalFloat(readString(formData, "averageGrade")),
        notes: readString(formData, "notes").trim().slice(0, 2000) || null,
        isFeatured: readString(formData, "isFeatured") === "true",
      },
    });
  } catch (error) {
    logServerError(
      {
        module: "assessment.results",
        action: "updateAssessmentResult",
        category: "mutation",
        organizationId,
        userId: session.user.id,
        recordId: resultId,
      },
      error,
    );
    return { formError: persianPrismaError(error) };
  }

  revalidateResults(existing.assessment.slug);
  return { successMessage: "نتیجه به‌روزرسانی شد." };
}

export async function deleteAssessmentResult(formData: FormData) {
  const session = await requirePermission("website.manage");
  const resultId = readString(formData, "resultId").trim();
  const result = await prisma.assessmentResult.findFirst({
    where: {
      id: resultId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: {
      id: true,
      student: { select: { slug: true } },
      assessment: { select: { slug: true } },
    },
  });
  if (!result) return;

  await prisma.assessmentResult.update({
    where: { id: result.id },
    data: { deletedAt: new Date(), isFeatured: false },
  });
  revalidateResults(result.assessment.slug);
}

function readFile(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("لطفاً فایل را دوباره انتخاب کنید.");
  }
  return file;
}

function readMapping(formData: FormData): AssessmentColumnMapping {
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

  const mapping: AssessmentColumnMapping = {};
  const used = new Set<string>();
  for (const [column, field] of Object.entries(parsed)) {
    if (!/^[1-9]\d*$/.test(column) || typeof field !== "string") {
      throw new Error("یکی از تطبیق‌های ستون نامعتبر است.");
    }
    const isSubject = field.startsWith("subject:");
    const isKnown = (ASSESSMENT_IMPORT_FIELDS as readonly string[]).includes(
      field,
    );
    if (!isSubject && !isKnown) {
      throw new Error("یکی از تطبیق‌های ستون نامعتبر است.");
    }
    if (field !== "IGNORE") {
      if (used.has(field)) {
        throw new Error("هر فیلد فقط می‌تواند به یک ستون متصل شود.");
      }
      used.add(field);
    }
    mapping[column] = field as AssessmentImportField | string;
  }
  return mapping;
}

function importErrorMessage(error: unknown): string {
  if (isAssessmentImportError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "پردازش فایل انجام نشد.";
}

export async function inspectAssessmentImportAction(
  formData: FormData,
): Promise<InspectAssessmentImportResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const inspection = await inspectAssessmentImportFile(file, sheetName);
    return { ok: true, inspection };
  } catch (error) {
    logServerError(
      {
        module: "assessment.import",
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

export async function validateAssessmentImportAction(
  formData: FormData,
): Promise<ValidateAssessmentImportResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const assessmentId = readString(formData, "assessmentId").trim();
    if (!assessmentId) throw new Error("آزمون را انتخاب کنید.");

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!assessment) throw new Error("آزمون یافت نشد.");

    const mapping = readMapping(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const parsed = await parseAssessmentImportFile(file, mapping, sheetName);
    const rows = await validateAssessmentImportRows({
      organizationId: session.organization.id,
      assessmentId: assessment.id,
      rows: parsed,
    });
    return {
      ok: true,
      rows,
      totalRows: rows.length,
      validCount: rows.filter((row) => row.ok).length,
      invalidCount: rows.filter((row) => !row.ok).length,
      duplicateCount: rows.filter(
        (row) => !row.ok && row.code === "DUPLICATE_IN_FILE",
      ).length,
    };
  } catch (error) {
    logServerError(
      {
        module: "assessment.import",
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

export async function executeAssessmentImportAction(
  formData: FormData,
): Promise<ExecuteAssessmentImportResult> {
  const session = await requirePermission("website.manage");
  try {
    const file = readFile(formData);
    const assessmentId = readString(formData, "assessmentId").trim();
    if (!assessmentId) throw new Error("آزمون را انتخاب کنید.");

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      select: { id: true, slug: true },
    });
    if (!assessment) throw new Error("آزمون یافت نشد.");

    const mapping = readMapping(formData);
    const sheetName = readString(formData, "sheetName").trim() || undefined;
    const parsed = await parseAssessmentImportFile(file, mapping, sheetName);
    const rows = await validateAssessmentImportRows({
      organizationId: session.organization.id,
      assessmentId: assessment.id,
      rows: parsed,
    });
    const result = await importAssessmentResults({
      organizationId: session.organization.id,
      assessmentId: assessment.id,
      rows,
      allOrNothing: true,
    });

    revalidateResults(assessment.slug);
    return { ok: true, result };
  } catch (error) {
    logServerError(
      {
        module: "assessment.import",
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
