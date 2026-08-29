/**
 * Guidance Initial Analysis — pure presentation mapper.
 * No JSX. No Prisma. No AI. Rule-based recommendations only.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { GuidancePortalPlanSummary } from "@/lib/guidance/portal";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import { GUIDANCE_EXAM_GROUPS } from "@/lib/guidance/types";
import type {
  AnalysisCardModel,
  AnalysisCardStatus,
  AnalysisChecklistItem,
  AnalysisPipelineStatus,
  AnalysisPresentationModel,
  AnalysisRecommendation,
  AnalysisUploadedGradeVersion,
} from "@/lib/guidance/analysis/types";

const EXAM_GROUP_LABELS: Record<GuidanceExamGroup, string> = {
  MATHEMATICS: "ریاضی",
  EXPERIMENTAL_SCIENCES: "تجربی",
  HUMANITIES: "انسانی",
  ARTS: "هنر",
  LANGUAGES: "زبان",
};

const VERIFICATION_LABELS: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  VERIFIED: "تأیید شده",
  REJECTED: "نیاز به بازبینی",
};

const PIPELINE_COPY: Record<
  AnalysisPipelineStatus,
  { title: string; description: string; statusLabel: string }
> = {
  waiting: {
    title: "در انتظار کارنامه",
    description: "پس از بارگذاری کارنامه نهایی، تحلیل اولیه آغاز می‌شود.",
    statusLabel: "در انتظار",
  },
  processing: {
    title: "در حال پردازش",
    description:
      "کارنامه دریافت شده و در صف بررسی قرار دارد. داشبورد آماده نمایش وضعیت است.",
    statusLabel: "در حال پردازش",
  },
  ready: {
    title: "تحلیل آماده است",
    description: "کارنامه تأیید شد. بخش‌های تحلیل به‌تدریج تکمیل می‌شوند.",
    statusLabel: "آماده",
  },
  needs_review: {
    title: "نیاز به بازبینی",
    description:
      "کارنامه نیاز به نسخه واضح‌تر یا تکمیل دارد. می‌توانی فایل را جایگزین کنی.",
    statusLabel: "نیاز به بازبینی",
  },
};

const CHECKLIST_COPY: Record<
  string,
  { title: string; description: string; icon: AnalysisChecklistItem["icon"] }
> = {
  PRE_REGISTRATION: {
    title: "پیش‌ثبت‌نام",
    description: "هویت و گروه آزمایشی ثبت شده است.",
    icon: "route",
  },
  PROFILE: {
    title: "پروفایل",
    description: "اطلاعات تحصیلی و هویتی را کامل نگه دار.",
    icon: "user",
  },
  FINAL_GRADES: {
    title: "کارنامه",
    description: "آخرین نسخه کارنامه نهایی در پرونده.",
    icon: "clipboard",
  },
  INTEREST_ASSESSMENT: {
    title: "آزمون رغبت",
    description: "به‌زودی برای تکمیل مسیر فعال می‌شود.",
    icon: "spark",
  },
  CONSULTATION_BOOKING: {
    title: "جلسه مشاوره",
    description: "رزرو جلسه پس از آماده‌سازی مراحل قبلی.",
    icon: "calendar",
  },
  DOCUMENTS: {
    title: "مدارک",
    description: "آرشیو مدارک تکمیلی — معماری آماده، محتوا به‌زودی.",
    icon: "layers",
  },
};

function examGroupLabel(code: string): string {
  if ((GUIDANCE_EXAM_GROUPS as readonly string[]).includes(code)) {
    return EXAM_GROUP_LABELS[code as GuidanceExamGroup];
  }
  return code;
}

function mapPipelineStatus(
  plan: GuidancePortalPlanSummary,
): AnalysisPipelineStatus {
  const verification = plan.latestFinalGrades?.verificationStatus;
  if (!plan.latestFinalGrades) return "waiting";
  if (verification === "REJECTED") return "needs_review";
  if (verification === "VERIFIED") return "ready";
  if (verification === "PENDING") return "processing";
  return "waiting";
}

function cardStatusLabel(status: AnalysisCardStatus): string {
  switch (status) {
    case "waiting":
      return "در انتظار";
    case "processing":
      return "در حال پردازش";
    case "ready":
      return "آماده";
    case "needs_review":
      return "نیاز به بازبینی";
    case "complete":
      return "انجام‌شده";
    case "active":
      return "فعلی";
    case "locked":
      return "قفل";
    case "info":
      return "اطلاعات";
    default:
      return "";
  }
}

function mapStepCardStatus(
  state: GuidanceTimelineStep["state"],
): AnalysisCardStatus {
  if (state === "complete") return "complete";
  if (state === "active") return "active";
  if (state === "pending_review") return "processing";
  return "locked";
}

function mapGradeVersion(
  doc: NonNullable<GuidancePortalPlanSummary["latestFinalGrades"]>,
): AnalysisUploadedGradeVersion {
  return {
    id: doc.id,
    versionNumber: doc.versionNumber,
    originalFilename: doc.originalFilename,
    verificationStatus: doc.verificationStatus,
    verificationLabel:
      VERIFICATION_LABELS[doc.verificationStatus] ?? doc.verificationStatus,
    createdAtIso: doc.createdAt.toISOString(),
    isLatest: doc.isLatest,
  };
}

function buildRecommendations(input: {
  pipeline: AnalysisPipelineStatus;
  profileComplete: boolean;
  steps: readonly GuidanceTimelineStep[];
}): AnalysisRecommendationsBlockShape {
  const pool: AnalysisRecommendation[] = [];

  if (input.pipeline === "needs_review" || input.pipeline === "processing") {
    pool.push({
      id: "rec-clearer-grades",
      title: "نسخه واضح‌تری از کارنامه بارگذاری کن",
      description:
        "اگر تصویر تار یا ناقص است، با جایگزینی فایل بررسی سریع‌تر می‌شود.",
      status: input.pipeline === "needs_review" ? "needs_review" : "processing",
      statusLabel: cardStatusLabel(
        input.pipeline === "needs_review" ? "needs_review" : "processing",
      ),
      icon: "clipboard",
      cta: {
        href: "/portal/student/services/guidance/grades",
        label: "جایگزینی کارنامه",
      },
      source: "rules",
      rank: 10,
    });
  }

  if (!input.profileComplete) {
    pool.push({
      id: "rec-complete-profile",
      title: "پروفایل خود را کامل کن",
      description: "هویت تحصیلی دقیق‌تر، مسیر انتخاب رشته را شخصی‌تر می‌کند.",
      status: "active",
      statusLabel: cardStatusLabel("active"),
      icon: "user",
      cta: { href: "/portal/student/profile", label: "مشاهده پروفایل" },
      source: "rules",
      rank: 20,
    });
  }

  const interest = input.steps.find((s) => s.key === "INTEREST_ASSESSMENT");
  if (interest && interest.state !== "complete") {
    pool.push({
      id: "rec-interest-test",
      title: "آزمون رغبت را آماده کن",
      description:
        interest.state === "active"
          ? "گام بعدی مسیر — کشف علایق و سبک یادگیری."
          : "پس از آماده‌سازی تحلیل اولیه، آزمون رغبت گام بعدی مسیر است.",
      status: interest.state === "locked" ? "locked" : "active",
      statusLabel: cardStatusLabel(
        interest.state === "locked" ? "locked" : "active",
      ),
      icon: "spark",
      cta:
        interest.state === "active" || interest.href
          ? {
              href:
                interest.href ??
                "/portal/student/services/guidance?view=interest",
              label: "شروع آزمون رغبت",
            }
          : null,
      source: "rules",
      rank: 30,
    });
  }

  const meeting = input.steps.find((s) => s.key === "CONSULTATION_BOOKING");
  const profileStep = input.steps.find((s) => s.key === "PROFILE_COMPLETION");
  if (profileStep && profileStep.state === "active") {
    pool.push({
      id: "rec-complete-360-profile",
      title: "پروفایل ۳۶۰ درجه را کامل کن",
      description: "هویت دیجیتال بخش‌به‌بخش — گام بعدی پس از آزمون رغبت.",
      status: "active",
      statusLabel: cardStatusLabel("active"),
      icon: "user",
      cta: {
        href:
          profileStep.href ??
          "/portal/student/services/guidance?view=profile",
        label: "تکمیل پروفایل",
      },
      source: "rules",
      rank: 28,
    });
  }
  if (meeting && meeting.state !== "complete") {
    pool.push({
      id: "rec-book-meeting",
      title: "برای جلسه مشاوره برنامه‌ریزی کن",
      description: "رزرو جلسه پس از تکمیل مراحل آماده‌سازی فعال می‌شود.",
      status: meeting.state === "locked" ? "locked" : "active",
      statusLabel: cardStatusLabel(
        meeting.state === "locked" ? "locked" : "active",
      ),
      icon: "calendar",
      cta: null,
      source: "rules",
      rank: 40,
    });
  }

  const sorted = [...pool].sort((a, b) => a.rank - b.rank);
  return {
    primary: sorted[0] ?? null,
    secondary: sorted.slice(1, 4),
  };
}

type AnalysisRecommendationsBlockShape = {
  primary: AnalysisRecommendation | null;
  secondary: readonly AnalysisRecommendation[];
};

export type BuildAnalysisPresentationInput = {
  plan: GuidancePortalPlanSummary;
  steps: readonly GuidanceTimelineStep[];
  studentName: string;
  gradeName: string | null;
  schoolYear: string | null;
  /** School assessment average when available — never invent guidance GPA. */
  averageScore: number | null;
};

