/**
 * Slice 5 — parent-facing interest report + consultation conversion.
 * Keep this file free of Prisma / Node-only imports — it is pulled into
 * the student results UI which also renders inside the journey step form.
 */

import { utcToJalaliInTehran } from "@/lib/datetime/jalali";
import {
  ASSESSMENT_RESULTS_CTA_HREF,
  ASSESSMENT_RESULTS_CTA_LABEL,
  type AssessmentDashboardModel,
  type MajorFitScore,
} from "@/lib/guidance/journey/assessment/scoring";

const REPORT_BRAND = {
  institute: "ستارگان پلاس",
  partner: "کانون فرهنگی آموزش (قلم‌چی) — نسیم‌شهر",
  counselor: "مهندس رضا ابراهیمی",
} as const;

export const INTEREST_CONSULTATION = {
  title: "جلسه تحلیل تخصصی با مهندس رضا ابراهیمی",
  kicker: "تبدیل خروجی آزمون به تصمیم خانوادگی",
  duration: "۹۰ دقیقه",
  formats: ["حضوری", "آنلاین"] as const,
  ctaLabel: ASSESSMENT_RESULTS_CTA_LABEL,
  ctaHref: ASSESSMENT_RESULTS_CTA_HREF,
  closing:
    "خروجی آزمون نقطه شروع است. تفسیر نهایی، تطبیق با رتبه و کارنامه، و بستن استراتژی فقط با مهندس رضا ابراهیمی انجام می‌شود.",
  items: [
    {
      title: "تفسیر تخصصی نتایج",
      body: "خواندن الگوی پاسخ‌ها در کنار پرونده واقعی شما — نه برچسب روان‌شناختی.",
    },
    {
      title: "بررسی بازار کار",
      body: "افق شغلی گروه‌های هم‌خوان، با واقعیت امروز ایران، نه شعار رشته.",
    },
    {
      title: "مقایسه دانشگاه‌ها",
      body: "شهر، سطح علمی، دوره و هویت دانشگاه جدا از اسم آن بررسی می‌شود.",
    },
    {
      title: "نظام‌های آموزشی",
      body: "روزانه، شبانه، آزاد و پردیس از نظر هزینه و افق کنار هم گذاشته می‌شوند.",
    },
    {
      title: "انطباق با سوابق تحصیلی",
      body: "کارنامه، معدل و سهمیه روی میز می‌آید؛ آزمون به‌تنهایی تصمیم نمی‌سازد.",
    },
    {
      title: "انطباق با رتبه",
      body: "رتبه و تراز، اگر آمده باشد، با ظرفیت و واقع‌بینی چیده می‌شود.",
    },
    {
      title: "استراتژی شخصی",
      body: "یک مسیر مشخص برای خانواده: چه چیزی را حالا جلو ببریم و چه چیزی را به جلسه بعد بسپاریم.",
    },
  ],
} as const;

export type InterestReportIdentity = {
  studentName: string;
  examGroupLabel: string;
  assessmentDateLabel: string;
  reportId: string;
  planPublicId: string;
  counselorName: string;
  department: string;
  institute: string;
  partner: string;
};

export type TopMajorMatch = {
  clusterId: string;
  title: string;
  fitScore: number;
  barPercent: number;
  rank: number;
};

export function deriveInterestReportId(
  planPublicId: string,
  completedAtIso: string,
): string {
  const at = new Date(completedAtIso);
  const safe = Number.isNaN(at.getTime()) ? new Date() : at;
  const { jy } = utcToJalaliInTehran(safe);
  const digest = fnv1aHex(`interest-report:${planPublicId}:${completedAtIso}`);
  return `RG-${jy}-${digest}`;
}

function fnv1aHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
}

export function buildTopMajorMatches(
  majors: readonly MajorFitScore[],
  limit = 3,
): TopMajorMatch[] {
  return majors.slice(0, limit).map((major, index) => ({
    clusterId: major.clusterId,
    title: major.title,
    fitScore: major.fitScore,
    barPercent: Math.max(4, Math.min(100, major.fitScore)),
    rank: index + 1,
  }));
}

export function interestReportQrPayload(reportId: string): string {
  return `setareganplus:interest-report:${reportId}`;
}

export function buildInterestReportIdentity(input: {
  studentName: string;
  examGroupLabel: string;
  assessmentDateLabel: string;
  planPublicId: string;
  completedAtIso: string;
}): InterestReportIdentity {
  return {
    studentName: input.studentName.trim() || "دانش‌آموز",
    examGroupLabel: input.examGroupLabel,
    assessmentDateLabel: input.assessmentDateLabel,
    reportId: deriveInterestReportId(input.planPublicId, input.completedAtIso),
    planPublicId: input.planPublicId,
    counselorName: REPORT_BRAND.counselor,
    department: "دپارتمان انتخاب رشته قلم‌چی نسیم‌شهر",
    institute: REPORT_BRAND.institute,
    partner: REPORT_BRAND.partner,
  };
}

export type InterestResultsView = {
  dashboard: AssessmentDashboardModel;
  identity: InterestReportIdentity;
  qrDataUrl: string;
  topMatches: TopMajorMatch[];
  consultation: typeof INTEREST_CONSULTATION;
  disclaimer: string;
};
