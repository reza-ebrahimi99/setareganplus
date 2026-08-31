/**
 * Student office Journey Tracker — pure derivation (no I/O).
 * 12 counseling phases follow GuidancePlan. Status is engine + counselor review.
 */

import {
  GUIDANCE_JOURNEY_STEPS,
  guidanceJourneyStepPath,
  type GuidanceJourneyStepId,
} from "@/lib/guidance/journey/steps";
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

export type TrackerPhase = {
  id: GuidanceJourneyStepId;
  title: string;
  shortTitle: string;
  chapter: string;
  chapterStart: boolean;
  description: string;
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
  reviews: readonly TrackerReviewHint[];
};

type PhaseCatalog = {
  id: GuidanceJourneyStepId;
  chapter: string;
  estimatedDuration: string;
  lockReason: string;
  continueLabel: string;
  actions: readonly { id: string; label: string }[];
};

const PHASE_CATALOG: readonly PhaseCatalog[] = [
  {
    id: 1,
    chapter: "ساخت شناسنامه دانش‌آموز",
    estimatedDuration: "حدود ۱۵ دقیقه",
    lockReason: "بعد از تشکیل پرونده فعال می‌شود",
    continueLabel: "تکمیل شناسنامه",
    actions: [
      { id: "confirm", label: "ثبت و تأیید اطلاعات فردی" },
      { id: "grades", label: "بارگذاری کارنامه نهایی" },
    ],
  },
  {
    id: 2,
    chapter: "شناخت خود",
    estimatedDuration: "حدود ۲۵ دقیقه",
    lockReason: "بعد از ثبت اطلاعات فعال می‌شود",
    continueLabel: "شروع آزمون رغبت",
    actions: [{ id: "assess", label: "انجام آزمون رغبت‌سنجی" }],
  },
  {
    id: 3,
    chapter: "آمادگی برای مشاوره",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "بعد از انجام آزمون رغبت‌سنجی در دسترس قرار می‌گیرد",
    continueLabel: "فعال‌سازی بسته",
    actions: [
      { id: "package", label: "انتخاب بسته مشاوره" },
      { id: "pay", label: "پرداخت و فعال‌سازی پرونده" },
    ],
  },
  {
    id: 4,
    chapter: "انتخاب اولویت‌ها و جلسه اول",
    estimatedDuration: "یک جلسه ۳۰ تا ۴۵ دقیقه‌ای",
    lockReason: "پس از فعال‌سازی بسته مشاوره فعال می‌شود",
    continueLabel: "رزرو جلسه اول",
    actions: [{ id: "book1", label: "رزرو نوبت جلسه اول با مهندس" }],
  },
  {
    id: 5,
    chapter: "کارنامه و نتایج کنکور",
    estimatedDuration: "حدود ۱۰ دقیقه — پس از اعلام نتایج",
    lockReason: "پس از جلسه اول مشاوره فعال می‌شود",
    continueLabel: "ثبت نتایج سنجش",
    actions: [
      { id: "ranks", label: "ثبت رتبه و تراز سنجش" },
      { id: "examDoc", label: "بارگذاری کارنامه رسمی سنجش" },
    ],
  },
  {
    id: 6,
    chapter: "انتخاب اولویت‌ها و جلسه اول",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از ثبت نتایج آزمون سنجش فعال می‌شود",
    continueLabel: "تعیین نوع آموزش",
    actions: [{ id: "edu", label: "مرتب‌سازی نوع دوره (روزانه، شبانه و …)" }],
  },
  {
    id: 7,
    chapter: "انتخاب اولویت‌ها و جلسه اول",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از تعیین نوع آموزش فعال می‌شود",
    continueLabel: "انتخاب شهرها",
    actions: [{ id: "city", label: "انتخاب استان و شهرهای مورد قبول" }],
  },
  {
    id: 8,
    chapter: "انتخاب اولویت‌ها و جلسه اول",
    estimatedDuration: "حدود ۱۵ دقیقه",
    lockReason: "پس از تعیین شهرهای مورد قبول فعال می‌شود",
    continueLabel: "انتخاب رشته‌ها",
    actions: [{ id: "majors", label: "انتخاب رشته‌های متناسب با گروه آزمایشی" }],
  },
  {
    id: 9,
    chapter: "انتخاب اولویت‌ها و جلسه اول",
    estimatedDuration: "حدود ۱۰ دقیقه",
    lockReason: "پس از انتخاب رشته‌ها فعال می‌شود",
    continueLabel: "وزن‌دهی اولویت‌ها",
    actions: [{ id: "weights", label: "وزن‌دهی رشته، دانشگاه، شهر و سایر عوامل" }],
  },
  {
    id: 10,
    chapter: "پیش‌نویس فهرست و بازبینی مهندس",
    estimatedDuration: "کار شما حدود ۱۵ دقیقه؛ بازبینی مهندس معمولاً یک تا دو روز کاری",
    lockReason: "پس از وزن‌دهی اولویت‌ها فعال می‌شود",
    continueLabel: "ادامه چیدمان هوشمند",
    actions: [
      { id: "export", label: "صدور و ورود پیش‌نویس فهرست ۱۵۰" },
      { id: "review10", label: "بازبینی مهندس رضا ابراهیمی" },
    ],
  },
  {
    id: 11,
    chapter: "بازبینی دانش‌آموز و جلسه والدین",
    estimatedDuration: "یک جلسه با مشاور و خانواده",
    lockReason: "پس از بازبینی مهندس روی چیدمان فعال می‌شود",
    continueLabel: "رزرو جلسه دوم",
    actions: [{ id: "book2", label: "رزرو جلسه دوم و حضور خانواده" }],
  },
  {
    id: 12,
    chapter: "تأیید نهایی و ارسال به سنجش",
    estimatedDuration: "حدود ۵ دقیقه",
    lockReason: "پس از جلسه دوم مشاوره فعال می‌شود",
    continueLabel: "تأیید نهایی فهرست",
    actions: [{ id: "final", label: "تأیید دیجیتال فهرست نهایی" }],
  },
];

const STATUS_LABELS: Record<GuidanceJourneyStepStatus, string> = {
  locked: "هنوز نرسیده‌اید",
  active: "مرحله جاری",
  completed: "انجام شد",
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
      return input.personalInfoConfirmed || completed;
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

    return {
      id: catalog.id,
      title: def.title,
      shortTitle: def.shortTitle,
      chapter: catalog.chapter,
      chapterStart,
      description: def.description,
      estimatedDuration: catalog.estimatedDuration,
      requiredActions,
      status,
      statusLabel: STATUS_LABELS[status],
      counselorKind: counselor.kind,
      counselorLabel: COUNSELOR_LABELS[counselor.kind],
      counselorMessage: counselor.message,
      lockReason: status === "locked" ? catalog.lockReason : null,
      reviewable: status === "completed",
      href: status === "active" ? guidanceJourneyStepPath(catalog.id) : null,
      hrefLabel: status === "active" ? catalog.continueLabel : null,
      knowledgeNote,
    };
  });

  const current =
    phases.find((phase) => phase.status === "active") ??
    phases[phases.length - 1];

  return {
    completionPercentage: input.finalApproved ? 100 : input.completionPercentage,
    currentStep: current?.id ?? input.currentStep,
    currentTitle: current?.title ?? "",
    phases,
  };
}