/**
 * Builds the Initial Analysis Center view model.
 * Returns `visible: false` when grades are not uploaded yet.
 */
export function buildAnalysisPresentationModel(
  input: BuildAnalysisPresentationInput,
): AnalysisPresentationModel {
  const { plan, steps, studentName } = input;
  const hasGrades = Boolean(plan.latestFinalGrades);
  const visible =
    hasGrades &&
    (plan.status === "FINAL_GRADES_UPLOADED" ||
      plan.latestFinalGrades != null);

  const pipeline = mapPipelineStatus(plan);
  const pipelineCopy = PIPELINE_COPY[pipeline];

  const gradesHref = "/portal/student/services/guidance/grades";
  const history = (plan.finalGradesHistory ?? []).map(mapGradeVersion);
  const latest = plan.latestFinalGrades
    ? mapGradeVersion(plan.latestFinalGrades)
    : null;

  const completedSteps = steps.filter((s) => s.state === "complete");
  const currentStep = steps.find(
    (s) => s.state === "active" || s.state === "pending_review",
  );
  const remainingSteps = steps.filter((s) => s.state === "locked");

  const journeyCards: AnalysisCardModel[] = steps.map((step) => {
    const status = mapStepCardStatus(step.state);
    return {
      id: `journey-${step.key}`,
      icon:
        step.key === "FINAL_GRADES"
          ? "clipboard"
          : step.key === "INITIAL_ANALYSIS"
            ? "chart"
            : step.key === "INTEREST_ASSESSMENT"
              ? "spark"
              : step.key === "CONSULTATION_BOOKING"
                ? "calendar"
                : step.key === "PROFILE_COMPLETION"
                  ? "user"
                  : "route",
      title: step.label,
      status,
      statusLabel: cardStatusLabel(status),
      description:
        status === "complete"
          ? "این مرحله انجام شده است."
          : status === "processing"
            ? "در انتظار بررسی است."
            : status === "active"
              ? "اقدام بعدی تو در این مرحله است."
              : "پس از مراحل قبلی باز می‌شود.",
      cta:
        step.href != null
          ? {
              href: step.href,
              label:
                step.state === "pending_review"
                  ? "مدیریت کارنامه"
                  : "ادامه",
            }
          : null,
      accent: status === "complete" ? "emerald" : status === "active" ? "gold" : "blue",
    };
  });

  const interestStep = steps.find((s) => s.key === "INTEREST_ASSESSMENT");
  const interestStatus = mapStepCardStatus(
    interestStep?.state ?? "locked",
  );
  const interestHref =
    interestStep?.href ??
    (interestStatus !== "locked"
      ? "/portal/student/services/guidance?view=interest"
      : null);

  const profileComplete = Boolean(input.gradeName && studentName);
  const profileStep = steps.find((s) => s.key === "PROFILE_COMPLETION");
  const profile360Active =
    profileStep?.state === "active" || profileStep?.state === "complete";
  const checklistItems: AnalysisChecklistItem[] = [
    {
      id: "check-profile",
      key: "PROFILE",
      title: profile360Active
        ? "پروفایل ۳۶۰ درجه"
        : CHECKLIST_COPY.PROFILE.title,
      status: profileStep
        ? mapStepCardStatus(profileStep.state)
        : profileComplete
          ? "complete"
          : "active",
      statusLabel: cardStatusLabel(
        profileStep
          ? mapStepCardStatus(profileStep.state)
          : profileComplete
            ? "complete"
            : "active",
      ),
      description: profile360Active
        ? "هویت دیجیتال هدایت تحصیلی — بخش‌به‌بخش."
        : CHECKLIST_COPY.PROFILE.description,
      cta: {
        href: profile360Active
          ? profileStep?.href ??
            "/portal/student/services/guidance?view=profile"
          : "/portal/student/profile",
        label: profile360Active ? "تکمیل پروفایل" : "پروفایل",
      },
      icon: CHECKLIST_COPY.PROFILE.icon,
    },
    {
      id: "check-grades",
      key: "FINAL_GRADES",
      title: CHECKLIST_COPY.FINAL_GRADES.title,
      status: hasGrades
        ? pipeline === "needs_review"
          ? "needs_review"
          : pipeline === "ready"
            ? "complete"
            : "processing"
        : "active",
      statusLabel: cardStatusLabel(
        hasGrades
          ? pipeline === "needs_review"
            ? "needs_review"
            : pipeline === "ready"
              ? "complete"
              : "processing"
          : "active",
      ),
      description: CHECKLIST_COPY.FINAL_GRADES.description,
      cta: { href: gradesHref, label: hasGrades ? "جایگزینی" : "بارگذاری" },
      icon: CHECKLIST_COPY.FINAL_GRADES.icon,
    },
    {
      id: "check-interest",
      key: "INTEREST_ASSESSMENT",
      title: CHECKLIST_COPY.INTEREST_ASSESSMENT.title,
      status: interestStatus,
      statusLabel: cardStatusLabel(interestStatus),
      description:
        interestStatus === "active"
          ? "گام بعدی مسیر — آزمون رغبت را شروع یا ادامه بده."
          : interestStatus === "complete"
            ? "آزمون رغبت ثبت شده است."
            : CHECKLIST_COPY.INTEREST_ASSESSMENT.description,
      cta: interestHref
        ? {
            href: interestHref,
            label:
              interestStatus === "complete"
                ? "مشاهده نتایج"
                : "شروع آزمون رغبت",
          }
        : null,
      icon: CHECKLIST_COPY.INTEREST_ASSESSMENT.icon,
    },
    {
      id: "check-meeting",
      key: "CONSULTATION_BOOKING",
      title: CHECKLIST_COPY.CONSULTATION_BOOKING.title,
      status: "locked",
      statusLabel: cardStatusLabel("locked"),
      description: CHECKLIST_COPY.CONSULTATION_BOOKING.description,
      cta: null,
      icon: CHECKLIST_COPY.CONSULTATION_BOOKING.icon,
    },
    {
      id: "check-documents",
      key: "DOCUMENTS",
      title: CHECKLIST_COPY.DOCUMENTS.title,
      status: "locked",
      statusLabel: cardStatusLabel("locked"),
      description: CHECKLIST_COPY.DOCUMENTS.description,
      cta: null,
      icon: CHECKLIST_COPY.DOCUMENTS.icon,
    },
  ];

  const statusCards: AnalysisCardModel[] = (
    ["waiting", "processing", "ready", "needs_review"] as const
  ).map((key) => ({
    id: `pipeline-${key}`,
    icon:
      key === "ready"
        ? "medal"
        : key === "needs_review"
          ? "shield"
          : key === "processing"
            ? "layers"
            : "calendar",
    title: PIPELINE_COPY[key].title,
    status: key,
    statusLabel: PIPELINE_COPY[key].statusLabel,
    description: PIPELINE_COPY[key].description,
    cta: key === pipeline && (key === "needs_review" || key === "processing")
      ? { href: gradesHref, label: "مدیریت کارنامه" }
      : null,
    accent:
      key === pipeline
        ? key === "ready"
          ? "emerald"
          : key === "needs_review"
            ? "orange"
            : "gold"
        : "blue",
    meta: key === pipeline ? "وضعیت فعلی" : null,
  }));

  const recommendations = buildRecommendations({
    pipeline,
    profileComplete,
    steps,
  });

  const averageValue =
    input.averageScore != null && Number.isFinite(input.averageScore)
      ? String(Math.round(input.averageScore * 10) / 10)
      : null;

  return {
    planPublicId: plan.publicId,
    studentName,
    visible,
    hero: {
      eyebrow: "مرکز تحلیل اولیه",
      headline:
        pipeline === "ready"
          ? "تحلیل اولیه آماده است"
          : pipeline === "needs_review"
            ? "کارنامه نیاز به بازبینی دارد"
            : "کارنامه دریافت شد — تحلیل در جریان است",
      support:
        pipeline === "processing"
          ? "به‌جای صفحه خالی، وضعیت پرونده، مسیر و گام‌های بعدی را اینجا دنبال کن."
          : pipelineCopy.description,
      accent:
        pipeline === "ready"
          ? "emerald"
          : pipeline === "needs_review"
            ? "orange"
            : "gold",
      icon: "chart",
      statusLabel: pipelineCopy.statusLabel,
      primaryCta: {
        href: gradesHref,
        label:
          pipeline === "needs_review" ? "جایگزینی کارنامه" : "مدیریت کارنامه",
      },
      secondaryCta: {
        href: "/portal/student",
        label: "بازگشت به خانه",
      },
    },
    academic: {
      averageLabel: "میانگین",
      averageValue,
      averageHint: averageValue
        ? "بر اساس نتایج ثبت‌شده در پرتال مدرسه"
        : "میانگین کارنامه پس از استخراج/تأیید نمایش داده می‌شود",
      examGroupCode: plan.examGroup,
      examGroupLabel: examGroupLabel(plan.examGroup),
      graduationLabel: "وضعیت فارغ‌التحصیلی",
      graduationValue: input.gradeName
        ? `پایه ${input.gradeName}`
        : null,
      graduationHint: input.schoolYear
        ? `سال تحصیلی ${input.schoolYear}`
        : "پس از تکمیل پرونده تحصیلی به‌روز می‌شود",
      gradeName: input.gradeName,
      schoolYear: input.schoolYear,
    },
    grades: {
      latest,
      history,
      replaceAction: {
        href: gradesHref,
        label: "جایگزینی کارنامه",
      },
    },
    analysisStatus: {
      status: pipeline,
      title: pipelineCopy.title,
      description: pipelineCopy.description,
      cards: statusCards,
    },
    journey: {
      completedCount: completedSteps.length,
      currentLabel: currentStep?.label ?? null,
      remainingCount: remainingSteps.length,
      cards: journeyCards,
    },
    checklist: { items: checklistItems },
    insights: {
      items: [],
      empty: {
        title: "بینش‌ها به‌زودی",
        description:
          "رتبه تخمینی، احتمال قبولی، توضیح هوشمند و تناسب رشته — بدون بازطراحی صفحه، اینجا قرار می‌گیرند. فعلاً خبری از داده مصنوعی نیست.",
      },
      futureSlots: [
        "rank_estimation",
        "probability",
        "ai_explanation",
        "quota_analysis",
        "university_fit",
      ],
    },
    recommendations,
  };
}
