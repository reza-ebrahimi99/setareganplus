/**
 * Counselor OS print reports — HTML/CSS print pages (same stack as admin guidance).
 */

import { REPORT_BRAND } from "@/lib/guidance/workspace/exports/report";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import type {
  CounselorHollandView,
  CounselorStudentCase,
  CounselorV2Dossier,
} from "@/lib/counselor-os/view-models";

export type CounselorReportKind =
  | "case"
  | "holland"
  | "worksheet"
  | "konkur"
  | "choices-initial"
  | "choices-review"
  | "choices-final"
  | "summary";

export type CounselorPrintReport = {
  kind: CounselorReportKind;
  title: string;
  generatedAtLabel: string;
  brand: typeof REPORT_BRAND;
  studentName: string;
  rows: Array<{ label: string; value: string }>;
  sections: Array<{
    title: string;
    lines: Array<{ label: string; value: string }>;
    noteSpace?: boolean;
  }>;
};

export type CounselorHollandPrintModel = {
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  brand: typeof REPORT_BRAND;
  studentName: string;
  identity: Array<{ label: string; value: string }>;
  finance: Array<{ label: string; value: string }>;
  holland: CounselorHollandView;
  financeDoesNotGateVisibility: true;
};

function identityRows(caseModel: CounselorStudentCase, dossier: CounselorV2Dossier) {
  return [
    { label: "نام", value: caseModel.studentName },
    { label: "موبایل", value: caseModel.mobile ?? "—" },
    { label: "پایه", value: caseModel.gradeName ?? "—" },
    { label: "رشته تحصیلی", value: dossier.examGroupLabel ?? "—" },
    { label: "مدرسه", value: caseModel.schoolName ?? "—" },
    { label: "تاریخ آزمون", value: dossier.holland.completedAtLabel ?? "—" },
    { label: "مرحله فعلی", value: dossier.currentStepTitle ?? "—" },
    { label: "پیشرفت مسیر", value: `${dossier.completionPercentage}٪` },
  ];
}

export function buildHollandFullPrintReport(params: {
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
}): CounselorHollandPrintModel {
  return {
    title: "گزارش کامل آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی",
    subtitle: "بر پایه چارچوب‌های شناخته‌شده رغبت تحصیلی و شغلی",
    generatedAtLabel: formatJalaliDateTimeShort(new Date()),
    brand: REPORT_BRAND,
    studentName: params.caseModel.studentName,
    identity: identityRows(params.caseModel, params.dossier),
    finance: [
      {
        label: "پرداخت رغبت‌سنجی",
        value: params.dossier.finance.hollandPaid
          ? "پرداخت‌شده — فقط آزمون رغبت‌سنجی"
          : "پرداخت نشده",
      },
      {
        label: "بسته انتخاب رشته",
        value: `${params.dossier.finance.packageTitle} · ${params.dossier.finance.packageStateLabel}`,
      },
    ],
    holland: params.dossier.holland,
    financeDoesNotGateVisibility: true,
  };
}

export function buildCounselorPrintReport(params: {
  kind: CounselorReportKind;
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
}): CounselorPrintReport {
  const generatedAtLabel = formatJalaliDateTimeShort(new Date());
  const identity = identityRows(params.caseModel, params.dossier).filter(
    (row) => row.label !== "تاریخ آزمون",
  );

  if (params.kind === "holland") {
    const holland = params.dossier.holland;
    return {
      kind: params.kind,
      title: "گزارش کامل آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی",
      generatedAtLabel,
      brand: REPORT_BRAND,
      studentName: params.caseModel.studentName,
      rows: [
        ...identity,
        {
          label: "کد رغبت",
          value: holland.code || holland.codes.join(" · ") || "هنوز تکمیل نشده",
        },
        {
          label: "پرداخت رغبت‌سنجی",
          value: params.dossier.finance.hollandPaid
            ? "پرداخت شده — فقط آزمون رغبت‌سنجی"
            : "پرداخت نشده",
        },
      ],
      sections: holland.completed
        ? [
            {
              title: "شش بُعد رغبت",
              lines: holland.scores.map((score) => ({
                label: `${score.rank}. ${score.typeLabel} (${score.type})`,
                value: `خام ${score.raw} · نرمال ${score.normalized}٪ · ${score.intensity}`,
              })),
            },
            {
              title: "تفسیر آموزشی",
              lines: [
                {
                  label: "الگوی ترکیبی",
                  value: holland.combinedInterpretation ?? holland.summary ?? "—",
                },
              ],
            },
            { title: "یادداشت مشاور", lines: [], noteSpace: true },
          ]
        : [
            {
              title: "وضعیت آزمون",
              lines: [
                {
                  label: "نتیجه",
                  value: "آزمون رغبت‌سنجی هنوز تکمیل نشده است.",
                },
              ],
            },
            { title: "یادداشت مشاور", lines: [], noteSpace: true },
          ],
    };
  }

  if (params.kind === "worksheet") {
    return {
      kind: params.kind,
      title: "برگه کار انتخاب رشته",
      generatedAtLabel,
      brand: REPORT_BRAND,
      studentName: params.caseModel.studentName,
      rows: identity,
      sections: [
        {
          title: "نمرات",
          lines: params.dossier.grades.length
            ? params.dossier.grades
            : [{ label: "نمرات", value: "ثبت نشده" }],
        },
        {
          title: "ترجیحات",
          lines: [
            { label: "دوره‌ها", value: params.dossier.educationTypes.join("، ") || "—" },
            { label: "استان‌ها", value: params.dossier.provinces.join("، ") || "—" },
            { label: "رشته‌ها", value: params.dossier.majors.slice(0, 25).join("، ") || "—" },
            { label: "معیارها", value: params.dossier.priorities.join(" > ") || "—" },
          ],
        },
        {
          title: "بسته و مالی",
          lines: params.dossier.finance.items.map((item) => ({
            label: item.title,
            value: `${item.statusLabel} · ${item.activationLabel}`,
          })),
        },
        { title: "یادداشت جلسه", lines: [], noteSpace: true },
      ],
    };
  }

  return {
    kind: "case",
    title: "پرونده کامل دانش‌آموز",
    generatedAtLabel,
    brand: REPORT_BRAND,
    studentName: params.caseModel.studentName,
    rows: [
      ...identity,
      { label: "بسته", value: params.dossier.finance.packageTitle },
      { label: "وضعیت بسته", value: params.dossier.finance.packageStateLabel },
    ],
    sections: [
      {
        title: "اطلاعات ثبت‌شده",
        lines: Object.entries(params.dossier.personal).map(([label, value]) => ({
          label,
          value: value || "—",
        })),
      },
      {
        title: "مسیر ۱۸ مرحله‌ای",
        lines: params.dossier.steps.map((step) => ({
          label: `${step.id}. ${step.title}`,
          value:
            step.status === "completed"
              ? "انجام شده"
              : step.status === "current"
                ? "مرحله جاری"
                : "شروع نشده",
        })),
      },
      {
        title: "مالی",
        lines: params.dossier.finance.items.map((item) => ({
          label: item.title,
          value: `${item.amountLabel} · ${item.statusLabel}`,
        })),
      },
    ],
  };
}
