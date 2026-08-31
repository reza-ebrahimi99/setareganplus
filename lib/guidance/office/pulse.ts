/**
 * Student office dashboard — pure case pulse (no I/O).
 * Journey numbers stay in the engine; this only labels waiting + chapter.
 */

import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import { GUIDANCE_JOURNEY_STEPS } from "@/lib/guidance/journey/steps";

export const OFFICE_CHAPTERS = [
  "آمادگی برای مشاوره",
  "ساخت شناسنامه دانش‌آموز",
  "شناخت خود",
  "آشنایی با دانشگاه‌ها، رشته‌ها و نظام آموزشی",
  "انتخاب اولویت‌ها و جلسه اول",
  "کارنامه و نتایج کنکور",
  "پیش‌نویس فهرست و بازبینی مهندس",
  "بازبینی دانش‌آموز و جلسه والدین",
  "تأیید نهایی و ارسال به سنجش",
] as const;

export type OfficeWaitingKind = "none" | "student" | "counselor";

export type OfficeCaseStatus =
  | "waiting_on_student"
  | "waiting_on_counselor"
  | "in_progress"
  | "approved";

export type OfficeCasePulse = {
  status: OfficeCaseStatus;
  statusLabel: string;
  waitingKind: OfficeWaitingKind;
  waitingTitle: string;
  waitingBody: string;
  completionPercentage: number;
  currentChapter: string;
  currentStepTitle: string;
};

const STATUS_LABELS: Record<OfficeCaseStatus, string> = {
  waiting_on_student: "کار شما",
  waiting_on_counselor: "روی میز مهندس",
  in_progress: "در حال همراهی",
  approved: "تأیید نهایی",
};

export function chapterForEngineStep(step: GuidanceJourneyStepId): string {
  if (step <= 1) return OFFICE_CHAPTERS[1];
  if (step === 2) return OFFICE_CHAPTERS[2];
  if (step === 3) return OFFICE_CHAPTERS[0];
  if (step === 4) return OFFICE_CHAPTERS[4];
  if (step === 5) return OFFICE_CHAPTERS[5];
  if (step <= 9) return OFFICE_CHAPTERS[4];
  if (step === 10) return OFFICE_CHAPTERS[6];
  if (step === 11) return OFFICE_CHAPTERS[7];
  return OFFICE_CHAPTERS[8];
}

export function deriveOfficeCasePulse(input: {
  currentStep: GuidanceJourneyStepId;
  completionPercentage: number;
  finalApproved: boolean;
  hasCounselorRevision: boolean;
  hasPendingDocument: boolean;
  unpaid: boolean;
  firstSessionUpcoming?: boolean;
  firstSessionCountdown?: string | null;
}): OfficeCasePulse {
  const currentStepTitle =
    GUIDANCE_JOURNEY_STEPS.find((step) => step.id === input.currentStep)?.title ??
    "پرونده";
  const currentChapter = chapterForEngineStep(input.currentStep);

  if (input.finalApproved) {
    return {
      status: "approved",
      statusLabel: STATUS_LABELS.approved,
      waitingKind: "none",
      waitingTitle: "پرونده به تأیید نهایی رسید",
      waitingBody:
        "فهرست شما با نظارت مهندس رضا ابراهیمی بسته شده است. گزارش‌ها و بایگانی در مراحل بعد در همین دفتر باز می‌شوند.",
      completionPercentage: 100,
      currentChapter,
      currentStepTitle,
    };
  }

  if (input.hasCounselorRevision) {
    return {
      status: "waiting_on_student",
      statusLabel: STATUS_LABELS.waiting_on_student,
      waitingKind: "student",
      waitingTitle: "مشاور بخشی از پرونده را برای اصلاح برگرداند",
      waitingBody:
        "لطفاً پیام دفتر را بخوانید و همان بخش را کامل کنید. دانشنامه و سایر اتاق‌ها همچنان باز هستند.",
      completionPercentage: input.completionPercentage,
      currentChapter,
      currentStepTitle,
    };
  }

  if (input.hasPendingDocument) {
    return {
      status: "waiting_on_counselor",
      statusLabel: STATUS_LABELS.waiting_on_counselor,
      waitingKind: "counselor",
      waitingTitle: "پرونده شما روی میز مهندس ابراهیمی است",
      waitingBody:
        "مدرک دریافت شد. بازبینی کارنامه معمولاً یک تا دو روز کاری زمان می‌برد. لازم نیست همین حالا فرم دیگری پر کنید.",
      completionPercentage: input.completionPercentage,
      currentChapter,
      currentStepTitle,
    };
  }

  if (input.firstSessionUpcoming) {
    return {
      status: "in_progress",
      statusLabel: "جلسه اول رزرو شد",
      waitingKind: "none",
      waitingTitle: "جلسه اول رزرو شد",
      waitingBody:
        input.firstSessionCountdown ??
        "نوبت شما ثبت شده است. مدارک را طبق چک‌لیست آماده کنید.",
      completionPercentage: input.completionPercentage,
      currentChapter,
      currentStepTitle,
    };
  }

  if (input.unpaid && input.currentStep === 3) {
    return {
      status: "waiting_on_student",
      statusLabel: STATUS_LABELS.waiting_on_student,
      waitingKind: "student",
      waitingTitle: "فعال‌سازی بسته مشاوره",
      waitingBody:
        "برای جلسه اختصاصی و فهرست نهایی، بسته باید فعال باشد. می‌توانید فعلاً آزمون رغبت و دانشنامه را ادامه دهید.",
      completionPercentage: input.completionPercentage,
      currentChapter,
      currentStepTitle,
    };
  }

  return {
    status: "in_progress",
    statusLabel: STATUS_LABELS.in_progress,
    waitingKind: "student",
    waitingTitle: currentChapter,
    waitingBody: `اکنون روی «${currentStepTitle}» کار می‌کنیم. هر زمان خواستید می‌توانید دفتر را ترک کنید و برگردید.`,
    completionPercentage: input.completionPercentage,
    currentChapter,
    currentStepTitle,
  };
}
