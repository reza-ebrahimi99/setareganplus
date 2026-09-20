"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  counselorCancelStepRevisionAction,
  counselorHollandRetakeAction,
  counselorMarkStepReviewedAction,
  counselorRequestStepRevisionAction,
  counselorStepReviewNotesAction,
  type StepReviewActionState,
} from "@/app/admin/counselor/step-review-actions";
import { counselorV2StepTitle } from "@/lib/counselor-os/v2-catalog";
import { guidanceJourneyV2StepPath } from "@/lib/guidance/journey-v2/catalog";
import type { StepReviewRowView } from "@/lib/guidance/journey-v2/step-review/service";
import { previewStepChangeImpact } from "@/lib/guidance/journey-v2/step-review/dependencies";
import { isGuidanceV2StepId, type GuidanceV2StepId } from "@/lib/guidance/journey-v2/catalog";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export type Journey18ControlModel = {
  studentId: string;
  publicId: string;
  planId: string;
  currentStep: number;
  steps: StepReviewRowView[];
  hollandRetakePending: boolean;
};

const initial: StepReviewActionState = {};

function journeyStatusLabel(step: StepReviewRowView, currentStep: number): string {
  if (step.revisionOpen) return "باز برای اصلاح";
  if (step.stepNumber === currentStep) return "مرحله فعلی";
  if (step.stepNumber < currentStep) return "تکمیل‌شده";
  return "آینده";
}

