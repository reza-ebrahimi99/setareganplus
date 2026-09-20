"use client";

import { useActionState } from "react";
import {
  counselorHollandBasisAction,
  type StepReviewActionState,
} from "@/app/admin/counselor/step-review-actions";
import type { HollandAttemptView } from "@/lib/guidance/journey-v2/holland-attempts";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

const initial: StepReviewActionState = {};

export function CounselorHollandAttemptsPanel(props: {
  studentId: string;
  planId: string;
  attempts: HollandAttemptView[];
}) {
  const [state, action, pending] = useActionState(counselorHollandBasisAction, initial);

  if (props.attempts.length === 0) {
    return <p className="cos-muted">هنوز تلاش ثبت‌شده‌ای برای رغبت‌سنجی نیست.</p>;
  }

  const basis = props.attempts.find((a) => a.isActiveBasis);
  const completed = props.attempts.filter((a) => a.completedAtIso);

  return (
    <section className="cos-panel cos-holland-attempts" dir="rtl">
      <h3>تلاش‌های رغبت‌سنجی</h3>
      {state.error ? <p className="cos-alert cos-alert--error">{state.error}</p> : null}
      {state.ok ? <p className="cos-alert cos-alert--success">نتیجه مبنا به‌روز شد.</p> : null}
      <table className="cos-table cos-table--wide">
        <thead>
          <tr>
            <th>شماره</th>
            <th>تاریخ</th>
            <th>کد غالب</th>
            <th>وضعیت</th>
            <th>مبنا</th>
          </tr>
        </thead>
        <tbody>
          {props.attempts.map((a) => (
            <tr key={a.id} data-pending={a.isPending ? "1" : "0"}>
              <td>{toPersianDigits(a.attemptNumber)}</td>
              <td>
                {a.completedAtIso
                  ? formatJalaliDateTimeShort(new Date(a.completedAtIso))
                  : "در انتظار تکمیل"}
              </td>
              <td>{a.code ?? "—"}</td>
              <td>{a.isPending ? "باز" : "COMPLETED"}</td>
              <td>
                {a.isActiveBasis ? (
                  "فعال"
                ) : a.completedAtIso ? (
                  <form action={action} className="cos-form-inline">
                    <input type="hidden" name="studentId" value={props.studentId} />
                    <input type="hidden" name="planId" value={props.planId} />
                    <input type="hidden" name="attemptId" value={a.id} />
                    <button type="submit" className="cos-btn cos-btn--sm" disabled={pending}>
                      انتخاب به‌عنوان مبنا
                    </button>
                  </form>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {completed.length >= 2 && basis ? (
        <div className="cos-holland-compare">
          <h4>مقایسه مبنا با آخرین تلاش</h4>
          <p className="cos-muted">
            مبنا: {basis.code ?? "—"} · آخرین: {completed[completed.length - 1]?.code ?? "—"}
          </p>
        </div>
      ) : null}
    </section>
  );
}
