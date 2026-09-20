"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  counselorHollandRetakeAction,
  type StepReviewActionState,
} from "@/app/admin/counselor/step-review-actions";
import { AssessmentResultV2Step } from "@/components/guidance/journey-v2/AssessmentResultV2Step";
import type { AssessmentResult } from "@/lib/guidance/journey/assessment/scoring";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";

const EMPTY_SIDEBAR = [] as readonly GuidanceJourneySidebarStep[];

const initial: StepReviewActionState = {};

export function CounselorJourneyStep5ResultPanel(props: {
  studentId: string;
  result: AssessmentResult;
}) {
  const [hollandState, hollandAction, hollandPending] = useActionState(
    counselorHollandRetakeAction,
    initial,
  );

  return (
    <div className="cos-journey-step5" dir="rtl">
      <section className="cos-panel cos-panel--info">
        <h2>نتیجه رغبت‌سنجی (فقط مشاهده)</h2>
        <p>
          این نتیجه از پاسخ‌های ثبت‌شده در مرحله رغبت‌سنجی (Holland) محاسبه شده است و
          در این صفحه به‌صورت مستقیم قابل ویرایش نیست.
        </p>
        <div className="cos-inline-actions">
          <Link
            href={`/admin/counselor/students/${props.studentId}/journey/4`}
            className="cos-btn cos-btn--primary"
          >
            اصلاح از مرحله رغبت‌سنجی
          </Link>
        </div>
      </section>

      <AssessmentResultV2Step
        sidebarSteps={EMPTY_SIDEBAR}
        completionPercentage={0}
        result={props.result}
        answers={{}}
      />

      <section className="cos-panel">
        <h3>درخواست انجام مجدد آزمون</h3>
        <p className="cos-muted">
          یک attempt جدید برای دانش‌آموز ایجاد می‌شود؛ نتایج قبلی حفظ می‌شوند.
        </p>
        {hollandState.error ? (
          <p className="cos-alert cos-alert--error">{hollandState.error}</p>
        ) : null}
        {hollandState.ok ? (
          <p className="cos-alert cos-alert--success">درخواست تکرار ثبت شد.</p>
        ) : null}
        <form action={hollandAction} className="cos-form-stack">
          <input type="hidden" name="studentId" value={props.studentId} />
          <label>
            علت (الزامی)
            <textarea name="reason" rows={2} required minLength={3} />
          </label>
          <button type="submit" className="cos-btn cos-btn--warn" disabled={hollandPending}>
            {hollandPending ? "در حال ثبت…" : "درخواست انجام مجدد آزمون"}
          </button>
        </form>
      </section>
    </div>
  );
}