export function CounselorJourney18Control({ model }: { model: Journey18ControlModel }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [revState, revAction, revPending] = useActionState(
    counselorRequestStepRevisionAction,
    initial,
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    counselorMarkStepReviewedAction,
    initial,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    counselorCancelStepRevisionAction,
    initial,
  );
  const [noteState, noteAction, notePending] = useActionState(
    counselorStepReviewNotesAction,
    initial,
  );
  const [hollandState, hollandAction, hollandPending] = useActionState(
    counselorHollandRetakeAction,
    initial,
  );

  const active = model.steps.find((s) => s.stepNumber === activeStep) ?? null;
  const impact =
    activeStep != null && isGuidanceV2StepId(activeStep)
      ? previewStepChangeImpact(activeStep as GuidanceV2StepId)
      : null;

  return (
    <section className="cos-panel cos-journey18-control" dir="rtl">
      <header className="cos-journey18-control__head">
        <div>
          <p className="cos-page__eyebrow">کنترل مسیر ۱۸ مرحله‌ای</p>
          <h2>بررسی مستقل — بدون قفل پیشرفت دانش‌آموز</h2>
          <p className="cos-muted">
            وضعیت بررسی جدا از پیشرفت journey است. «بررسی‌نشده» مانع ادامه مسیر نیست.
          </p>
        </div>
        {model.hollandRetakePending ? (
          <span className="cos-badge cos-badge--warn">درخواست تکرار رغبت‌سنجی فعال</span>
        ) : null}
      </header>

      {(revState.error || reviewState.error || cancelState.error || noteState.error || hollandState.error) && (
        <p className="cos-alert cos-alert--error" role="alert">
          {revState.error || reviewState.error || cancelState.error || noteState.error || hollandState.error}
        </p>
      )}
      {(revState.ok || reviewState.ok || cancelState.ok || noteState.ok || hollandState.ok) && (
        <p className="cos-alert cos-alert--success">ذخیره شد.</p>
      )}

      <div className="cos-table-wrap">
        <table className="cos-table cos-table--wide">
          <thead>
            <tr>
              <th>مرحله</th>
              <th>وضعیت journey</th>
              <th>بررسی مشاور</th>
              <th>اصلاح باز</th>
              <th>نیاز بازبینی downstream</th>
              <th>نسخه‌ها</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {model.steps.map((step) => (
              <tr key={step.stepNumber} data-review={step.status}>
                <td>
                  <strong>{toPersianDigits(step.stepNumber)}</strong> — {counselorV2StepTitle(step.stepNumber)}
                </td>
                <td>{journeyStatusLabel(step, model.currentStep)}</td>
                <td>
                  <span className={`cos-review-pill cos-review-pill--${step.status.toLowerCase()}`}>
                    {step.statusLabel}
                  </span>
                </td>
                <td>{step.revisionOpen ? "بله" : "—"}</td>
                <td>{step.needsReviewFlag ? "بله" : "—"}</td>
                <td>{toPersianDigits(step.revisionCount)}</td>
                <td>
                  <button
                    type="button"
                    className="cos-btn cos-btn--sm"
                    onClick={() => setActiveStep(step.stepNumber)}
                  >
                    جزئیات
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active ? (
        <div className="cos-journey18-drawer">
          <h3>
            مرحله {toPersianDigits(active.stepNumber)} — {counselorV2StepTitle(active.stepNumber)}
          </h3>
          {active.updatedAtIso ? (
            <p className="cos-muted">
              آخرین به‌روزرسانی: {formatJalaliDateTimeShort(new Date(active.updatedAtIso))}
            </p>
          ) : null}
          {active.studentMessage ? (
            <blockquote className="cos-quote">{active.studentMessage}</blockquote>
          ) : null}
          {active.impactSummary ? <p className="cos-muted">{active.impactSummary}</p> : null}

          <div className="cos-inline-actions">
            <Link
              href={`/admin/guidance/${model.publicId}/steps/${active.stepNumber}`}
              className="cos-btn"
            >
              مشاهده / ویرایش (workspace)
            </Link>
            <Link
              href={guidanceJourneyV2StepPath(active.stepNumber as 1)}
              className="cos-btn"
              target="_blank"
              rel="noreferrer"
            >
              فرم دانش‌آموز
            </Link>
          </div>

          <details className="cos-details">
            <summary>بررسی شد</summary>
            <form action={reviewAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={model.studentId} />
              <input type="hidden" name="stepNumber" value={active.stepNumber} />
              <label>
                یادداشت داخلی (اختیاری)
                <textarea name="privateNote" rows={2} />
              </label>
              <button type="submit" className="cos-btn cos-btn--primary" disabled={reviewPending}>
                ثبت «بررسی شد»
              </button>
            </form>
          </details>

          <details className="cos-details">
            <summary>بازگرداندن برای اصلاح</summary>
            {impact ? <p className="cos-muted">{impact.summaryFa}</p> : null}
            <form action={revAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={model.studentId} />
              <input type="hidden" name="stepNumber" value={active.stepNumber} />
              <label>
                علت (الزامی)
                <textarea name="reason" rows={2} required />
              </label>
              <label>
                پیام برای دانش‌آموز (الزامی)
                <textarea name="studentMessage" rows={3} required />
              </label>
              <label>
                بخش‌ها (با ویرگول)
                <input name="sections" placeholder="مثلاً: identity,grades" />
              </label>
              <label className="cos-check">
                <input type="checkbox" name="retakeFromBeginning" /> انجام مجدد از ابتدای فرم/آزمون
              </label>
              <button type="submit" className="cos-btn cos-btn--warn" disabled={revPending}>
                ثبت درخواست اصلاح
              </button>
            </form>
          </details>

          {active.revisionOpen ? (
            <form action={cancelAction} className="cos-form-inline">
              <input type="hidden" name="studentId" value={model.studentId} />
              <input type="hidden" name="stepNumber" value={active.stepNumber} />
              <button type="submit" className="cos-btn" disabled={cancelPending}>
                لغو درخواست اصلاح
              </button>
            </form>
          ) : null}

          <details className="cos-details">
            <summary>یادداشت / پیام</summary>
            <form action={noteAction} className="cos-form-stack">
              <input type="hidden" name="studentId" value={model.studentId} />
              <input type="hidden" name="publicId" value={model.publicId} />
              <input type="hidden" name="stepNumber" value={active.stepNumber} />
              <label>
                یادداشت داخلی
                <textarea name="privateNote" rows={2} defaultValue={active.privateNote ?? ""} />
              </label>
              <label>
                پیام دانش‌آموز
                <textarea name="studentMessage" rows={2} />
              </label>
              <button type="submit" className="cos-btn" disabled={notePending}>
                ذخیره یادداشت
              </button>
            </form>
          </details>

          {active.stepNumber === 4 ? (
            <details className="cos-details">
              <summary>درخواست تکرار رغبت‌سنجی</summary>
              <form action={hollandAction} className="cos-form-stack">
                <input type="hidden" name="studentId" value={model.studentId} />
                <label>
                  علت
                  <textarea name="reason" rows={2} required />
                </label>
                <button type="submit" className="cos-btn cos-btn--warn" disabled={hollandPending}>
                  درخواست انجام مجدد آزمون
                </button>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
