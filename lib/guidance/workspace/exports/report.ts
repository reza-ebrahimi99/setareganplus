/**
 * Counselor Workspace premium reports — print-ready HTML + Excel.
 * Persian RTL is rendered with Vazirmatn via the print page (browser Save as PDF).
 */

import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import {
  loadWorkspaceDossier,
  loadWorkspaceStepInspector,
} from "@/lib/guidance/workspace/loaders";
import { GUIDANCE_JOURNEY_STEPS } from "@/lib/guidance/journey/steps";
import { loadStepReviewsForPlan } from "@/lib/guidance/workspace/review";
import { workspaceStepReviewLabel } from "@/lib/guidance/workspace/presentation";

export const REPORT_BRAND = {
  institute: "ستارگان پلاس",
  partner: "کانون فرهنگی آموزش (قلم‌چی) — نسیم‌شهر",
  counselor: "مهندس رضا ابراهیمی",
} as const;

export type WorkspaceReportKind = "summary" | "journey" | "notes";

export type WorkspaceReportModel = {
  kind: WorkspaceReportKind;
  title: string;
  generatedAtLabel: string;
  qrDataUrl: string;
  publicId: string;
  studentName: string;
  gradeName: string | null;
  examGroupLabel: string;
  currentStepTitle: string;
  completionPercentage: number;
  packageTitle: string | null;
  paid: boolean;
  mobile: string | null;
  rows: { label: string; value: string }[];
  steps: {
    id: number;
    title: string;
    journeyStatus: string;
    reviewStatus: string;
    fields: { label: string; value: string }[];
  }[];
  notes: { stepTitle: string; internal: string | null; student: string | null }[];
  audit: { summary: string; actor: string; at: string }[];
};

export async function buildWorkspaceReport(params: {
  organizationId: string;
  publicId: string;
  kind: WorkspaceReportKind;
}): Promise<WorkspaceReportModel | null> {
  const dossier = await loadWorkspaceDossier({
    organizationId: params.organizationId,
    publicId: params.publicId,
    canReview: true,
  });
  if (!dossier) return null;

  const qrPayload = `setareganplus:guidance:${dossier.publicId}`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 160,
    errorCorrectionLevel: "M",
  });

  const reviews = await loadStepReviewsForPlan({
    organizationId: params.organizationId,
    planId: dossier.planId,
  });
  const reviewByStep = new Map(reviews.map((row) => [row.stepNumber, row]));

  const steps = [];
  for (const def of GUIDANCE_JOURNEY_STEPS) {
    const inspector = await loadWorkspaceStepInspector({
      organizationId: params.organizationId,
      publicId: params.publicId,
      stepParam: String(def.id),
      canReview: true,
    });
    const review = reviewByStep.get(def.id);
    steps.push({
      id: def.id,
      title: def.title,
      journeyStatus: inspector?.statusLabel ?? "—",
      reviewStatus: review ? workspaceStepReviewLabel(review.status) : "در انتظار بررسی",
      fields: [...(inspector?.fields ?? [])],
    });
  }

  const notes = steps.map((step) => {
    const review = reviewByStep.get(step.id);
    return {
      stepTitle: step.title,
      internal: review?.privateNote ?? null,
      student: review?.studentMessage ?? null,
    };
  });

  const titles: Record<WorkspaceReportKind, string> = {
    summary: "خلاصه پرونده هدایت تحصیلی",
    journey: "گزارش کامل سفر ۱۲ مرحله‌ای",
    notes: "یادداشت‌های مشاور",
  };

  return {
    kind: params.kind,
    title: titles[params.kind],
    generatedAtLabel: formatJalaliDateTimeShort(new Date()),
    qrDataUrl,
    publicId: dossier.publicId,
    studentName: dossier.studentName,
    gradeName: dossier.gradeName,
    examGroupLabel: dossier.examGroupLabel,
    currentStepTitle: dossier.currentStepTitle,
    completionPercentage: dossier.completionPercentage,
    packageTitle: dossier.packageTitle,
    paid: Boolean(dossier.paidAtIso),
    mobile: dossier.mobile,
    rows: [
      { label: "دانش‌آموز", value: dossier.studentName },
      { label: "پایه", value: dossier.gradeName ?? "—" },
      { label: "گروه آزمایشی", value: dossier.examGroupLabel },
      { label: "موبایل", value: dossier.mobile ? toPersianDigits(dossier.mobile) : "—" },
      { label: "مرحله فعال", value: `${toPersianDigits(dossier.currentStep)} — ${dossier.currentStepTitle}` },
      { label: "تکمیل", value: `${toPersianDigits(dossier.completionPercentage)}٪` },
      { label: "بسته", value: dossier.packageTitle ?? "—" },
      { label: "پرداخت", value: dossier.paidAtIso ? "پرداخت شده" : "پرداخت نشده" },
      { label: "سهمیه", value: dossier.quotaLabel ?? "—" },
    ],
    steps,
    notes,
    audit: dossier.audit.map((item) => ({
      summary: item.summary,
      actor: item.actorName,
      at: formatJalaliDateTimeShort(new Date(item.atIso)),
    })),
  };
}

export async function buildWorkspaceExcel(params: {
  organizationId: string;
  publicId: string;
}): Promise<{ filename: string; buffer: Buffer } | null> {
  const report = await buildWorkspaceReport({ ...params, kind: "journey" });
  if (!report) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SetareganPlus";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("خلاصه", { views: [{ rightToLeft: true }] });
  summary.addRow([REPORT_BRAND.institute]);
  summary.addRow([REPORT_BRAND.partner]);
  summary.addRow([REPORT_BRAND.counselor]);
  summary.addRow([]);
  for (const row of report.rows) {
    summary.addRow([row.label, row.value]);
  }

  const journey = workbook.addWorksheet("سفر", { views: [{ rightToLeft: true }] });
  journey.addRow(["مرحله", "عنوان", "وضعیت سفر", "وضعیت بررسی", "خلاصه"]);
  journey.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  journey.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5B21B6" },
  };
  for (const step of report.steps) {
    journey.addRow([
      step.id,
      step.title,
      step.journeyStatus,
      step.reviewStatus,
      step.fields.map((f) => `${f.label}: ${f.value}`).join(" | "),
    ]);
  }

  const notes = workbook.addWorksheet("یادداشت‌ها", { views: [{ rightToLeft: true }] });
  notes.addRow(["مرحله", "داخلی", "دانش‌آموز"]);
  notes.getRow(1).font = { bold: true };
  for (const note of report.notes) {
    notes.addRow([note.stepTitle, note.internal ?? "", note.student ?? ""]);
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    filename: `guidance-${report.publicId.slice(0, 8)}.xlsx`,
    buffer,
  };
}
