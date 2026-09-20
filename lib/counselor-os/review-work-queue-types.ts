/** Client-safe types for review work queue UI (no server/auth imports). */

export type ReviewWorkBucketId =
  | "resubmitted"
  | "revision_pending"
  | "unreviewed"
  | "holland_retake"
  | "downstream_needs_review";

export const REVIEW_BUCKET_LABELS: Record<ReviewWorkBucketId, string> = {
  resubmitted: "اصلاحات ارسال‌شده",
  revision_pending: "درخواست اصلاح بدون پاسخ",
  unreviewed: "مراحل بررسی‌نشده",
  holland_retake: "رغبت‌سنجی تکرارشده",
  downstream_needs_review: "مراحل وابسته نیازمند بازبینی",
};

export type ReviewWorkQueueItem = {
  bucket: ReviewWorkBucketId;
  studentId: string;
  studentName: string;
  stepNumber: number;
  stepTitle: string;
  statusLabel: string;
  lastActionLabel: string;
  waitingSinceLabel: string;
  href: string;
};

export type ReviewWorkQueueModel = {
  buckets: Record<ReviewWorkBucketId, ReviewWorkQueueItem[]>;
  counts: Record<ReviewWorkBucketId, number>;
  labels: typeof REVIEW_BUCKET_LABELS;
};
