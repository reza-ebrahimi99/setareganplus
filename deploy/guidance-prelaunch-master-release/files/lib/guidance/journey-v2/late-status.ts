/**
 * Late-journey (steps 11–18) status language and timeline mapping.
 * Pure — no I/O. UI and sidebar must reuse this.
 */

import type { GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";

export const LATE_JOURNEY_TIMELINE = [
  { step: 11, label: "جلسه اول" },
  { step: 12, label: "نتایج کنکور" },
  { step: 13, label: "چیدمان مشاور" },
  { step: 14, label: "بررسی شما" },
  { step: 15, label: "جلسه دوم" },
  { step: 16, label: "اصلاح نهایی" },
  { step: 17, label: "تأیید" },
  { step: 18, label: "ثبت سنجش" },
] as const;

export type LateOwner = "دانش‌آموز" | "مشاور" | "سامانه";

export type LateStatusTone =
  | "action"
  | "waiting"
  | "ready"
  | "done"
  | "revision"
  | "session"
  | "confirm";

export type LateStepStatusView = {
  step: GuidanceV2StepId;
  label: string;
  status: string;
  tone: LateStatusTone;
  owner: LateOwner;
  nextAction: string;
  afterCompletion: string;
  current: boolean;
};

export type LateJourneySignals = {
  currentStep: number;
  packagePaid: boolean;
  hasArrangementEntitlement: boolean;
  firstSessionBooked: boolean;
  secondSessionBooked: boolean;
  konkurSubmitted: boolean;
  initialReady: boolean;
  reviewComplete: boolean;
  finalReady: boolean;
  informedConfirmed: boolean;
  sanjeshDeclared: boolean;
  sanjeshVerified: boolean;
  needsCounselorReview: boolean;
};

function timelineStatus(params: {
  step: number;
  currentStep: number;
  done: boolean;
  waiting: boolean;
  revision: boolean;
  action: boolean;
}): { status: string; tone: LateStatusTone } {
  if (params.revision) return { status: "نیازمند اصلاح", tone: "revision" };
  if (params.done && params.step < params.currentStep) {
    return { status: "تکمیل‌شده", tone: "done" };
  }
  if (params.step === params.currentStep) {
    if (params.waiting) return { status: "در انتظار مشاور", tone: "waiting" };
    if (params.action) return { status: "نیازمند اقدام شما", tone: "action" };
    return { status: "آماده بررسی", tone: "ready" };
  }
  if (params.step > params.currentStep) {
    return { status: "در انتظار", tone: "waiting" };
  }
  return { status: "تکمیل‌شده", tone: "done" };
}

export function buildLateJourneyTimeline(signals: LateJourneySignals): LateStepStatusView[] {
  return LATE_JOURNEY_TIMELINE.map((item) => {
    const step = item.step as GuidanceV2StepId;
    const current = step === signals.currentStep;
    const revision = signals.needsCounselorReview && (step === 12 || step === 14);

    if (!signals.packagePaid) {
      return {
        step,
        label: item.label,
        status: "در انتظار پرداخت",
        tone: "waiting",
        owner: "دانش‌آموز",
        nextAction: "پرداخت یا انتخاب پلن",
        afterCompletion: "مسیر جلسه و چیدمان باز می‌شود.",
        current: step === 10,
      };
    }

    if (!signals.hasArrangementEntitlement && step >= 13) {
      return {
        step,
        label: item.label,
        status: "نیازمند ارتقای پلن",
        tone: "waiting",
        owner: "دانش‌آموز",
        nextAction: "تهیه یکی از پلن‌های هوشمند، تخصصی یا ممتاز",
        afterCompletion: "چیدمان مشاور برای پرونده شما فعال می‌شود.",
        current: false,
      };
    }

    if (step === 11) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.firstSessionBooked,
        waiting: !signals.firstSessionBooked && current,
        revision: false,
        action: current && !signals.firstSessionBooked,
      });
      return {
        step,
        label: item.label,
        status: current && !signals.firstSessionBooked ? "در انتظار جلسه" : status,
        tone: current && !signals.firstSessionBooked ? "session" : tone,
        owner: "دانش‌آموز",
        nextAction: signals.firstSessionBooked
          ? "حضور در جلسه رزروشده"
          : "رزرو نوبت جلسه اول",
        afterCompletion: "پس از جلسه، نتایج کنکور را ثبت می‌کنید.",
        current,
      };
    }

    if (step === 12) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.konkurSubmitted,
        waiting: false,
        revision,
        action: current && !signals.konkurSubmitted,
      });
      return {
        step,
        label: item.label,
        status,
        tone,
        owner: "دانش‌آموز",
        nextAction: "ثبت رتبه و بارگذاری کارنامه",
        afterCompletion: "مشاور چیدمان اولیه را آغاز می‌کند.",
        current,
      };
    }

    if (step === 13) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.initialReady,
        waiting: current && !signals.initialReady,
        revision: false,
        action: false,
      });
      return {
        step,
        label: item.label,
        status,
        tone,
        owner: "مشاور",
        nextAction: "انتظار برای انتشار نسخه اولیه توسط مشاور",
        afterCompletion: "نسخه اولیه برای بررسی شما باز می‌شود.",
        current,
      };
    }

    if (step === 14) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.reviewComplete,
        waiting: current && !signals.initialReady,
        revision,
        action: current && signals.initialReady && !signals.reviewComplete,
      });
      return {
        step,
        label: item.label,
        status: current && signals.initialReady && !signals.reviewComplete
          ? "آماده بررسی"
          : status,
        tone,
        owner: "دانش‌آموز",
        nextAction: "ثبت نظر روی انتخاب‌های نسخه اولیه",
        afterCompletion: "جلسه دوم برای اصلاح نهایی رزرو می‌شود.",
        current,
      };
    }

    if (step === 15) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.secondSessionBooked,
        waiting: current && !signals.secondSessionBooked,
        revision: false,
        action: current && !signals.secondSessionBooked,
      });
      return {
        step,
        label: item.label,
        status: current && !signals.secondSessionBooked ? "در انتظار جلسه" : status,
        tone: current && !signals.secondSessionBooked ? "session" : tone,
        owner: "دانش‌آموز",
        nextAction: signals.secondSessionBooked
          ? "حضور در جلسه دوم"
          : "رزرو نوبت جلسه دوم",
        afterCompletion: "مشاور اصلاح نهایی فهرست را اعمال می‌کند.",
        current,
      };
    }

    if (step === 16) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.finalReady,
        waiting: current && !signals.finalReady,
        revision: false,
        action: false,
      });
      return {
        step,
        label: item.label,
        status,
        tone,
        owner: "مشاور",
        nextAction: "انتظار برای آماده شدن نسخه نهایی",
        afterCompletion: "تأیید آگاهانه برای شما باز می‌شود.",
        current,
      };
    }

    if (step === 17) {
      const { status, tone } = timelineStatus({
        step,
        currentStep: signals.currentStep,
        done: signals.informedConfirmed,
        waiting: current && !signals.finalReady,
        revision: false,
        action: current && signals.finalReady && !signals.informedConfirmed,
      });
      return {
        step,
        label: item.label,
        status: current && signals.finalReady && !signals.informedConfirmed
          ? "در انتظار تأیید"
          : status,
        tone: current && signals.finalReady && !signals.informedConfirmed
          ? "confirm"
          : tone,
        owner: "دانش‌آموز",
        nextAction: "تأیید آگاهانه نسخه نهایی",
        afterCompletion: "ثبت دستی در سامانه سنجش انجام می‌شود.",
        current,
      };
    }

    const { status, tone } = timelineStatus({
      step,
      currentStep: signals.currentStep,
      done: signals.sanjeshVerified,
      waiting: current && signals.sanjeshDeclared && !signals.sanjeshVerified,
      revision: false,
      action: current && !signals.sanjeshDeclared,
    });
    return {
      step,
      label: item.label,
      status: signals.sanjeshDeclared && !signals.sanjeshVerified && current
        ? "در انتظار تأیید"
        : status,
      tone,
      owner: signals.sanjeshDeclared && !signals.sanjeshVerified ? "مشاور" : "دانش‌آموز",
      nextAction: signals.sanjeshDeclared
        ? "انتظار تأیید رسید توسط مشاور"
        : "اعلام ثبت در سامانه سنجش و بارگذاری رسید",
      afterCompletion: "پرونده انتخاب رشته تکمیل می‌شود.",
      current,
    };
  });
}
