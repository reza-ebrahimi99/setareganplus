/**
 * Student office Journey Tracker — pure derivation (no I/O).
 * 12 counseling phases follow GuidancePlan. Status is engine + counselor review.
 */

import {
  GUIDANCE_JOURNEY_STEPS,
  guidanceJourneyStepPath,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
import {
  officeIntakeContinueLabel,
  officeIntakeProgressPercent,
  nextOfficeIntakeHref,
  type OfficeIntakeFlags,
} from "@/lib/guidance/office/intake-href";
import {
  MAJOR_OFFICE_INTEREST,
  MAJOR_OFFICE_INTEREST_RESULTS,
  MAJOR_OFFICE_SESSION,
} from "@/lib/guidance/office/nav";
import { guidanceJourneyStepStatus } from "@/lib/guidance/journey/state";
import type { GuidanceJourneyStepStatus } from "@/lib/guidance/journey/types";
import type { StepReviewStatus } from "@/lib/guidance/workspace/review";

export type TrackerCounselorKind =
  | "not_reached"
  | "waiting_student"
  | "pending_review"
  | "approved"
  | "needs_revision"
  | "rejected";

export type TrackerPhaseAction = {
  id: string;
  label: string;
  done: boolean;
};

export type TrackerPhaseDocument = {
  id: string;
  label: string;
  status: "missing" | "ready" | "pending";
};

export type TrackerPhase = {
  id: GuidanceJourneyStepId;
  title: string;
  storyTitle: string;
  shortTitle: string;
  chapter: string;
  chapterStart: boolean;
  description: string;
  purpose: string;
  estimatedDuration: string;
  requiredActions: readonly TrackerPhaseAction[];
  status: GuidanceJourneyStepStatus;
  statusLabel: string;
  counselorKind: TrackerCounselorKind;
  counselorLabel: string;
  counselorMessage: string | null;
  lockReason: string | null;
  reviewable: boolean;
  href: string | null;
  hrefLabel: string | null;
  nextAction: string | null;
  progressPercent: number;
  documents: readonly TrackerPhaseDocument[];
  knowledgeNote: string | null;
};

export type OfficeJourneyTrackerModel = {
  completionPercentage: number;
  currentStep: GuidanceJourneyStepId;
  currentTitle: string;
  phases: readonly TrackerPhase[];
};

export type TrackerReviewHint = {
  stepNumber: GuidanceJourneyStepId;
  status: StepReviewStatus;
  studentMessage: string | null;
  rejectReason: string | null;
};

export type TrackerDerivationInput = {
  currentStep: GuidanceJourneyStepId;
  completedSteps: readonly GuidanceJourneyStepId[];
  completionPercentage: number;
  finalApproved: boolean;
  personalInfoConfirmed: boolean;
  packageCode: string | null;
  packagePaid: boolean;
  choicesApproved: boolean;
  hasFinalGrades: boolean;
  hasExamResult: boolean;
  hasIdentityProfile?: boolean;
  hasAcademicProfile?: boolean;
  finalExamComplete?: boolean;
  reviews: readonly TrackerReviewHint[];
};

type PhaseCatalog = {
  id: GuidanceJourneyStepId;
  chapter: string;
  storyTitle: string;
  story: string;
  estimatedDuration: string;
  lockReason: string;
  continueLabel: string;
  actions: readonly { id: string; label: string }[];
};

const PHASE_CATALOG: readonly PhaseCatalog[] = [
  {
    id: 1,
    chapter: "ورود به دفتر",
    storyTitle: "کی هستید، و تصویر تحصیلی‌تان چیست",
    story: "قبل از هر انتخاب، باید خودتان را دقیق ببینیم. هویت، مدرسه، توانایی‌ها و سند رسمی — چهار قطعهٔ یک تصویر.",
    estimatedDuration: "حدود ۱۵ دقیقه",
    lockReason: "بعد از تشکیل پرونده فعال می‌شود",
    continueLabel: "کشف تصویر تحصیلی",
    actions: [
      { id: "identity", label: "کی هستید" },
      { id: "academic", label: "تصویر تحصیلی" },
      { id: "examScores", label: "شناخت توانایی‌های شما" },
      { id: "grades", label: "آخرین قطعه از تصویر تحصیلی" },
    ],
  },
  {
    id: 2,
    chapter: "شناخت خود",
    storyTitle: "اولین نگاه به شخصیت تحصیلی شما",
    story: "این آزمون برچسب روان‌شناختی نیست. ترجیح‌ها را روشن می‌کند تا گفتگو با مهندس از حدس خالی شروع نشود.",
    estimatedDuration: "حدود ۲۵ دقیقه",
    lockReason: "بعد از ثبت اطلاعات فعال می‌شود",
    continueLabel: "شروع نگاه اول",
    actions: [{ id: "assess", label: "پاسخ به پرسش‌های رغبت" }],
  },
  {
    id: 3,
    chapter: "آمادگی برای مشاوره",
    storyTitle: "آماده‌سازی میز مشاوره",
    story: "بستهٔ همراهی، صندلی مقابل مهندس را رسمی می‌کند. تا آن لحظه دانشنامه و آزمون باز است.",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "بعد از انجام آزمون رغبت‌سنجی در دسترس قرار می‌گیرد",
    continueLabel: "فعال‌سازی همراهی",
    actions: [
      { id: "package", label: "انتخاب شکل همراهی" },
      { id: "pay", label: "فعال‌سازی پرونده روی میز مهندس" },
    ],
  },
  {
    id: 4,
    chapter: "نخستین گفتگو",
    storyTitle: "نشستن مقابل مهندس",
    story: "نود دقیقه برای فهمیدن مسیر — نه برای بستن فهرست. پرونده از کاغذ به گفتگو می‌رسد.",
    estimatedDuration: "۹۰ دقیقه",
    lockReason: "پس از فعال‌سازی بسته مشاوره فعال می‌شود",
    continueLabel: "آمادگی نخستین گفتگو",
    actions: [{ id: "book1", label: "رزرو نوبت نخستین گفتگو" }],
  },
  {
    id: 5,
    chapter: "نتایج سنجش",
    storyTitle: "وقتی کارنامه سنجش می‌رسد",
    story: "رتبه و تراز، تصویر را کامل می‌کنند. تا اعلام رسمی، حدس نزنید.",
    estimatedDuration: "حدود ۱۰ دقیقه — پس از اعلام نتایج",
    lockReason: "پس از جلسه اول مشاوره فعال می‌شود",
    continueLabel: "ثبت تصویر سنجش",
    actions: [
      { id: "ranks", label: "ثبت رتبه و تراز" },
      { id: "examDoc", label: "سند رسمی سنجش" },
    ],
  },
  {
    id: 6,
    chapter: "چیدن میدان انتخاب",
    storyTitle: "کدام نوع آموزش با زندگی شما می‌سازد",
    story: "روزانه، شبانه، غیرانتفاعی — اولویت زندگی است، نه برچسب دانشگاه.",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از ثبت نتایج آزمون سنجش فعال می‌شود",
    continueLabel: "چیدن نوع آموزش",
    actions: [{ id: "edu", label: "مرتب‌سازی نوع دوره" }],
  },
  {
    id: 7,
    chapter: "چیدن میدان انتخاب",
    storyTitle: "کجا می‌توانید زندگی کنید",
    story: "شهر فقط روی نقشه نیست. خانواده، خوابگاه و فاصله، تصمیم را عوض می‌کنند.",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از تعیین نوع آموزش فعال می‌شود",
    continueLabel: "انتخاب جغرافیا",
    actions: [{ id: "city", label: "شهرها و استان‌های مورد قبول" }],
  },
  {
    id: 8,
    chapter: "چیدن میدان انتخاب",
    storyTitle: "رشته‌هایی که ارزش فکر کردن دارند",
    story: "فهرست بلند را بعداً می‌چینیم. اینجا فقط میدان را محدود می‌کنیم.",
    estimatedDuration: "حدود ۱۵ دقیقه",
    lockReason: "پس از تعیین شهرهای مورد قبول فعال می‌شود",
    continueLabel: "انتخاب میدان رشته",
    actions: [{ id: "majors", label: "رشته‌های متناسب با گروه آزمایشی" }],
  },
  {
    id: 9,
    chapter: "چیدن میدان انتخاب",
    storyTitle: "چه چیزی برای شما سنگین‌تر است",
    story: "رشته، دانشگاه، شهر، هزینه — وزن هر کدام را شما می‌گذارید، نه فرم.",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از انتخاب رشته‌ها فعال می‌شود",
    continueLabel: "وزن‌دهی زندگی",
    actions: [{ id: "weights", label: "وزن رشته، دانشگاه، شهر" }],
  },
  {
    id: 10,
    chapter: "انتخابیوم و فهرست ۱۵۰",
    storyTitle: "انتخابیوم — پیش‌نویس ۱۵۰ انتخاب",
    story: "هوش مصنوعی پیش‌نویس را می‌چیند. مهندس بازبینی می‌کند. حکم نهایی هنوز انسانی است.",
    estimatedDuration: "کار شما حدود ۱۵ دقیقه؛ بازبینی مهندس معمولاً یک تا دو روز کاری",
    lockReason: "پس از وزن‌دهی اولویت‌ها فعال می‌شود",
    continueLabel: "دیدن پیش‌نویس",
    actions: [
      { id: "export", label: "صدور پیش‌نویس فهرست ۱۵۰" },
      { id: "review10", label: "بازبینی مهندس رضا ابراهیمی" },
    ],
  },
  {
    id: 11,
    chapter: "بازبینی دانش‌آموز و جلسه والدین",
    storyTitle: "گفتگوی دوم، این بار با خانواده",
    story: "فهرست روی میز می‌آید تا زندگی خانواده هم شنیده شود — نه فقط رتبه.",
    estimatedDuration: "یک جلسه با مشاور و خانواده",
    lockReason: "پس از بازبینی مهندس روی چیدمان فعال می‌شود",
    continueLabel: "رزرو گفتگوی خانواده",
    actions: [{ id: "book2", label: "رزرو جلسه دوم و حضور خانواده" }],
  },
  {
    id: 12,
    chapter: "تأیید، ارسال و بایگانی",
    storyTitle: "تأیید نهایی، ارسال به سنجش، بایگانی",
    story: "امضا می‌کنید، فهرست می‌رود، پرونده در دفتر می‌ماند. عجله اینجا جایی ندارد.",
    estimatedDuration: "حدود ۵ دقیقه",
    lockReason: "پس از جلسه دوم مشاوره فعال می‌شود",
    continueLabel: "تأیید و بایگانی",
    actions: [{ id: "final", label: "تأیید دیجیتال و بایگانی پرونده" }],
  },
];

const STATUS_LABELS: Record<GuidanceJourneyStepStatus, string> = {
  locked: "هنوز نرسیده‌اید",
  active: "همین‌جا هستید",
  completed: "این اتاق طی شد",
};

const COUNSELOR_LABELS: Record<TrackerCounselorKind, string> = {
  not_reached: "هنوز به میز مهندس نرسیده",
  waiting_student: "منتظر اقدام شما",
  pending_review: "روی میز مهندس ابراهیمی",
  approved: "تأیید مهندس",
  needs_revision: "مهندس اصلاح خواسته",
  rejected: "این مرحله رد شده",
};

function actionDone(
  actionId: string,
  status: GuidanceJourneyStepStatus,
  input: TrackerDerivationInput,
): boolean {
  if (status === "locked") return false;
  const completed = status === "completed" || input.finalApproved;

  switch (actionId) {
    case "confirm":
    case "identity":
      return Boolean(input.hasIdentityProfile) || input.personalInfoConfirmed || completed;
    case "academic":
      return Boolean(input.hasAcademicProfile) || completed;
    case "examScores":
      return Boolean(input.finalExamComplete) || completed;
    case "grades":
      return input.hasFinalGrades;
    case "assess":
      return completed;
    case "package":
      return Boolean(input.packageCode) || completed;
    case "pay":
      return input.packagePaid || completed;
    case "book1":
    case "edu":
    case "city":
    case "majors":
    case "weights":
    case "export":
    case "book2":
      return completed;
    case "ranks":
      return completed;
    case "examDoc":
      return input.hasExamResult;
    case "review10":
      return (
        input.choicesApproved ||
        input.reviews.some(
          (row) => row.stepNumber === 10 && row.status === "APPROVED",
        )
      );
    case "final":
      return input.finalApproved;
    default:
      return completed;
  }
}

function counselorForPhase(
  status: GuidanceJourneyStepStatus,
  review: TrackerReviewHint | undefined,
  finalApproved: boolean,
): { kind: TrackerCounselorKind; message: string | null } {
  if (finalApproved && (status === "completed" || status === "active")) {
    return { kind: "approved", message: review?.studentMessage ?? null };
  }
  if (status === "locked") {
    return { kind: "not_reached", message: null };
  }
  if (review?.status === "APPROVED") {
    return { kind: "approved", message: review.studentMessage };
  }
  if (review?.status === "NEEDS_REVISION") {
    return {
      kind: "needs_revision",
      message: review.studentMessage ?? review.rejectReason,
    };
  }
  if (review?.status === "REJECTED") {
    return {
      kind: "rejected",
      message: review.studentMessage ?? review.rejectReason,
    };
  }
  if (status === "completed") {
    return { kind: "pending_review", message: review?.studentMessage ?? null };
  }
  return { kind: "waiting_student", message: review?.studentMessage ?? null };
}

export function deriveOfficeJourneyTracker(
  input: TrackerDerivationInput,
): OfficeJourneyTrackerModel {
  const reviewsByStep = new Map(
    input.reviews.map((row) => [row.stepNumber, row]),
  );

  let previousChapter = "";
  const phases: TrackerPhase[] = PHASE_CATALOG.map((catalog) => {
    const def = GUIDANCE_JOURNEY_STEPS.find((step) => step.id === catalog.id);
    if (!def) {
      throw new Error(`Missing journey step definition: ${catalog.id}`);
    }
    const status = input.finalApproved
      ? "completed"
      : guidanceJourneyStepStatus(catalog.id, input);
    const review = reviewsByStep.get(catalog.id);
    const counselor = counselorForPhase(status, review, input.finalApproved);
    const requiredActions = catalog.actions.map((action) => ({
      id: action.id,
      label: action.label,
      done: actionDone(action.id, status, input),
    }));

    const knowledgeNote =
      catalog.id === 2
        ? status === "completed" || input.finalApproved
          ? "دانشنامه دانشگاه، رشته و نظام آموزشی همراه با مسیر مشاوره شما باز می‌شود."
          : "بعد از انجام آزمون رغبت‌سنجی در دسترس قرار می‌گیرد."
        : null;

    const chapterStart = catalog.chapter !== previousChapter;
    previousChapter = catalog.chapter;

    const intakeFlags: OfficeIntakeFlags = {
      hasIdentityProfile: Boolean(input.hasIdentityProfile),
      hasAcademicProfile: Boolean(input.hasAcademicProfile),
      finalExamComplete: Boolean(input.finalExamComplete),
      hasTranscript: input.hasFinalGrades,
    };

    const doneCount = requiredActions.filter((action) => action.done).length;
    const progressPercent =
      catalog.id === 1
        ? officeIntakeProgressPercent(intakeFlags)
        : requiredActions.length === 0
          ? status === "completed"
            ? 100
            : 0
          : Math.round((doneCount / requiredActions.length) * 100);

    const documents: TrackerPhaseDocument[] =
      catalog.id === 1
        ? [
            {
              id: "identity",
              label: "کی هستید",
              status: intakeFlags.hasIdentityProfile ? "ready" : "missing",
            },
            {
              id: "scores",
              label: "توانایی‌های شما",
              status: intakeFlags.finalExamComplete ? "ready" : "missing",
            },
            {
              id: "pdf",
              label: "آخرین قطعه تصویر",
              status: intakeFlags.hasTranscript ? "ready" : "missing",
            },
          ]
        : catalog.id === 5
          ? [
              {
                id: "exam",
                label: "کارنامه رسمی سنجش",
                status: input.hasExamResult ? "ready" : "missing",
              },
            ]
          : [];

    const href =
      catalog.id === 1 && (status === "active" || status === "completed")
        ? nextOfficeIntakeHref(intakeFlags)
        : catalog.id === 2 && status === "active"
          ? MAJOR_OFFICE_INTEREST
          : catalog.id === 2 && status === "completed"
            ? MAJOR_OFFICE_INTEREST_RESULTS
          : catalog.id === 4 && (status === "active" || status === "completed")
            ? MAJOR_OFFICE_SESSION
            : status === "active"
              ? guidanceJourneyStepPath(catalog.id)
              : null;

    const hrefLabel =
      catalog.id === 1 && (status === "active" || status === "completed")
        ? officeIntakeContinueLabel(intakeFlags)
        : status === "active"
          ? catalog.continueLabel
          : catalog.id === 2 && status === "completed"
            ? "مشاهده نتایج رغبت"
            : catalog.id === 4 && status === "completed"
              ? "مشاهده جلسه اول"
              : null;

    return {
      id: catalog.id,
      title: def.title,
      storyTitle: catalog.storyTitle,
      shortTitle: def.shortTitle,
      chapter: catalog.chapter,
      chapterStart,
      description: def.description,
      purpose: catalog.story,
      estimatedDuration: catalog.estimatedDuration,
      requiredActions,
      status,
      statusLabel: STATUS_LABELS[status],
      counselorKind: counselor.kind,
      counselorLabel: COUNSELOR_LABELS[counselor.kind],
      counselorMessage: counselor.message,
      lockReason: status === "locked" ? catalog.lockReason : null,
      reviewable: status === "completed",
      href,
      hrefLabel,
      nextAction: hrefLabel,
      progressPercent,
      documents,
      knowledgeNote,
    };
  });

  const current =
    phases.find((phase) => phase.status === "active") ??
    phases[phases.length - 1];

  return {
    completionPercentage: input.finalApproved ? 100 : input.completionPercentage,
    currentStep: current?.id ?? input.currentStep,
    currentTitle: current?.storyTitle ?? current?.title ?? "",
    phases,
  };
}
