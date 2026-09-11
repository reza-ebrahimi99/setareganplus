/**
 * Counselor OS print reports — HTML/CSS print pages (same stack as admin guidance).
 */

import { REPORT_BRAND } from "@/lib/guidance/workspace/exports/report";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import type { CounselorStudentCase, CounselorV2Dossier } from "@/lib/counselor-os/view-models";

export type CounselorReportKind = "case" | "holland" | "worksheet";

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

export function buildCounselorPrintReport(params: {
  kind: CounselorReportKind;
  caseModel: CounselorStudentCase;
  dossier: CounselorV2Dossier;
}): CounselorPrintReport {
  const generatedAtLabel = formatJalaliDateTimeShort(new Date());
  const identity = [
    { label: "نام", value: params.caseModel.studentName },
    { label: "موبایل", value: params.caseModel.mobile ?? "—" },
    { label: "پایه", value: params.caseModel.gradeName ?? "—" },
    { label: "رشته تحصیلی", value: params.dossier.examGroupLabel ?? "—" },
    { label: "مدرسه", value: params.caseModel.schoolName ?? "—" },
    { label: "مرحله فعلی", value: params.dossier.currentStepTitle ?? "—" },
    {
      label: "پیشرفت",
      value: `${params.dossier.completionPercentage}٪`,
    },
  ];

  if (params.kind === "holland") {
    return {
      kind: params.kind,
      title: "گزارش آزمون رغبت‌سنجی اختصاصی مهندس ابراهیمی",
      generatedAtLabel,
      brand: REPORT_BRAND,
      studentName: params.caseModel.studentName,
      rows: [
        ...identity,
        {
          label: "کد رغبت",
          value: params.dossier.holland.codes.join(" · ") || "هنوز تکمیل نشده",
        },
        {
          label: "پرداخت رغبت‌سنجی",
          value: params.dossier.finance.hollandPaid
            ? "پرداخت شده — فقط آزمون رغبت‌سنجی"
            : "پرداخت نشده",
        },
      ],
      sections: [
        {
          title: "تفسیر موجود در سامانه",
          lines: [
            {
              label: "خلاصه",
              value:
                params.dossier.holland.summary ??
                "نتیجه آزمون در پرونده دانش‌آموز ثبت نشده است.",
            },
          ],
        },
        {
          title: "یادداشت مشاور",
          lines: [],
          noteSpace: true,
        },
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
