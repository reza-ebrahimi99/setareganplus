/**
 * Counselor OS — student case page nav + operations (data-only).
 */

export type CounselorCaseNavTabId =
  | "overview"
  | "journey"
  | "late"
  | "academic"
  | "holland"
  | "preferences"
  | "grades"
  | "documents"
  | "finance"
  | "sessions"
  | "notes"
  | "followups"
  | "corrections";

export type CounselorCaseNavItem = {
  id: CounselorCaseNavTabId;
  label: string;
  visible: boolean;
};

export type CounselorCaseOperationLink = {
  id: string;
  label: string;
  href: string;
  /** Primary toolbar vs overflow menu */
  tier: "primary" | "more";
};

export function buildCounselorCaseNavItems(input: {
  hasPersonal: boolean;
  hasPreferences: boolean;
  hasGrades: boolean;
  hasDocuments: boolean;
  hasSessions: boolean;
}): CounselorCaseNavItem[] {
  const items: CounselorCaseNavItem[] = [
    { id: "overview", label: "نمای کلی", visible: true },
    { id: "journey", label: "مسیر ۱۸مرحله‌ای", visible: true },
    { id: "late", label: "Workspace مراحل ۱۱–۱۸", visible: true },
    { id: "academic", label: "اطلاعات تحصیلی", visible: input.hasPersonal },
    { id: "holland", label: "آزمون رغبت‌سنجی", visible: true },
    {
      id: "preferences",
      label: "ترجیحات و اولویت‌ها",
      visible: input.hasPreferences,
    },
    { id: "grades", label: "نمرات و کارنامه", visible: input.hasGrades },
    { id: "documents", label: "مدارک و فایل‌ها", visible: input.hasDocuments },
    { id: "finance", label: "مالی و بسته", visible: true },
    { id: "sessions", label: "جلسات", visible: input.hasSessions },
    { id: "notes", label: "یادداشت‌ها", visible: true },
    { id: "followups", label: "پیگیری‌ها", visible: true },
    { id: "corrections", label: "تاریخچه اصلاحات", visible: true },
  ];
  return items.filter((item) => item.visible);
}

export function buildCounselorCaseOperations(studentId: string): CounselorCaseOperationLink[] {
  const base = `/admin/counselor/students/${studentId}`;
  return [
    {
      id: "choices-studio",
      label: "استودیوی چیدمان",
      href: `${base}/choices`,
      tier: "primary",
    },
    {
      id: "sanjesh",
      label: "ثبت سنجش",
      href: `${base}/choices?phase=sanjesh`,
      tier: "primary",
    },
    {
      id: "export-initial",
      label: "چیدمان اولیه",
      href: `${base}/export/choices-initial`,
      tier: "primary",
    },
    {
      id: "export-review",
      label: "بررسی دانش‌آموز",
      href: `${base}/export/choices-review`,
      tier: "primary",
    },
    {
      id: "export-final",
      label: "فهرست نهایی",
      href: `${base}/export/choices-final`,
      tier: "primary",
    },
    {
      id: "export-case",
      label: "دانلود پرونده کامل PDF",
      href: `${base}/export/case`,
      tier: "more",
    },
    {
      id: "export-holland",
      label: "دانلود گزارش رغبت‌سنجی PDF",
      href: `${base}/export/holland`,
      tier: "more",
    },
    {
      id: "export-konkur",
      label: "نتایج کنکور",
      href: `${base}/export/konkur`,
      tier: "more",
    },
    {
      id: "export-summary",
      label: "خلاصه نهایی",
      href: `${base}/export/summary`,
      tier: "more",
    },
    {
      id: "export-worksheet",
      label: "چاپ برگه جلسه خالی",
      href: `${base}/export/worksheet`,
      tier: "more",
    },
  ];
}
