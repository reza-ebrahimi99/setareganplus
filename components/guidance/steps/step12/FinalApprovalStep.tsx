"use client";

/**
 * Guidance Journey Engine — Step 12: Final Approval.
 * Digital confirmation (typed signature) + printable consent + archive.
 */

import { useActionState, useState, type FormEvent } from "react";
import { submitGuidanceStep12Action } from "@/app/portal/student/services/guidance/steps/actions/step12";
import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
import type { GuidanceStepFormState } from "@/lib/guidance/journey/types";

type FinalApprovalStepProps = {
  sidebarSteps: readonly GuidanceJourneySidebarStep[];
  completionPercentage: number;
  fullName: string;
  planPublicId: string;
  examGroupLabel: string;
  alreadyApproved: boolean;
  approvedAtIso: string | null;
};

const initial: GuidanceStepFormState = {};

export function FinalApprovalStep({
  sidebarSteps,
  completionPercentage,
  fullName,
  planPublicId,
  examGroupLabel,
  alreadyApproved,
  approvedAtIso,
}: FinalApprovalStepProps) {
  const [state, action] = useActionState(submitGuidanceStep12Action, initial);
  const [clientError, setClientError] = useState<string | null>(null);

  const isApproved = alreadyApproved || state.ok === true;
  const celebrating = Boolean(state.ok);

  const fieldErrors = state.fieldErrors ?? {};

  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const signature = form.elements.namedItem("typedSignature");
    const value = signature && "value" in signature ? String(signature.value).trim() : "";
    if (!value) {
      event.preventDefault();
      setClientError("نام کامل خودت را برای تأیید دیجیتال تایپ کن.");
      return;
    }
    const confirmed = form.elements.namedItem("confirmed");
    if (confirmed instanceof HTMLInputElement && !confirmed.checked) {
      event.preventDefault();
      setClientError("لطفاً تأیید نهایی را بپذیر.");
      return;
    }
    setClientError(null);
  }

  return (
    <GuidanceStepShell
      stepId={12}
      stepCount={12}
      title="تأیید نهایی"
      description="آخرین گام: تأیید دیجیتال، دریافت رضایت‌نامه چاپی و آرشیو پرونده."
      sidebarSteps={sidebarSteps}
      completionPercentage={completionPercentage}
      celebrate={celebrating}
    >
      {isApproved ? (
        <div className="gpj-print-area">
          <div className="gpj-card" data-portal-accent="gold">
            <h2 className="gpj-card__title">پرونده انتخاب رشته تکمیل شد</h2>
            <p className="gpj-card__desc">
              تأیید نهایی ثبت شد. پرونده شما آماده ارسال نهایی به سازمان سنجش
              است.
            </p>
            <dl style={{ display: "grid", gap: "0.5rem", fontSize: "0.8437rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>نام و نام خانوادگی</dt>
                <dd style={{ fontWeight: 700 }}>{fullName}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>شناسه پرونده</dt>
                <dd dir="ltr" style={{ fontWeight: 700 }}>
                  {planPublicId.slice(0, 10)}
                </dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>گروه آزمایشی</dt>
                <dd style={{ fontWeight: 700 }}>{examGroupLabel}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>تاریخ تأیید</dt>
                <dd style={{ fontWeight: 700 }}>
                  {approvedAtIso ? formatJalaliDateTimeShort(new Date(approvedAtIso)) : "—"}
                </dd>
              </div>
            </dl>
            <p style={{ marginTop: "1.25rem", fontSize: "0.8125rem", lineHeight: 1.8 }}>
              اینجانب «{fullName}» چیدمان و اطلاعات ثبت‌شده در سامانه انتخاب رشته
              را بررسی کرده و نهایی می‌کنم.
            </p>
          </div>
          <div className="gpj-actions gpj-print-hide" style={{ position: "static" }}>
            <span />
            <button type="button" className="gpj-actions__continue" onClick={() => window.print()}>
              چاپ رضایت‌نامه
            </button>
          </div>
        </div>
      ) : (
        <form action={action} onSubmit={validate} className="gpj-card">
          <h2 className="gpj-card__title">تأیید دیجیتال</h2>
          <p className="gpj-banner gpj-banner--warning" style={{ marginBottom: "1rem" }}>
            با تأیید این مرحله، چیدمان نهایی انتخاب رشته‌ات قطعی می‌شود.
          </p>

          {(clientError || state.error) && (
            <p className="gpj-banner gpj-banner--error" role="alert" style={{ marginBottom: "1rem" }}>
              {clientError ?? state.error}
            </p>
          )}

          <div className="gpj-field">
            <label className="gpj-field__label" htmlFor="typedSignature">
              نام و نام خانوادگی خودت را دقیقاً تایپ کن ({fullName})
            </label>
            <input
              id="typedSignature"
              name="typedSignature"
              type="text"
              className="gpj-input"
              aria-invalid={Boolean(fieldErrors.typedSignature)}
            />
            {fieldErrors.typedSignature && <p className="gpj-field__error">{fieldErrors.typedSignature}</p>}
          </div>

          <label className="gpj-checkbox-row" style={{ marginTop: "1.25rem" }}>
            <input type="checkbox" name="confirmed" />
            <span className="gpj-checkbox-row__label">
              چیدمان نهایی، مدارک و اطلاعات ثبت‌شده در این پرونده را تأیید می‌کنم و
              مسئولیت آن را می‌پذیرم.
            </span>
          </label>
          {fieldErrors.confirmed && <p className="gpj-field__error">{fieldErrors.confirmed}</p>}

          <div className="gpj-actions" style={{ position: "static", marginTop: "1.5rem" }}>
            <span />
            <button type="submit" className="gpj-actions__continue">
              تأیید نهایی
            </button>
          </div>
        </form>
      )}
    </GuidanceStepShell>
  );
}
