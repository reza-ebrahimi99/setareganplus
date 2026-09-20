"use client";

import Link from "next/link";
import {
  REVIEW_BUCKET_LABELS,
  type ReviewWorkBucketId,
  type ReviewWorkQueueModel,
} from "@/lib/counselor-os/review-work-queue-types";
import { toPersianDigits } from "@/lib/persian";

const BUCKET_ORDER: ReviewWorkBucketId[] = [
  "resubmitted",
  "revision_pending",
  "unreviewed",
  "holland_retake",
  "downstream_needs_review",
];

export function CounselorReviewWorkQueuePanel({
  model,
  activeBucket,
}: {
  model: ReviewWorkQueueModel;
  activeBucket?: ReviewWorkBucketId | "all";
}) {
  const bucket = activeBucket && activeBucket !== "all" ? activeBucket : null;

  return (
    <section className="cos-panel cos-review-work-queue" dir="rtl" aria-label="صف بررسی V2">
      <header className="cos-review-work-queue__head">
        <h2>صف کار بررسی (مسیر ۱۸ مرحله‌ای)</h2>
        <p className="cos-muted">تغذیه از GuidanceStepReview و پرچم‌های plan — نه صف legacy.</p>
      </header>
      <div className="cos-review-buckets">
        {BUCKET_ORDER.map((id) => (
          <Link
            key={id}
            href={`/admin/counselor?reviewBucket=${id}`}
            className={`cos-review-bucket${bucket === id ? " is-active" : ""}`}
          >
            <span>{REVIEW_BUCKET_LABELS[id]}</span>
            <strong>{toPersianDigits(model.counts[id])}</strong>
          </Link>
        ))}
      </div>
      {BUCKET_ORDER.map((id) => {
        const items = bucket ? (bucket === id ? model.buckets[id] : []) : model.buckets[id];
        if (items.length === 0 && bucket && bucket !== id) return null;
        return (
          <div key={id} className="cos-review-bucket-section">
            <h3>
              {REVIEW_BUCKET_LABELS[id]} ({toPersianDigits(model.counts[id])})
            </h3>
            {items.length === 0 ? (
              <p className="cos-empty">موردی در این سطل نیست.</p>
            ) : (
              <ul className="cos-work-queue">
                {items.map((item, i) => (
                  <li key={`${item.studentId}-${item.stepNumber}-${i}`}>
                    <Link href={item.href}>
                      <strong>{item.studentName}</strong>
                      <span>
                        مرحله {toPersianDigits(item.stepNumber)} — {item.stepTitle}
                      </span>
                      <em>{item.waitingSinceLabel}</em>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
