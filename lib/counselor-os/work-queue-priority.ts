/**
 * Pure priority scoring for counselor work queue (steps 11–18 aware).
 */

export type WorkQueueBucketId =
  | "urgent"
  | "today"
  | "overdue"
  | "waiting_me"
  | "waiting_student"
  | "sessions_today"
  | "incomplete_arrangement"
  | "returned_reviews"
  | "ready_finalize"
  | "ready_sanjesh"
  | "recently_done";

export type WorkQueuePriorityInput = {
  currentStep: number;
  completionPercentage: number;
  packagePaid: boolean;
  v2SanjeshStatus: string | null;
  needsReview: boolean;
  staleDays: number;
  sessionToday: boolean;
  sessionOverdue: boolean;
  waitingCounselorStep: boolean;
};

/** Lower score = higher priority (sort ascending). */
export function scoreWorkQueuePriority(input: WorkQueuePriorityInput): number {
  let score = 500;
  if (input.sessionOverdue) score -= 200;
  if (input.sessionToday) score -= 150;
  if (input.staleDays >= 14) score -= 120;
  if (input.needsReview) score -= 100;
  if (input.waitingCounselorStep) score -= 80;
  if (input.currentStep === 18) {
    const s = input.v2SanjeshStatus ?? "";
    if (s === "PENDING_REVIEW" || s === "DECLARED") score -= 90;
  }
  if (input.currentStep === 16) score -= 70;
  if (input.currentStep === 13) score -= 60;
  if (input.currentStep === 12) score -= 50;
  if (input.currentStep === 14) score -= 40;
  if (input.currentStep === 15) score -= 30;
  if (input.currentStep === 17) score -= 20;
  if (!input.packagePaid && input.currentStep <= 10) score += 100;
  if (input.completionPercentage >= 100) score += 300;
  score += Math.min(input.staleDays, 30);
  return score;
}

export function bucketForWorkItem(input: WorkQueuePriorityInput): WorkQueueBucketId {
  if (input.completionPercentage >= 100 && input.currentStep >= 18) {
    return "recently_done";
  }
  if (input.sessionOverdue || (input.needsReview && input.waitingCounselorStep)) {
    return "urgent";
  }
  if (input.sessionToday) return "sessions_today";
  if (
    input.currentStep === 18 &&
    (input.v2SanjeshStatus === "PENDING_REVIEW" ||
      input.v2SanjeshStatus === "DECLARED")
  ) {
    return "ready_sanjesh";
  }
  if (input.staleDays >= 7 && input.currentStep >= 11) return "overdue";
  if (input.waitingCounselorStep) return "waiting_me";
  if (input.currentStep === 14 || input.currentStep === 17) return "waiting_student";
  if (input.currentStep === 13 && input.waitingCounselorStep) {
    return "incomplete_arrangement";
  }
  if (input.needsReview) return "returned_reviews";
  if (input.currentStep === 16) return "ready_finalize";
  if (input.sessionToday) return "today";
  return "waiting_me";
}

export const WORK_QUEUE_BUCKET_LABELS: Record<WorkQueueBucketId, string> = {
  urgent: "فوری",
  today: "امروز",
  overdue: "عقب‌افتاده",
  waiting_me: "منتظر اقدام من",
  waiting_student: "منتظر دانش‌آموز",
  sessions_today: "جلسه‌های امروز",
  incomplete_arrangement: "چیدمان‌های ناقص",
  returned_reviews: "بازبینی‌های برگشتی",
  ready_finalize: "آماده نهایی‌سازی",
  ready_sanjesh: "آماده ثبت سنجش",
  recently_done: "تکمیل‌شده‌های اخیر",
};
